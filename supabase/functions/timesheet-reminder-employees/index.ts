import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Returns the ISO date string (yyyy-MM-dd) for Monday of the current week. */
function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
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

    const weekStart = getCurrentWeekStart();

    // 1. Fetch all tenants with employee reminders enabled
    const { data: settings, error: settingsError } = await supabase
      .from("timesheet_reminder_settings")
      .select("tenant_id")
      .eq("employee_reminder_enabled", true);

    if (settingsError) throw settingsError;

    let tenantsProcessed = 0;
    let remindersSent = 0;

    for (const { tenant_id } of settings ?? []) {
      tenantsProcessed++;

      // 2a. Fetch active employees for this tenant
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("status", "ativo");

      if (empError) {
        console.error(`Error fetching employees for tenant ${tenant_id}:`, empError);
        continue;
      }

      for (const employee of employees ?? []) {
        // 2c. Get their active project IDs
        const { data: memberships, error: memberError } = await supabase
          .from("project_members")
          .select("project_id, projects!inner(portfolio_stage)")
          .eq("employee_id", employee.id)
          .not("projects.portfolio_stage", "in", '("planning","completed")');

        if (memberError) {
          console.error(`Error fetching memberships for employee ${employee.id}:`, memberError);
          continue;
        }

        if (!memberships || memberships.length === 0) continue;

        const projectIds = memberships.map((m: any) => m.project_id);

        // 2d. Check which projects have a 'submitted' submission this week
        const { data: submissions, error: subError } = await supabase
          .from("project_timesheet_submissions")
          .select("project_id")
          .in("project_id", projectIds)
          .eq("week_start", weekStart)
          .eq("status", "submitted");

        if (subError) {
          console.error(`Error fetching submissions for employee ${employee.id}:`, subError);
          continue;
        }

        const submittedProjectIds = new Set((submissions ?? []).map((s: any) => s.project_id));
        const allSubmitted = projectIds.every((id: string) => submittedProjectIds.has(id));

        if (allSubmitted) continue;

        // 2f. Deduplication: skip if reminder already sent this week
        const { data: existing, error: existingError } = await supabase
          .from("notifications")
          .select("id")
          .eq("recipient_id", employee.id)
          .eq("type", "timesheet_reminder")
          .gte("created_at", weekStart)
          .limit(1);

        if (existingError) {
          console.error(`Error checking existing notifications for employee ${employee.id}:`, existingError);
          continue;
        }

        if (existing && existing.length > 0) continue;

        // 2e. Insert reminder notification
        const { error: insertError } = await supabase
          .from("notifications")
          .insert({
            tenant_id,
            recipient_id: employee.id,
            type: "timesheet_reminder",
            title: "Lembre-se de lançar suas horas",
            message:
              "Você tem horas pendentes esta semana. Acesse sua timesheet para enviar.",
          });

        if (insertError) {
          console.error(`Error inserting notification for employee ${employee.id}:`, insertError);
          continue;
        }

        remindersSent++;
      }
    }

    return new Response(
      JSON.stringify({ tenants_processed: tenantsProcessed, reminders_sent: remindersSent }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
