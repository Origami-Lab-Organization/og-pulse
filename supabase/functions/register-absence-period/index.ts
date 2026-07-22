import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TIPO_LABELS: Record<string, string> = {
  ferias: "férias",
  atestado: "atestado",
  falta: "falta",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

// Lista de {ano, mes} distintos cobertos por [inicio, fim] (inclusive).
function monthsInRange(inicio: string, fim: string): { ano: number; mes: number }[] {
  const meses: { ano: number; mes: number }[] = [];
  const cursor = new Date(`${inicio}T00:00:00`);
  const end = new Date(`${fim}T00:00:00`);
  while (cursor <= end) {
    const ano = cursor.getFullYear();
    const mes = cursor.getMonth() + 1;
    if (!meses.some((m) => m.ano === ano && m.mes === mes)) {
      meses.push({ ano, mes });
    }
    cursor.setMonth(cursor.getMonth() + 1);
    cursor.setDate(1);
  }
  return meses;
}

// Lançamento direto do admin — sem aprovação em etapas (para férias, o saldo/aprovação em cascata já vive no módulo de férias existente).
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

    let body: { tipo?: string; employeeId?: string; dataInicio?: string; dataFim?: string; motivo?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Corpo da requisição inválido" }, 400);
    }

    if (body.tipo !== "ferias" && body.tipo !== "atestado" && body.tipo !== "falta") {
      return jsonResponse({ error: "Tipo inválido" }, 400);
    }
    if (!body.employeeId) {
      return jsonResponse({ error: "Colaborador é obrigatório" }, 400);
    }
    if (!body.dataInicio || !isValidDate(body.dataInicio) || !body.dataFim || !isValidDate(body.dataFim)) {
      return jsonResponse({ error: "Datas inválidas" }, 400);
    }
    if (body.dataFim < body.dataInicio) {
      return jsonResponse({ error: "Data final anterior à data inicial" }, 400);
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

    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _tenant_id: adminEmployee.tenant_id,
      _role: "admin",
    });
    if (!isAdmin) {
      return jsonResponse({ error: "Apenas administradores podem lançar ausências" }, 403);
    }

    const { data: targetEmployee, error: targetEmployeeError } = await adminClient
      .from("employees")
      .select("id, nome, tenant_id")
      .eq("id", body.employeeId)
      .eq("tenant_id", adminEmployee.tenant_id)
      .maybeSingle();

    if (targetEmployeeError || !targetEmployee) {
      return jsonResponse({ error: "Colaborador não encontrado neste tenant" }, 404);
    }

    const meses = monthsInRange(body.dataInicio, body.dataFim);
    const { data: locks } = await adminClient
      .from("time_tracking_period_locks")
      .select("ano, mes")
      .eq("tenant_id", adminEmployee.tenant_id);

    const periodoFechado = (locks ?? []).some((lock: { ano: number; mes: number }) =>
      meses.some((m) => m.ano === lock.ano && m.mes === lock.mes));
    if (periodoFechado) {
      return jsonResponse({ error: "O período selecionado já foi fechado pelo RH." }, 409);
    }

    const label = TIPO_LABELS[body.tipo];
    const now = new Date().toISOString();
    const { data: inserted, error: insertError } = await adminClient
      .from("time_adjustment_requests")
      .insert({
        tenant_id: adminEmployee.tenant_id,
        employee_id: targetEmployee.id,
        tipo: body.tipo,
        data_referencia: body.dataInicio,
        data_fim: body.dataFim,
        motivo: body.motivo?.trim() || `${label[0].toUpperCase()}${label.slice(1)} lançado(a) pelo administrador`,
        status: "aprovado",
        decidido_por: adminEmployee.id,
        decidido_em: now,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      console.error("Erro ao lançar ausência:", insertError?.message);
      return jsonResponse({ error: "Erro ao lançar ausência" }, 500);
    }

    const { error: applyError } = await adminClient.rpc("apply_absence_period", {
      p_employee_id: targetEmployee.id,
      p_tenant_id: adminEmployee.tenant_id,
      p_data_inicio: body.dataInicio,
      p_data_fim: body.dataFim,
      p_status: body.tipo,
    });
    if (applyError) {
      console.error("Erro ao aplicar período no ponto:", applyError.message);
      return jsonResponse({ error: `Ausência registrada, mas houve erro ao atualizar o resumo diário` }, 500);
    }

    await adminClient.from("time_tracking_audit_log").insert({
      tenant_id: adminEmployee.tenant_id,
      entity_type: "time_adjustment_requests",
      entity_id: inserted.id,
      action: "absence_period_registered",
      description: `${adminEmployee.nome} lançou ${label} de ${targetEmployee.nome} (${body.dataInicio} a ${body.dataFim})`,
      metadata: { tipo: body.tipo, data_inicio: body.dataInicio, data_fim: body.dataFim },
      created_by: adminEmployee.id,
    });

    await adminClient.from("notifications").insert({
      tenant_id: adminEmployee.tenant_id,
      recipient_id: targetEmployee.id,
      reference_id: inserted.id,
      type: "absence_period_registered",
      category: "jornada",
      priority: "normal",
      action_type: "navigate",
      action_url: "/jornada",
      title: `${label[0].toUpperCase()}${label.slice(1)} lançado(a) no seu ponto`,
      message: `Seu período de ${label} de ${body.dataInicio} a ${body.dataFim} foi registrado no Ponto Eletrônico.`,
      metadata: { tipo: body.tipo, data_inicio: body.dataInicio, data_fim: body.dataFim },
      is_read: false,
      is_resolved: false,
    });

    return jsonResponse({ request: inserted }, 200);
  } catch (error) {
    console.error("Erro inesperado em register-absence-period:", error instanceof Error ? error.message : error);
    return jsonResponse({ error: "Erro inesperado" }, 500);
  }
});
