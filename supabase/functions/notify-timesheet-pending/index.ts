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

        // Fetch pending project names for this employee
        const pendingProjectIds = projectIds.filter((id: string) => !submittedIds.has(id));
        const { data: pendingProjectsData } = await supabase
          .from("projects")
          .select("name")
          .in("id", pendingProjectIds);
        const pendingProjectNames = (pendingProjectsData ?? []).map((p: any) => p.name);
        const projectsList = pendingProjectNames.length > 0
          ? pendingProjectNames.join(", ")
          : "projetos ativos";

        const title = `Timesheet pendente — semana ${mondayFormatted} a ${sundayFormatted}`;
        const message = `Você tem horas lançadas que ainda não foram enviadas. Projetos pendentes: ${projectsList}.`;
        const metadata = {
          week_start: prevWeekStart,
          week_end: prevWeekSunday.toISOString().split("T")[0],
          pending_projects: pendingProjectNames,
        };

        if (existing && existing.length > 0) {
          // Update to re-surface in inbox
          await supabase
            .from("notifications")
            .update({ created_at: new Date().toISOString(), title, message, metadata })
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
            title,
            message,
            metadata,
            is_read: false,
            is_resolved: false,
          });

        if (insertError) {
          console.error(`Error inserting notification for employee ${emp.id}:`, insertError);
          continue;
        }

        totalCreated++;
      }

      // Manager/admin notifications — one consolidated notification per manager
      try {
        // Find all active projects for this tenant with a manager
        const { data: activeProjects } = await supabase
          .from("projects")
          .select("id, name, manager_id")
          .eq("tenant_id", tenant.id)
          .not("portfolio_stage", "in", '("planning","completed")')
          .not("manager_id", "is", null);

        if (!activeProjects || activeProjects.length === 0) continue;

        const activeProjectIds = (activeProjects as any[]).map((p: any) => p.id);

        // Which of these have submitted timesheets for prevWeek?
        const { data: submittedForManagers } = await supabase
          .from("project_timesheet_submissions")
          .select("project_id")
          .in("project_id", activeProjectIds)
          .eq("week_start", prevWeekStart)
          .eq("status", "submitted");

        const submittedManagerSet = new Set((submittedForManagers ?? []).map((s: any) => s.project_id));
        const pendingProjects = (activeProjects as any[]).filter((p: any) => !submittedManagerSet.has(p.id));
        if (pendingProjects.length === 0) continue;

        // For each pending project, find members with hours lançadas but not submitted
        const managerMap = new Map<string, Array<{ name: string; project: string; hours: number }>>();

        for (const proj of pendingProjects) {
          // Get project members with hours in the prev week
          const { data: timesheetEntries } = await supabase
            .from("project_timesheets")
            .select("project_member_id, hours, project_members!inner(employee_id, employees!inner(nome))")
            .eq("project_id", proj.id)
            .gte("work_date", prevWeekStart)
            .lte("work_date", prevWeekEnd)
            .gt("hours", 0);

          if (!timesheetEntries || timesheetEntries.length === 0) continue;

          // Aggregate hours per employee
          const empHours = new Map<string, { name: string; hours: number }>();
          for (const entry of timesheetEntries as any[]) {
            const empId = entry.project_members?.employee_id;
            const empName = entry.project_members?.employees?.nome || "Funcionário";
            if (!empId) continue;
            const cur = empHours.get(empId) || { name: empName, hours: 0 };
            empHours.set(empId, { ...cur, hours: cur.hours + entry.hours });
          }

          const managerId = proj.manager_id;
          const existing = managerMap.get(managerId) || [];
          for (const { name, hours } of empHours.values()) {
            existing.push({ name, project: proj.name, hours });
          }
          managerMap.set(managerId, existing);
        }

        // Create one notification per manager
        for (const [managerId, entries] of managerMap) {
          if (entries.length === 0) continue;
          const n = entries.length;
          const uniqueNames = [...new Set(entries.map(e => e.name))];
          const messageLines = entries
            .map(e => `• ${e.name} — ${e.project} (${e.hours}h lançadas, não enviado)`)
            .join("\n");

          const { data: existingMgrNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("recipient_id", managerId)
            .eq("type", "timesheet_pending")
            .eq("is_resolved", false)
            .limit(1);

          const notifTitle = `${uniqueNames.length} funcionário(s) com timesheet pendente — semana ${mondayFormatted} a ${sundayFormatted}`;
          const notifMetadata = {
            week_start: prevWeekStart,
            week_end: prevWeekSunday.toISOString().split("T")[0],
            employees: entries.map(e => ({ name: e.name, project: e.project, hours: e.hours })),
          };

          if (existingMgrNotif && existingMgrNotif.length > 0) {
            await supabase
              .from("notifications")
              .update({
                created_at: new Date().toISOString(),
                title: notifTitle,
                message: messageLines,
                metadata: notifMetadata,
              })
              .eq("id", existingMgrNotif[0].id);
          } else {
            await supabase.from("notifications").insert({
              tenant_id: tenant.id,
              recipient_id: managerId,
              type: "timesheet_pending",
              category: "timesheet",
              priority: "high",
              action_type: "info",
              title: notifTitle,
              message: messageLines,
              metadata: notifMetadata,
              is_read: false,
              is_resolved: false,
            });
          }
        }
      } catch (mgrErr) {
        console.error(`Manager notification error for tenant ${tenant.id}:`, mgrErr);
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
