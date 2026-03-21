import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}

function buildMessage(firstName: string, body: string): string {
  return `Olá, ${firstName}!\n\n${body}\n\nAtenciosamente,\nPulse`;
}

/** Returns ISO date strings for Monday and Friday of the current week. */
function getCurrentWeekRange(): { weekStart: string; weekEnd: string } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return {
    weekStart: monday.toISOString().split("T")[0],
    weekEnd: friday.toISOString().split("T")[0],
  };
}

/** Builds a human-readable list from names, e.g. "Ana, Bruno e mais 2". */
function formatNameList(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names[0]}, ${names[1]} e mais ${names.length - 2}`;
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

    const { weekStart, weekEnd } = getCurrentWeekRange();

    // 1. Fetch tenants with manager alerts enabled
    const { data: settings, error: settingsError } = await supabase
      .from("timesheet_reminder_settings")
      .select("tenant_id")
      .eq("manager_alert_enabled", true);

    if (settingsError) throw settingsError;

    let tenantsProcessed = 0;
    let alertsSent = 0;
    let employeesPending = 0;

    for (const { tenant_id } of settings ?? []) {
      tenantsProcessed++;

      // 2b. Fetch active projects with manager info
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, manager_id")
        .eq("tenant_id", tenant_id)
        .not("portfolio_stage", "in", '("planning","completed")');

      if (projectsError) {
        console.error(`Error fetching projects for tenant ${tenant_id}:`, projectsError);
        continue;
      }

      if (!projects || projects.length === 0) continue;

      // 2h. Deduplication: skip managers who already got an alert this week
      const { data: existingAlerts, error: alertsError } = await supabase
        .from("notifications")
        .select("recipient_id")
        .eq("tenant_id", tenant_id)
        .eq("type", "timesheet_manager_alert")
        .gte("created_at", weekStart);

      if (alertsError) {
        console.error(`Error checking existing alerts for tenant ${tenant_id}:`, alertsError);
        continue;
      }

      const alertedManagerIds = new Set((existingAlerts ?? []).map((a: any) => a.recipient_id));

      // Map: manager_id → project pendencies
      const managerPendencies = new Map<
        string,
        Array<{ projectId: string; projectName: string; pendingEmployees: Array<{ id: string; nome: string }> }>
      >();

      for (const project of projects) {
        // 2c. Fetch active project members with employee info
        const { data: members, error: membersError } = await supabase
          .from("project_members")
          .select("id, employee_id, employees!inner(id, nome, status)")
          .eq("project_id", project.id)
          .eq("employees.status", "ativo");

        if (membersError) {
          console.error(`Error fetching members for project ${project.id}:`, membersError);
          continue;
        }

        if (!members || members.length === 0) continue;

        const memberIds = members.map((m: any) => m.id);

        // 2d. Find which project_member_ids have locked timesheets this week
        const { data: lockedEntries, error: lockedError } = await supabase
          .from("project_timesheets")
          .select("project_member_id")
          .in("project_member_id", memberIds)
          .gte("work_date", weekStart)
          .lte("work_date", weekEnd)
          .eq("is_locked", true);

        if (lockedError) {
          console.error(`Error fetching timesheets for project ${project.id}:`, lockedError);
          continue;
        }

        const lockedMemberIds = new Set((lockedEntries ?? []).map((e: any) => e.project_member_id));

        // 2e. Collect pending employees (no locked entries this week)
        const pendingEmployees = members
          .filter((m: any) => !lockedMemberIds.has(m.id))
          .map((m: any) => ({ id: m.employee_id, nome: m.employees.nome }));

        if (pendingEmployees.length === 0) continue;

        employeesPending += pendingEmployees.length;

        // Group by manager
        const managerId = project.manager_id;
        if (!managerPendencies.has(managerId)) {
          managerPendencies.set(managerId, []);
        }
        managerPendencies.get(managerId)!.push({
          projectId: project.id,
          projectName: project.name,
          pendingEmployees,
        });
      }

      // Fetch manager names for greeting
      const allManagerIds = Array.from(managerPendencies.keys());
      const { data: mgrNameData } = await supabase
        .from("employees")
        .select("id, nome")
        .in("id", allManagerIds);
      const mgrNamesMap = new Map((mgrNameData ?? []).map((m: any) => [m.id, m.nome as string]));

      // 2f. Send one notification per project per manager
      for (const [managerId, projectPendencies] of managerPendencies) {
        if (alertedManagerIds.has(managerId)) continue;

        const mgrFirstName = getFirstName(mgrNamesMap.get(managerId) ?? "");

        for (const { projectId, projectName, pendingEmployees } of projectPendencies) {
          const count = pendingEmployees.length;
          const nameList = formatNameList(pendingEmployees.map((e) => e.nome));

          const title =
            count === 1
              ? `${pendingEmployees[0].nome} não lançou horas`
              : `${count} funcionários com horas pendentes`;

          const bodyText =
            count === 1
              ? `${pendingEmployees[0].nome} ainda não enviou as horas trabalhadas no projeto ${projectName} nesta semana.\n\nPor favor, entre em contato para garantir que o timesheet seja enviado em dia.`
              : `Os seguintes colaboradores ainda não enviaram as horas trabalhadas no projeto ${projectName} nesta semana: ${nameList}.\n\nPor favor, entre em contato com eles para garantir que os timesheets sejam enviados em dia.`;

          const message = buildMessage(mgrFirstName, bodyText);

          const referenceId = count === 1 ? pendingEmployees[0].id : projectId;

          const { error: insertError } = await supabase
            .from("notifications")
            .insert({
              tenant_id,
              recipient_id: managerId,
              type: "timesheet_manager_alert",
              title,
              message,
              reference_id: referenceId,
            });

          if (insertError) {
            console.error(`Error inserting alert for manager ${managerId}:`, insertError);
            continue;
          }

          alertsSent++;
        }

        // Mark this manager as alerted so we don't double-send within the same run
        alertedManagerIds.add(managerId);
      }
    }

    return new Response(
      JSON.stringify({
        tenants_processed: tenantsProcessed,
        alerts_sent: alertsSent,
        employees_pending: employeesPending,
      }),
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
