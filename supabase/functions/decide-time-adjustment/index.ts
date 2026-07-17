import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TIPO_LABELS: Record<string, string> = {
  ajuste_ponto: "ajuste de ponto",
  hora_extra: "hora extra",
  atestado: "atestado",
  ferias: "férias",
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

    let body: { requestId?: string; decisao?: string; motivo_decisao?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Corpo da requisição inválido" }, 400);
    }

    if (!body.requestId) {
      return jsonResponse({ error: "requestId é obrigatório" }, 400);
    }
    if (body.decisao !== "aprovado" && body.decisao !== "rejeitado") {
      return jsonResponse({ error: "Decisão inválida" }, 400);
    }
    if (body.decisao === "rejeitado" && !body.motivo_decisao?.trim()) {
      return jsonResponse({ error: "Informe o motivo da rejeição" }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: adminEmployee, error: adminEmployeeError } = await adminClient
      .from("employees")
      .select("id, nome, tenant_id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (adminEmployeeError || !adminEmployee) {
      return jsonResponse({ error: "Colaborador não encontrado" }, 404);
    }

    // Aprovação de ajuste de ponto/hora extra é exclusiva do admin (sem etapa de gestor/RH — ADR-0008).
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _tenant_id: adminEmployee.tenant_id,
      _role: "admin",
    });
    if (!isAdmin) {
      return jsonResponse({ error: "Apenas administradores podem decidir esta solicitação" }, 403);
    }

    const { data: request, error: requestError } = await adminClient
      .from("time_adjustment_requests")
      .select("*")
      .eq("id", body.requestId)
      .eq("tenant_id", adminEmployee.tenant_id)
      .maybeSingle();

    if (requestError || !request) {
      return jsonResponse({ error: "Solicitação não encontrada" }, 404);
    }
    if (request.status !== "pendente") {
      return jsonResponse({ error: "Esta solicitação já foi decidida" }, 409);
    }

    const dataFimRequest = request.data_fim ?? request.data_referencia;
    const [ano, mes] = request.data_referencia.split("-").map(Number);
    const [anoFim, mesFim] = dataFimRequest.split("-").map(Number);
    const { data: locks } = await adminClient
      .from("time_tracking_period_locks")
      .select("ano, mes")
      .eq("tenant_id", adminEmployee.tenant_id);

    const periodoFechado = (locks ?? []).some((l: { ano: number; mes: number }) =>
      (l.ano === ano && l.mes === mes) || (l.ano === anoFim && l.mes === mesFim));
    if (periodoFechado) {
      return jsonResponse({ error: "O período desta data já foi fechado pelo RH." }, 409);
    }

    if (body.decisao === "aprovado" && request.tipo === "ajuste_ponto") {
      const { error: entryError } = await adminClient.from("time_entries").insert({
        tenant_id: request.tenant_id,
        employee_id: request.employee_id,
        tipo: request.tipo_marcacao,
        horario: request.horario_solicitado,
        origem: "web",
        is_ajuste: true,
        ajuste_de_id: request.entry_id_original,
      });

      if (entryError) {
        console.error("Erro ao aplicar ajuste de ponto:", entryError.message);
        return jsonResponse({ error: "Erro ao aplicar o ajuste de ponto" }, 500);
      }

      const { error: reprocessError } = await adminClient.rpc("reprocess_time_bank_from_date", {
        p_employee_id: request.employee_id,
        p_data_inicio: request.data_referencia,
      });
      if (reprocessError) {
        console.error("Erro ao reprocessar banco de horas:", reprocessError.message);
      }
    }

    if (body.decisao === "aprovado" && request.tipo === "atestado") {
      const { error: applyError } = await adminClient.rpc("apply_absence_period", {
        p_employee_id: request.employee_id,
        p_tenant_id: request.tenant_id,
        p_data_inicio: request.data_referencia,
        p_data_fim: dataFimRequest,
        p_status: "atestado",
      });
      if (applyError) {
        console.error("Erro ao aplicar período de atestado:", applyError.message);
        return jsonResponse({ error: "Erro ao aplicar o atestado no resumo diário" }, 500);
      }
    }

    const { data: updated, error: updateError } = await adminClient
      .from("time_adjustment_requests")
      .update({
        status: body.decisao,
        decidido_por: adminEmployee.id,
        decidido_em: new Date().toISOString(),
        motivo_decisao: body.motivo_decisao?.trim() ?? null,
      })
      .eq("id", request.id)
      .select("*")
      .single();

    if (updateError || !updated) {
      console.error("Erro ao atualizar solicitação:", updateError?.message);
      return jsonResponse({ error: "Erro ao registrar decisão" }, 500);
    }

    await adminClient.from("time_tracking_audit_log").insert({
      tenant_id: request.tenant_id,
      entity_type: "time_adjustment_requests",
      entity_id: request.id,
      action: body.decisao === "aprovado" ? "request_approved" : "request_rejected",
      description: `${adminEmployee.nome} ${body.decisao === "aprovado" ? "aprovou" : "rejeitou"} a solicitação`,
      metadata: { decisao: body.decisao, motivo_decisao: body.motivo_decisao ?? null },
      created_by: adminEmployee.id,
    });

    const label = TIPO_LABELS[request.tipo] ?? request.tipo;
    const decisionLabel = body.decisao === "aprovado" ? "aprovada" : "rejeitada";
    await adminClient.from("notifications").insert({
      tenant_id: request.tenant_id,
      recipient_id: request.employee_id,
      reference_id: request.id,
      type: "time_adjustment_decided",
      category: "jornada",
      priority: "normal",
      action_type: "navigate",
      action_url: "/jornada",
      title: `Sua solicitação de ${label} foi ${decisionLabel}`,
      message: body.motivo_decisao?.trim()
        ? `Motivo: ${body.motivo_decisao.trim()}`
        : `Sua solicitação referente a ${request.data_referencia} foi ${decisionLabel}.`,
      metadata: { tipo: request.tipo, decisao: body.decisao, data_referencia: request.data_referencia },
      is_read: false,
      is_resolved: false,
    });

    return jsonResponse({ request: updated }, 200);
  } catch (error) {
    console.error("Erro inesperado em decide-time-adjustment:", error instanceof Error ? error.message : error);
    return jsonResponse({ error: "Erro inesperado" }, 500);
  }
});
