import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PUNCH_SEQUENCE = [
  "entrada",
  "inicio_intervalo",
  "fim_intervalo",
  "saida",
] as const;

type PunchType = (typeof PUNCH_SEQUENCE)[number];

const PUNCH_LABELS: Record<PunchType, string> = {
  entrada: "Entrada",
  inicio_intervalo: "Início de Intervalo",
  fim_intervalo: "Fim de Intervalo",
  saida: "Saída",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type AdminClient = ReturnType<typeof createClient>;

// Colaborador + admin/rh do tenant recebem os alertas de jornada (decisão do dev:
// sem etapa de gestor no fluxo, então avisa direto quem pode agir — admin/rh).
async function getAlertRecipients(
  adminClient: AdminClient,
  tenantId: string,
  employeeId: string,
): Promise<string[]> {
  // Quem recebe aviso de marcação é quem pode ver ponto de terceiro — a capacidade diz
  // isso melhor que a lista de papéis, e sobrevive a papel customizado (PUL-206).
  const { data: roleRows } = await adminClient
    .rpc("users_with_capability", { _tenant_id: tenantId, _capability: "ponto:ler-terceiro" });

  const authIds = [...new Set((roleRows ?? []).map((r: { user_id: string }) => r.user_id))];
  if (authIds.length === 0) return [employeeId];

  const { data: adminEmployees } = await adminClient
    .from("employees")
    .select("id")
    .in("auth_id", authIds)
    .eq("tenant_id", tenantId);

  const ids = new Set<string>([employeeId, ...(adminEmployees ?? []).map((e: { id: string }) => e.id)]);
  return Array.from(ids);
}

async function upsertAlert(
  adminClient: AdminClient,
  opts: {
    tenantId: string;
    recipients: string[];
    employeeId: string;
    type: string;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
  },
) {
  const { tenantId, recipients, employeeId, type, title, message, metadata } = opts;
  for (const recipientId of recipients) {
    const { data: existing } = await adminClient
      .from("notifications")
      .select("id")
      .eq("recipient_id", recipientId)
      .eq("type", type)
      .eq("reference_id", employeeId)
      .eq("is_resolved", false)
      .limit(1);

    if (existing && existing.length > 0) {
      await adminClient
        .from("notifications")
        .update({ created_at: new Date().toISOString(), title, message, metadata })
        .eq("id", existing[0].id);
    } else {
      await adminClient.from("notifications").insert({
        tenant_id: tenantId,
        recipient_id: recipientId,
        reference_id: employeeId,
        type,
        category: "jornada",
        priority: "high",
        action_type: "navigate",
        action_url: "/jornada",
        title,
        message,
        metadata,
        is_read: false,
        is_resolved: false,
      });
    }
  }
}

async function resolveAlert(adminClient: AdminClient, type: string, employeeId: string) {
  await adminClient
    .from("notifications")
    .update({ is_resolved: true })
    .eq("type", type)
    .eq("reference_id", employeeId)
    .eq("is_resolved", false);
}

// Alertas de banco de horas negativo e hora extra acima do limite diário
// (Fase 2 — sem alerta de saldo positivo alto: sem limite de referência definido ainda).
async function handleTimeTrackingAlerts(
  adminClient: AdminClient,
  employeeId: string,
  tenantId: string,
  dataReferencia: string,
) {
  try {
    const [{ data: summary }, { data: settingsRow }, { data: employeeInfo }, { data: latestLedger }] =
      await Promise.all([
        adminClient
          .from("time_daily_summary")
          .select("horas_extras")
          .eq("employee_id", employeeId)
          .eq("data", dataReferencia)
          .maybeSingle(),
        adminClient
          .from("time_tracking_settings")
          .select("limite_horas_extras_diarias")
          .eq("tenant_id", tenantId)
          .maybeSingle(),
        adminClient.from("employees").select("nome").eq("id", employeeId).maybeSingle(),
        adminClient
          .from("time_bank_ledger")
          .select("saldo_acumulado")
          .eq("employee_id", employeeId)
          .order("data", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const nomeColaborador = (employeeInfo as { nome?: string } | null)?.nome ?? "Colaborador";
    const limiteHorasExtras = (settingsRow as { limite_horas_extras_diarias?: number } | null)
      ?.limite_horas_extras_diarias ?? 2;
    const saldoAcumulado = (latestLedger as { saldo_acumulado?: number } | null)?.saldo_acumulado ?? 0;
    const horasExtrasHoje = (summary as { horas_extras?: number } | null)?.horas_extras ?? 0;

    const recipients = await getAlertRecipients(adminClient, tenantId, employeeId);

    if (saldoAcumulado < 0) {
      await upsertAlert(adminClient, {
        tenantId,
        recipients,
        employeeId,
        type: "time_bank_negative",
        title: `Banco de horas negativo — ${nomeColaborador}`,
        message: `O banco de horas de ${nomeColaborador} está negativo: ${saldoAcumulado.toFixed(2)}h.`,
        metadata: { employee_name: nomeColaborador, saldo_acumulado: saldoAcumulado },
      });
    } else {
      await resolveAlert(adminClient, "time_bank_negative", employeeId);
    }

    if (horasExtrasHoje > limiteHorasExtras) {
      await upsertAlert(adminClient, {
        tenantId,
        recipients,
        employeeId,
        type: "overtime_limit_exceeded",
        title: `Hora extra acima do limite — ${nomeColaborador}`,
        message:
          `${nomeColaborador} registrou ${horasExtrasHoje.toFixed(2)}h extras hoje, ` +
          `acima do limite diário configurado (${limiteHorasExtras}h).`,
        metadata: {
          employee_name: nomeColaborador,
          horas_extras: horasExtrasHoje,
          limite: limiteHorasExtras,
          data: dataReferencia,
        },
      });
    }
  } catch (error) {
    console.error(
      "Erro ao processar alertas de jornada:",
      error instanceof Error ? error.message : error,
    );
  }
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
      latitude?: number;
      longitude?: number;
      origem?: string;
      selfie_path?: string;
      face_match_status?: string;
      face_match_score?: number;
    };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Corpo da requisição inválido" }, 400);
    }

    const tipo = body.tipo;
    if (!tipo || !PUNCH_SEQUENCE.includes(tipo as PunchType)) {
      return jsonResponse({ error: "Tipo de marcação inválido" }, 400);
    }

    const latitude = typeof body.latitude === "number" ? body.latitude : null;
    const longitude = typeof body.longitude === "number" ? body.longitude : null;
    const origem = body.origem === "pwa" ? "pwa" : "web";

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: employee, error: employeeError } = await adminClient
      .from("employees")
      .select("id, tenant_id, status")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (employeeError) {
      console.error("Erro ao buscar colaborador:", employeeError.message);
      return jsonResponse({ error: "Erro ao validar colaborador" }, 500);
    }
    if (!employee) {
      return jsonResponse({ error: "Colaborador não encontrado" }, 404);
    }
    if (employee.status !== "ativo") {
      return jsonResponse({ error: "Colaborador inativo" }, 403);
    }

    const now = new Date();

    const { data: periodLock } = await adminClient
      .from("time_tracking_period_locks")
      .select("id")
      .eq("tenant_id", employee.tenant_id)
      .eq("ano", now.getFullYear())
      .eq("mes", now.getMonth() + 1)
      .maybeSingle();

    if (periodLock) {
      return jsonResponse({ error: "O período deste mês já foi fechado pelo RH." }, 409);
    }

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const { data: todaysPunches, error: punchesError } = await adminClient
      .from("time_entries")
      .select("tipo, horario")
      .eq("employee_id", employee.id)
      .gte("horario", todayStart.toISOString())
      .lte("horario", todayEnd.toISOString())
      .order("horario", { ascending: true });

    if (punchesError) {
      console.error("Erro ao consultar marcações do dia:", punchesError.message);
      return jsonResponse({ error: "Erro ao validar sequência de marcações" }, 500);
    }

    const lastTipo = todaysPunches && todaysPunches.length > 0
      ? (todaysPunches[todaysPunches.length - 1].tipo as PunchType)
      : null;
    const lastIndex = lastTipo ? PUNCH_SEQUENCE.indexOf(lastTipo) : -1;
    const expectedTipo = PUNCH_SEQUENCE[lastIndex + 1];

    if (tipo !== expectedTipo) {
      const message = expectedTipo
        ? `Próxima marcação esperada: ${PUNCH_LABELS[expectedTipo]}.`
        : "O ciclo de ponto de hoje já foi concluído.";
      return jsonResponse({ error: message }, 409);
    }

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("cf-connecting-ip")
      ?? null;
    const userAgent = req.headers.get("user-agent");

    // Selfie é opcional; o path só é aceito se o 2º segmento (employee_id) bater
    // com o colaborador autenticado — evita referenciar a selfie de outra pessoa.
    const selfiePath = typeof body.selfie_path === "string" && body.selfie_path.split("/")[1] === employee.id
      ? body.selfie_path
      : null;

    // Verificação facial roda no navegador do colaborador (on-device); aqui só
    // guardamos o resultado reportado — nunca bloqueia a marcação (soft-fail).
    const FACE_MATCH_STATUSES = ["confirmado", "nao_confirmado", "sem_verificacao"];
    const faceMatchStatus = FACE_MATCH_STATUSES.includes(body.face_match_status ?? "")
      ? body.face_match_status
      : null;
    const faceMatchScore = typeof body.face_match_score === "number" ? body.face_match_score : null;

    const { data: inserted, error: insertError } = await adminClient
      .from("time_entries")
      .insert({
        tenant_id: employee.tenant_id,
        employee_id: employee.id,
        tipo,
        horario: now.toISOString(),
        origem,
        latitude,
        longitude,
        ip_address: ipAddress,
        user_agent: userAgent,
        selfie_path: selfiePath,
        face_match_status: faceMatchStatus,
        face_match_score: faceMatchScore,
      })
      .select("id, tipo, horario")
      .single();

    if (insertError || !inserted) {
      console.error("Erro ao registrar marcação:", insertError?.message);
      return jsonResponse({ error: "Erro ao registrar marcação" }, 500);
    }

    const dataReferencia = now.toISOString().split("T")[0];
    const { error: rpcError } = await adminClient.rpc("recompute_daily_summary", {
      p_employee_id: employee.id,
      p_data: dataReferencia,
    });
    if (rpcError) {
      console.error("Erro ao recalcular resumo diário:", rpcError.message);
    }

    const { error: auditError } = await adminClient.from("time_tracking_audit_log").insert({
      tenant_id: employee.tenant_id,
      entity_type: "time_entries",
      entity_id: inserted.id,
      action: "punch_created",
      description: `Marcação de ${PUNCH_LABELS[tipo as PunchType]} registrada`,
      metadata: {
        tipo,
        origem,
        has_location: latitude !== null && longitude !== null,
        has_selfie: selfiePath !== null,
        face_match_status: faceMatchStatus,
      },
      created_by: employee.id,
    });
    if (auditError) {
      console.error("Erro ao registrar auditoria:", auditError.message);
    }

    if (tipo === "saida" && !rpcError) {
      await handleTimeTrackingAlerts(adminClient, employee.id, employee.tenant_id, dataReferencia);
    }

    return jsonResponse({ entry: inserted }, 200);
  } catch (error) {
    console.error("Erro inesperado em record-time-punch:", error instanceof Error ? error.message : error);
    return jsonResponse({ error: "Erro inesperado" }, 500);
  }
});
