import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]; // yyyy-MM-dd
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
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
    let nfAlertsSent = 0;
    let paymentAlertsSent = 0;

    // ── 1. NF issuance alerts: invoice_date = today ──────────────────────────
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

    for (const installment of nfInstallments ?? []) {
      const project = (installment as any).projects;
      if (!project?.manager_id) continue;

      const managerId: string = project.manager_id;

      // Deduplication: skip if alert already sent today for this installment
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("recipient_id", managerId)
        .eq("type", "installment_nf_alert")
        .eq("reference_id", installment.id)
        .gte("created_at", today)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const num = (installment as any).installment_number;
      const valueStr = formatCurrency((installment as any).value);

      const { error: insertError } = await supabase
        .from("notifications")
        .insert({
          tenant_id: project.tenant_id,
          recipient_id: managerId,
          type: "installment_nf_alert",
          category: "projeto",
          priority: "high",
          title: `Emissão de NF hoje — ${project.name}`,
          message: `Parcela ${num} (${valueStr}) está prevista para emissão de NF hoje.`,
          reference_id: installment.id,
          action_type: "navigate",
          action_url: `/projects/${project.id}`,
          metadata: {
            installment_number: num,
            value: (installment as any).value,
            project_name: project.name,
          },
        });

      if (insertError) {
        console.error(
          `Error inserting NF alert for installment ${installment.id}:`,
          insertError
        );
        continue;
      }

      nfAlertsSent++;
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

      const managerId: string = project.manager_id;

      // Deduplication
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("recipient_id", managerId)
        .eq("type", "installment_payment_alert")
        .eq("reference_id", installment.id)
        .gte("created_at", today)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const num = (installment as any).installment_number;
      const valueStr = formatCurrency((installment as any).value);

      const { error: insertError } = await supabase
        .from("notifications")
        .insert({
          tenant_id: project.tenant_id,
          recipient_id: managerId,
          type: "installment_payment_alert",
          category: "projeto",
          priority: "high",
          title: `Pagamento de NF previsto hoje — ${project.name}`,
          message: `Parcela ${num} (${valueStr}) tem pagamento previsto para hoje.`,
          reference_id: installment.id,
          action_type: "navigate",
          action_url: `/projects/${project.id}`,
          metadata: {
            installment_number: num,
            value: (installment as any).value,
            project_name: project.name,
          },
        });

      if (insertError) {
        console.error(
          `Error inserting payment alert for installment ${installment.id}:`,
          insertError
        );
        continue;
      }

      paymentAlertsSent++;
    }

    return new Response(
      JSON.stringify({
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
