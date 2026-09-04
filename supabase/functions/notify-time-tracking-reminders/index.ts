import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
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

    const now = new Date();
    const ano = now.getFullYear();
    const mes = now.getMonth() + 1;
    const diasNoMes = lastDayOfMonth(ano, now.getMonth());
    const diaAtual = now.getDate();
    const proximoDoFechamento = diasNoMes - diaAtual <= 2; // últimos 3 dias do mês

    let closingRemindersCreated = 0;
    let pendingApprovalRemindersCreated = 0;

    const { data: tenants, error: tenantError } = await supabase.from("tenants").select("id");
    if (tenantError) throw tenantError;

    for (const tenant of tenants ?? []) {
      // ── Lembrete de fechamento mensal para admin/rh ──────────────────────────
      if (proximoDoFechamento) {
        const { data: lock } = await supabase
          .from("time_tracking_period_locks")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("ano", ano)
          .eq("mes", mes)
          .maybeSingle();

        if (!lock) {
          // Ver ponto de terceiro é quem acompanha a jornada do time (PUL-206).
          const { data: roleRows } = await supabase
            .rpc("users_with_capability", { _tenant_id: tenant.id, _capability: "ponto:ler-terceiro" });

          const authIds = [...new Set((roleRows ?? []).map((r: { user_id: string }) => r.user_id))];
          if (authIds.length > 0) {
            const { data: recipients } = await supabase
              .from("employees")
              .select("id")
              .in("auth_id", authIds)
              .eq("tenant_id", tenant.id);

            for (const recipient of recipients ?? []) {
              const { data: existing } = await supabase
                .from("notifications")
                .select("id")
                .eq("recipient_id", recipient.id)
                .eq("type", "time_tracking_closing_reminder")
                .eq("is_resolved", false)
                .limit(1);

              const title = `Fechamento de jornada pendente — ${mes}/${ano}`;
              const message =
                `O período de ${mes}/${ano} ainda não foi fechado. ` +
                "Revise as marcações e ajustes pendentes antes do fechamento mensal.";

              if (existing && existing.length > 0) {
                await supabase
                  .from("notifications")
                  .update({ created_at: now.toISOString(), title, message })
                  .eq("id", existing[0].id);
              } else {
                await supabase.from("notifications").insert({
                  tenant_id: tenant.id,
                  recipient_id: recipient.id,
                  type: "time_tracking_closing_reminder",
                  category: "jornada",
                  priority: "normal",
                  action_type: "navigate",
                  action_url: "/jornada/relatorios",
                  title,
                  message,
                  metadata: { ano, mes },
                  is_read: false,
                  is_resolved: false,
                });
                closingRemindersCreated++;
              }
            }
          }
        }
      }

      // ── Lembrete de aprovações pendentes há mais de 2 dias para admin ────────
      const doisDiasAtras = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const { data: staleRequests } = await supabase
        .from("time_adjustment_requests")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("status", "pendente")
        .lte("created_at", doisDiasAtras);

      if (staleRequests && staleRequests.length > 0) {
        const { data: adminRoles } = await supabase
          .rpc("users_with_capability", { _tenant_id: tenant.id, _capability: "ponto:aprovar" });

        const adminAuthIds = [...new Set((adminRoles ?? []).map((r: { user_id: string }) => r.user_id))];
        if (adminAuthIds.length > 0) {
          const { data: admins } = await supabase
            .from("employees")
            .select("id")
            .in("auth_id", adminAuthIds)
            .eq("tenant_id", tenant.id);

          for (const admin of admins ?? []) {
            const { data: existing } = await supabase
              .from("notifications")
              .select("id")
              .eq("recipient_id", admin.id)
              .eq("type", "time_adjustment_stale_reminder")
              .eq("is_resolved", false)
              .limit(1);

            const title = `${staleRequests.length} solicitação(ões) de jornada aguardando decisão`;
            const message =
              `Há ${staleRequests.length} solicitação(ões) de ajuste de ponto/hora extra ` +
              "pendentes há mais de 2 dias. Acesse Aprovações para decidir.";

            if (existing && existing.length > 0) {
              await supabase
                .from("notifications")
                .update({ created_at: now.toISOString(), title, message })
                .eq("id", existing[0].id);
            } else {
              await supabase.from("notifications").insert({
                tenant_id: tenant.id,
                recipient_id: admin.id,
                type: "time_adjustment_stale_reminder",
                category: "jornada",
                priority: "high",
                action_type: "navigate",
                action_url: "/jornada/aprovacoes",
                title,
                message,
                metadata: { count: staleRequests.length },
                is_read: false,
                is_resolved: false,
              });
              pendingApprovalRemindersCreated++;
            }
          }
        }
      } else {
        // Sem pendências antigas: resolve lembretes anteriores deste tenant.
        await supabase
          .from("notifications")
          .update({ is_resolved: true })
          .eq("tenant_id", tenant.id)
          .eq("type", "time_adjustment_stale_reminder")
          .eq("is_resolved", false);
      }
    }

    return new Response(
      JSON.stringify({ closingRemindersCreated, pendingApprovalRemindersCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Erro inesperado em notify-time-tracking-reminders:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
