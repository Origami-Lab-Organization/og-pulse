import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DESCRIPTOR_LENGTH = 128;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Token inválido" }, 401);
    }

    let body: { descriptor?: number[]; consentimento_aceito?: boolean; consentimento_versao?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Corpo da requisição inválido" }, 400);
    }

    // Consentimento explícito é obrigatório para gravar dado biométrico (LGPD Art. 5º, II).
    if (body.consentimento_aceito !== true) {
      return jsonResponse({ error: "É necessário aceitar o consentimento para cadastrar o reconhecimento facial" }, 400);
    }
    if (!body.consentimento_versao) {
      return jsonResponse({ error: "Versão do consentimento não informada" }, 400);
    }
    if (
      !Array.isArray(body.descriptor) ||
      body.descriptor.length !== DESCRIPTOR_LENGTH ||
      !body.descriptor.every((n) => typeof n === "number" && Number.isFinite(n))
    ) {
      return jsonResponse({ error: "Descriptor facial inválido" }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: employee, error: employeeError } = await adminClient
      .from("employees")
      .select("id, tenant_id, status")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (employeeError || !employee) {
      return jsonResponse({ error: "Colaborador não encontrado" }, 404);
    }
    if (employee.status !== "ativo") {
      return jsonResponse({ error: "Colaborador inativo" }, 403);
    }

    const now = new Date().toISOString();
    const { error: upsertError } = await adminClient
      .from("time_punch_face_profiles")
      .upsert(
        {
          tenant_id: employee.tenant_id,
          employee_id: employee.id,
          descriptor: body.descriptor,
          consentimento_versao: body.consentimento_versao,
          consentimento_aceito_em: now,
        },
        { onConflict: "employee_id" },
      );

    if (upsertError) {
      console.error("Erro ao salvar perfil facial:", upsertError.message);
      return jsonResponse({ error: "Erro ao salvar o cadastro facial" }, 500);
    }

    await adminClient.from("time_tracking_audit_log").insert({
      tenant_id: employee.tenant_id,
      entity_type: "time_punch_face_profiles",
      entity_id: employee.id,
      action: "face_profile_enrolled",
      description: "Colaborador cadastrou/atualizou o reconhecimento facial",
      metadata: { consentimento_versao: body.consentimento_versao },
      created_by: employee.id,
    });

    return jsonResponse({ success: true, consentimento_aceito_em: now }, 200);
  } catch (error) {
    console.error("Erro inesperado em enroll-face-profile:", error instanceof Error ? error.message : error);
    return jsonResponse({ error: "Erro inesperado" }, 500);
  }
});
