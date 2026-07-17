import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PUNCH_TYPES = ["entrada", "inicio_intervalo", "fim_intervalo", "saida"] as const;
const TIPO_LABELS: Record<string, string> = {
  ajuste_ponto: "ajuste de ponto",
  hora_extra: "hora extra",
  atestado: "atestado",
};

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

    let body: {
      tipo?: string;
      data_referencia?: string;
      data_fim?: string;
      tipo_marcacao?: string;
      horario_solicitado?: string;
      entry_id_original?: string;
      horas_solicitadas?: number;
      motivo?: string;
      anexo_path?: string;
      anexo_nome?: string;
    };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Corpo da requisição inválido" }, 400);
    }

    const tipo = body.tipo;
    if (tipo !== "ajuste_ponto" && tipo !== "hora_extra" && tipo !== "atestado") {
      return jsonResponse({ error: "Tipo de solicitação inválido" }, 400);
    }
    if (!body.data_referencia || !/^\d{4}-\d{2}-\d{2}$/.test(body.data_referencia)) {
      return jsonResponse({ error: "Data de referência inválida" }, 400);
    }
    if (!body.motivo || body.motivo.trim().length < 5) {
      return jsonResponse({ error: "Motivo é obrigatório (mínimo 5 caracteres)" }, 400);
    }
    if (tipo === "ajuste_ponto") {
      if (!body.tipo_marcacao || !PUNCH_TYPES.includes(body.tipo_marcacao as typeof PUNCH_TYPES[number])) {
        return jsonResponse({ error: "Tipo de marcação inválido para o ajuste" }, 400);
      }
      if (!body.horario_solicitado) {
        return jsonResponse({ error: "Horário solicitado é obrigatório" }, 400);
      }
    }
    if (tipo === "hora_extra") {
      if (typeof body.horas_solicitadas !== "number" || body.horas_solicitadas <= 0) {
        return jsonResponse({ error: "Informe a quantidade de horas extras" }, 400);
      }
    }
    let dataFim: string | null = null;
    if (tipo === "atestado") {
      if (!body.anexo_path) {
        return jsonResponse({ error: "Anexe o comprovante do atestado" }, 400);
      }
      dataFim = body.data_fim && /^\d{4}-\d{2}-\d{2}$/.test(body.data_fim) ? body.data_fim : body.data_referencia;
      if (dataFim < body.data_referencia) {
        return jsonResponse({ error: "Data final anterior à data inicial" }, 400);
      }
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: employee, error: employeeError } = await adminClient
      .from("employees")
      .select("id, nome, tenant_id, status")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (employeeError || !employee) {
      return jsonResponse({ error: "Colaborador não encontrado" }, 404);
    }
    if (employee.status !== "ativo") {
      return jsonResponse({ error: "Colaborador inativo" }, 403);
    }

    const [ano, mes] = body.data_referencia.split("-").map(Number);
    const [anoFim, mesFim] = (dataFim ?? body.data_referencia).split("-").map(Number);
    const { data: locks } = await adminClient
      .from("time_tracking_period_locks")
      .select("ano, mes")
      .eq("tenant_id", employee.tenant_id);

    const periodoFechado = (locks ?? []).some((l: { ano: number; mes: number }) =>
      (l.ano === ano && l.mes === mes) || (l.ano === anoFim && l.mes === mesFim));
    if (periodoFechado) {
      return jsonResponse({ error: "O período desta data já foi fechado pelo RH." }, 409);
    }

    const { data: inserted, error: insertError } = await adminClient
      .from("time_adjustment_requests")
      .insert({
        tenant_id: employee.tenant_id,
        employee_id: employee.id,
        tipo,
        data_referencia: body.data_referencia,
        data_fim: dataFim,
        tipo_marcacao: body.tipo_marcacao ?? null,
        horario_solicitado: body.horario_solicitado ?? null,
        entry_id_original: body.entry_id_original ?? null,
        horas_solicitadas: body.horas_solicitadas ?? null,
        motivo: body.motivo.trim(),
        anexo_path: body.anexo_path ?? null,
        anexo_nome: body.anexo_nome ?? null,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      console.error("Erro ao criar solicitação:", insertError?.message);
      return jsonResponse({ error: "Erro ao criar solicitação" }, 500);
    }

    await adminClient.from("time_tracking_audit_log").insert({
      tenant_id: employee.tenant_id,
      entity_type: "time_adjustment_requests",
      entity_id: inserted.id,
      action: "request_created",
      description: `${employee.nome} solicitou ${TIPO_LABELS[tipo] ?? tipo}`,
      metadata: { tipo, data_referencia: body.data_referencia, data_fim: dataFim },
      created_by: employee.id,
    });

    // Notifica admins do tenant (aprovação é exclusiva do admin — sem etapa de gestor/RH).
    const { data: adminRoles } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("tenant_id", employee.tenant_id)
      .eq("role", "admin");

    const adminAuthIds = [...new Set((adminRoles ?? []).map((r: { user_id: string }) => r.user_id))];
    if (adminAuthIds.length > 0) {
      const { data: adminEmployees } = await adminClient
        .from("employees")
        .select("id")
        .in("auth_id", adminAuthIds)
        .eq("tenant_id", employee.tenant_id);

      const label = TIPO_LABELS[tipo] ?? tipo;
      const notifications = (adminEmployees ?? []).map((admin: { id: string }) => ({
        tenant_id: employee.tenant_id,
        recipient_id: admin.id,
        reference_id: inserted.id,
        type: "time_adjustment_pending",
        category: "jornada",
        priority: "normal",
        action_type: "navigate",
        action_url: "/jornada/aprovacoes",
        title: `Nova solicitação de ${label} — ${employee.nome}`,
        message: `${employee.nome} solicitou ${label} para ${body.data_referencia}. Motivo: ${body.motivo.trim()}`,
        metadata: { employee_name: employee.nome, tipo, data_referencia: body.data_referencia },
        is_read: false,
        is_resolved: false,
      }));

      if (notifications.length > 0) {
        await adminClient.from("notifications").insert(notifications);
      }
    }

    return jsonResponse({ request: inserted }, 200);
  } catch (error) {
    console.error("Erro inesperado em submit-time-adjustment:", error instanceof Error ? error.message : error);
    return jsonResponse({ error: "Erro inesperado" }, 500);
  }
});
