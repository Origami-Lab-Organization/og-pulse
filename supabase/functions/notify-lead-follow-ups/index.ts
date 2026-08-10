import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Lembrete de retorno de contato das oportunidades do Pipeline comercial.
//
// Roda diariamente por pg_cron (ver migration 20260810150000). Antes disso o
// único aviso de follow-up era client-side: só existia com a tela aberta.
//
// Dois disparos, ambos deduplicados por destinatário + tipo + follow-up + dia:
//   - lead_follow_up_due:     scheduled_at cai hoje
//   - lead_follow_up_overdue: scheduled_at já passou e segue pendente
//
// Follow-ups de oportunidade arquivada (perdida) NUNCA são notificados — o
// join com `leads` é `!inner` e filtra `archived = false`.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

interface LeadRef {
  name: string;
  company_name: string | null;
  crm_stage: string;
  archived: boolean;
}

interface FollowUpRow {
  id: string;
  tenant_id: string;
  lead_id: string;
  assigned_to: string | null;
  created_by: string | null;
  description: string;
  scheduled_at: string;
  notified: boolean;
  lead: LeadRef | null;
}

/**
 * Normaliza o join com `leads`.
 *
 * A relação é muitos-para-um, então o PostgREST devolve um objeto — mas a
 * inferência de tipos do client trata como array. Aceitamos as duas formas para
 * não depender de um cast cego.
 */
// deno-lint-ignore no-explicit-any
function toFollowUpRows(rows: any[] | null): FollowUpRow[] {
  return (rows ?? []).map((row) => {
    const lead = Array.isArray(row.lead) ? row.lead[0] ?? null : row.lead ?? null;
    return { ...row, lead } as FollowUpRow;
  });
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function startOfTomorrowUtc(today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

function daysLate(scheduledAt: string, now: Date): number {
  const diffMs = now.getTime() - new Date(scheduledAt).getTime();
  return Math.max(1, Math.floor(diffMs / 86_400_000));
}

/** Quem cobra o retorno: o responsável designado, ou quem agendou. */
function resolveRecipient(followUp: FollowUpRow): string | null {
  return followUp.assigned_to ?? followUp.created_by;
}

function leadDisplayName(followUp: FollowUpRow): string {
  const lead = followUp.lead;
  if (!lead) return "Oportunidade";
  return lead.company_name ? `${lead.name} — ${lead.company_name}` : lead.name;
}

interface NotifyParams {
  supabase: SupabaseClient;
  today: string;
  followUp: FollowUpRow;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  priority: string;
}

/**
 * Insere a notificação se ainda não houver uma igual hoje.
 *
 * Mesma estratégia de dedup do notify-installment-alerts (ADR-0004): o cron
 * pode rodar mais de uma vez no dia sem duplicar a caixa de entrada.
 */
async function notifyRecipient(params: NotifyParams): Promise<boolean> {
  const { supabase, today, followUp, recipientId, type, title, message, priority } = params;

  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("recipient_id", recipientId)
    .eq("type", type)
    .eq("reference_id", followUp.id)
    .gte("created_at", today)
    .limit(1);

  if (existing && existing.length > 0) return false;

  const { error } = await supabase.from("notifications").insert({
    tenant_id: followUp.tenant_id,
    recipient_id: recipientId,
    type,
    category: "comercial",
    priority,
    title,
    message,
    reference_id: followUp.id,
    action_type: "navigate",
    // Deep-link já tratado em CRM.tsx: abre o detalhe na aba de follow-ups.
    action_url: `/pipeline?lead=${followUp.lead_id}&tab=followups`,
    metadata: {
      lead_id: followUp.lead_id,
      lead_name: followUp.lead?.name ?? null,
      crm_stage: followUp.lead?.crm_stage ?? null,
      scheduled_at: followUp.scheduled_at,
      description: followUp.description,
    },
  });

  if (error) {
    console.error(`Error inserting ${type} for recipient ${recipientId}:`, error);
    return false;
  }

  return true;
}

const FOLLOW_UP_SELECT = `
  id,
  tenant_id,
  lead_id,
  assigned_to,
  created_by,
  description,
  scheduled_at,
  notified,
  lead:leads!inner(name, company_name, crm_stage, archived)
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const now = new Date();
    const today = getTodayDate();
    const todayStart = `${today}T00:00:00.000Z`;
    const tomorrowStart = startOfTomorrowUtc(today);

    let dueSent = 0;
    let overdueSent = 0;

    // ── 1. Retorno agendado para hoje ────────────────────────────────────────
    const { data: dueToday, error: dueError } = await supabase
      .from("lead_follow_ups")
      .select(FOLLOW_UP_SELECT)
      .eq("status", "pending")
      .eq("lead.archived", false)
      .gte("scheduled_at", todayStart)
      .lt("scheduled_at", tomorrowStart);

    if (dueError) throw dueError;

    const dueRows = toFollowUpRows(dueToday);

    for (const followUp of dueRows) {
      const recipientId = resolveRecipient(followUp);
      if (!recipientId) continue;

      const sent = await notifyRecipient({
        supabase,
        today,
        followUp,
        recipientId,
        type: "lead_follow_up_due",
        title: `Retorno de contato hoje — ${leadDisplayName(followUp)}`,
        message: followUp.description,
        priority: "high",
      });
      if (sent) dueSent++;
    }

    // Marca o aviso do dia como entregue. A dedup por dia já protege contra
    // duplicidade; `notified` é o registro durável de que o retorno foi cobrado.
    const dueIds = dueRows.filter((f) => !f.notified).map((f) => f.id);

    if (dueIds.length > 0) {
      const { error: markError } = await supabase
        .from("lead_follow_ups")
        .update({ notified: true, updated_at: now.toISOString() })
        .in("id", dueIds);
      if (markError) console.error("Error marking follow-ups as notified:", markError);
    }

    // ── 2. Retorno vencido e ainda pendente ──────────────────────────────────
    const { data: overdue, error: overdueError } = await supabase
      .from("lead_follow_ups")
      .select(FOLLOW_UP_SELECT)
      .eq("status", "pending")
      .eq("lead.archived", false)
      .lt("scheduled_at", todayStart);

    if (overdueError) throw overdueError;

    const overdueRows = toFollowUpRows(overdue);

    for (const followUp of overdueRows) {
      const recipientId = resolveRecipient(followUp);
      if (!recipientId) continue;

      const late = daysLate(followUp.scheduled_at, now);
      const sent = await notifyRecipient({
        supabase,
        today,
        followUp,
        recipientId,
        type: "lead_follow_up_overdue",
        title: `Retorno atrasado há ${late}d — ${leadDisplayName(followUp)}`,
        message: `${followUp.description} (previsto para ${formatDateBR(followUp.scheduled_at)})`,
        priority: "high",
      });
      if (sent) overdueSent++;
    }

    const summary = {
      today,
      dueToday: dueRows.length,
      dueSent,
      overdue: overdueRows.length,
      overdueSent,
    };
    console.log("notify-lead-follow-ups:", JSON.stringify(summary));

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-lead-follow-ups failed:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
