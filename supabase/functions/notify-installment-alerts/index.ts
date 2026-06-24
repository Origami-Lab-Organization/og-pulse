import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function datePlusDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

interface NotifyParams {
  supabase: SupabaseClient;
  today: string;
  tenantId: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  referenceId: string;
  actionUrl: string;
  metadata: Record<string, unknown>;
}

async function notifyRecipient(params: NotifyParams): Promise<boolean> {
  const {
    supabase, today, tenantId, recipientId, type,
    title, message, referenceId, actionUrl, metadata,
  } = params;

  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("recipient_id", recipientId)
    .eq("type", type)
    .eq("reference_id", referenceId)
    .gte("created_at", today)
    .limit(1);

  if (existing && existing.length > 0) return false;

  const { error } = await supabase.from("notifications").insert({
    tenant_id: tenantId,
    recipient_id: recipientId,
    type,
    category: "projeto",
    priority: "high",
    title,
    message,
    reference_id: referenceId,
    action_type: "navigate",
    action_url: actionUrl,
    metadata,
  });

  if (error) {
    console.error(`Error inserting ${type} for recipient ${recipientId}:`, error);
    return false;
  }

  return true;
}

async function getAdminsByTenant(
  supabase: SupabaseClient,
  tenantIds: string[],
): Promise<Map<string, string[]>> {
  const adminsByTenant = new Map<string, string[]>();
  if (tenantIds.length === 0) return adminsByTenant;

  const { data: admins, error } = await supabase
    .from("employees")
    .select("id, tenant_id")
    .in("tenant_id", tenantIds)
    .eq("system_role", "admin")
    .eq("status", "ativo");

  if (error) {
    console.error("Error fetching admins:", error);
    return adminsByTenant;
  }

  for (const admin of admins ?? []) {
    const list = adminsByTenant.get(admin.tenant_id) ?? [];
    list.push(admin.id);
    adminsByTenant.set(admin.tenant_id, list);
  }

  return adminsByTenant;
}

function getRecipients(
  managerId: string | null,
  tenantId: string,
  adminsByTenant: Map<string, string[]>,
): string[] {
  const admins = adminsByTenant.get(tenantId) ?? [];
  const all = managerId ? [managerId, ...admins] : [...admins];
  return [...new Set(all)];
}

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

    const today = getTodayDate();
    const in3Days = datePlusDays(today, 3);
    let nfAlertsSent = 0;
    let nfAlerts3dSent = 0;
    let paymentAlertsSent = 0;

    // ── 1a. NF advance alerts: invoice_date = today + 3 days ─────────────────
    const { data: nfIn3d, error: nf3dError } = await supabase
      .from("project_installments")
      .select(`
        id,
        installment_number,
        value,
        invoice_date,
        status,
        projects!inner(
          id,
          name,
          tenant_id,
          manager_id
        )
      `)
      .eq("invoice_date", in3Days)
      .neq("status", "received");

    if (nf3dError) throw nf3dError;

    const tenantIds3d = [
      ...new Set((nfIn3d ?? []).map((i) => (i as any).projects?.tenant_id).filter(Boolean)),
    ] as string[];
    const admins3d = await getAdminsByTenant(supabase, tenantIds3d);

    for (const installment of nfIn3d ?? []) {
      const project = (installment as any).projects;
      if (!project) continue;

      const num = (installment as any).installment_number;
      const valueStr = formatCurrency((installment as any).value);
      const invoiceDate = (installment as any).invoice_date as string;
      const [year, month, day] = invoiceDate.split("-");
      const formattedDate = `${day}/${month}/${year}`;

      const recipients = getRecipients(project.manager_id, project.tenant_id, admins3d);

      for (const recipientId of recipients) {
        const sent = await notifyRecipient({
          supabase,
          today,
          tenantId: project.tenant_id,
          recipientId,
          type: "installment_nf_alert_3d",
          title: `Emissão de NF em 3 dias — ${project.name}`,
          message: `Parcela ${num} (${valueStr}) está prevista para emissão de NF em ${formattedDate}.`,
          referenceId: installment.id as string,
          actionUrl: `/projects/${project.id}`,
          metadata: {
            installment_number: num,
            value: (installment as any).value,
            project_name: project.name,
            invoice_date: invoiceDate,
          },
        });
        if (sent) nfAlerts3dSent++;
      }
    }

    // ── 1b. NF issuance alerts: invoice_date = today ─────────────────────────
    const { data: nfInstallments, error: nfError } = await supabase
      .from("project_installments")
      .select(`
        id,
        installment_number,
        value,
        status,
        projects!inner(
          id,
          name,
          tenant_id,
          manager_id
        )
      `)
      .eq("invoice_date", today)
      .neq("status", "received");

    if (nfError) throw nfError;

    const tenantIdsToday = [
      ...new Set((nfInstallments ?? []).map((i) => (i as any).projects?.tenant_id).filter(Boolean)),
    ] as string[];
    const adminsToday = await getAdminsByTenant(supabase, tenantIdsToday);

    for (const installment of nfInstallments ?? []) {
      const project = (installment as any).projects;
      if (!project) continue;

      const num = (installment as any).installment_number;
      const valueStr = formatCurrency((installment as any).value);

      const recipients = getRecipients(project.manager_id, project.tenant_id, adminsToday);

      for (const recipientId of recipients) {
        const sent = await notifyRecipient({
          supabase,
          today,
          tenantId: project.tenant_id,
          recipientId,
          type: "installment_nf_alert",
          title: `Emissão de NF hoje — ${project.name}`,
          message: `Parcela ${num} (${valueStr}) está prevista para emissão de NF hoje.`,
          referenceId: installment.id as string,
          actionUrl: `/projects/${project.id}`,
          metadata: {
            installment_number: num,
            value: (installment as any).value,
            project_name: project.name,
          },
        });
        if (sent) nfAlertsSent++;
      }
    }

    // ── 2. Payment alerts: payment_date = today ───────────────────────────────
    const { data: paymentInstallments, error: paymentError } = await supabase
      .from("project_installments")
      .select(`
        id,
        installment_number,
        value,
        status,
        projects!inner(
          id,
          name,
          tenant_id,
          manager_id
        )
      `)
      .eq("payment_date", today)
      .neq("status", "received");

    if (paymentError) throw paymentError;

    for (const installment of paymentInstallments ?? []) {
      const project = (installment as any).projects;
      if (!project?.manager_id) continue;

      const num = (installment as any).installment_number;
      const valueStr = formatCurrency((installment as any).value);

      const sent = await notifyRecipient({
        supabase,
        today,
        tenantId: project.tenant_id,
        recipientId: project.manager_id,
        type: "installment_payment_alert",
        title: `Pagamento de NF previsto hoje — ${project.name}`,
        message: `Parcela ${num} (${valueStr}) tem pagamento previsto para hoje.`,
        referenceId: installment.id as string,
        actionUrl: `/projects/${project.id}`,
        metadata: {
          installment_number: num,
          value: (installment as any).value,
          project_name: project.name,
        },
      });
      if (sent) paymentAlertsSent++;
    }

    return new Response(
      JSON.stringify({
        nf_alerts_3d_sent: nfAlerts3dSent,
        nf_alerts_sent: nfAlertsSent,
        payment_alerts_sent: paymentAlertsSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
