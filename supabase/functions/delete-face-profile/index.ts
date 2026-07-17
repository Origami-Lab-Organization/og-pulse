import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Exclusão do perfil facial — direito de eliminação de dado biométrico (LGPD
// Art. 18). Sempre atendido a pedido do próprio titular, sem fricção.
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: employee, error: employeeError } = await adminClient
      .from("employees")
      .select("id, tenant_id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (employeeError || !employee) {
      return jsonResponse({ error: "Colaborador não encontrado" }, 404);
    }

    const { error: deleteError } = await adminClient
      .from("time_punch_face_profiles")
      .delete()
      .eq("employee_id", employee.id);

    if (deleteError) {
      console.error("Erro ao excluir perfil facial:", deleteError.message);
      return jsonResponse({ error: "Erro ao excluir o cadastro facial" }, 500);
    }

    await adminClient.from("time_tracking_audit_log").insert({
      tenant_id: employee.tenant_id,
      entity_type: "time_punch_face_profiles",
      entity_id: employee.id,
      action: "face_profile_deleted",
      description: "Colaborador excluiu o cadastro de reconhecimento facial",
      metadata: {},
      created_by: employee.id,
    });

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error("Erro inesperado em delete-face-profile:", error instanceof Error ? error.message : error);
    return jsonResponse({ error: "Erro inesperado" }, 500);
  }
});
