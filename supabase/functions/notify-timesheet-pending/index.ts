import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Get ISO week start (Monday) for a given date, offset weeks back */
function getISOWeekStart(date: Date, weeksBack = 0): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff - weeksBack * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateBR(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
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
    const todayStr = now.toISOString().split("T")[0];

    // Previous week boundaries
    const prevWeekMonday = getISOWeekStart(now, 1);
    const prevWeekSunday = new Date(prevWeekMonday);
    prevWeekSunday.setDate(prevWeekMonday.getDate() + 6);

    const prevWeekStart = prevWeekMonday.toISOString().split("T")[0];
    const prevWeekEnd = prevWeekSunday.toISOString().split("T")[0];

    let totalCreated = 0;
    let totalResolved = 0;

    // Get all tenants
    const { data: tenants, error: tenantError } = await supabase
      .from("tenants")
      .select("id");
    if (tenantError) throw tenantError;

    for (const tenant of tenants ?? []) {
      // Check if today is a business day for this tenant
      if (!isWeekday(now)) continue;

      // Check holidays for today
      const { data: todayHolidays } = await supabase
        .from("holidays")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("date", todayStr)
        .limit(1);

      if (todayHolidays && todayHolidays.length > 0) continue;

      // Get active employees
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("status", "ativo");
      if (empError) {
        console.error(`Error fetching employees for tenant ${tenant.id}:`, empError);
        continue;
      }

      for (const emp of employees ?? []) {
        // Check if employee has project memberships with active projects
        const { data: memberships } = await supabase
          .from("project_members")
          .select("project_id, projects!inner(portfolio_stage)")
          .eq("employee_id", emp.id)
          .not("projects.portfolio_stage", "in", '("planning","completed")');

        if (!memberships || memberships.length === 0) continue;

        const projectIds = memberships.map((m: any) => m.project_id);

        // Check if ALL projects have submitted timesheets for prev week
        const { data: submissions } = await supabase
          .from("project_timesheet_submissions")
          .select("project_id")
          .in("project_id", projectIds)
          .eq("week_start", prevWeekStart)
          .eq("status", "submitted");

        const submittedIds = new Set((submissions ?? []).map((s: any) => s.project_id));
        const allSubmitted = projectIds.every((id: string) => submittedIds.has(id));

        if (allSubmitted) {
          // Auto-resolve any existing pending notifications for this period
          const { data: toResolve } = await supabase
            .from("notifications")
            .select("id")
            .eq("recipient_id", emp.id)
            .eq("type", "timesheet_pending")
            .eq("is_resolved", false);

          for (const notif of toResolve ?? []) {
            await supabase
              .from("notifications")
              .update({ is_resolved: true })
              .eq("id", notif.id);
            totalResolved++;
          }
          continue;
        }

        // Check if unresolved timesheet_pending already exists for this employee
        const { data: existing } = await supabase
          .from("notifications")
          .select("id, created_at")
          .eq("recipient_id", emp.id)
          .eq("type", "timesheet_pending")
          .eq("is_resolved", false)
          .limit(1);

        const mondayFormatted = formatDateBR(prevWeekMonday);
        const sundayFormatted = formatDateBR(prevWeekSunday);
        const message = `Você tem horas lançadas da semana ${mondayFormatted} a ${sundayFormatted} que ainda não foram enviadas.`;

        if (existing && existing.length > 0) {
          // Update created_at to re-surface in inbox
          await supabase
            .from("notifications")
            .update({
              created_at: new Date().toISOString(),
              message,
            })
            .eq("id", existing[0].id);
          continue;
        }

        // Insert new notification
        const { error: insertError } = await supabase
          .from("notifications")
          .insert({
            tenant_id: tenant.id,
            recipient_id: emp.id,
            type: "timesheet_pending",
            category: "timesheet",
            priority: "high",
            action_type: "navigate",
            action_url: "/my-timesheet",
            title: "Timesheet pendente de envio",
            message,
            is_read: false,
            is_resolved: false,
          });

        if (insertError) {
          console.error(`Error inserting notification for employee ${emp.id}:`, insertError);
          continue;
        }

        totalCreated++;
      }
    }

    return new Response(
      JSON.stringify({ notifications_created: totalCreated, notifications_resolved: totalResolved }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
