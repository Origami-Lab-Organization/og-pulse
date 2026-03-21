import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Get ISO week start (Monday) for a given date */
function getISOWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

/** Get ISO week number */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Check if today is the last business day of the week for a given tenant.
 * Friday is default, but if Friday (or subsequent days going backwards) is a holiday,
 * check Thursday, Wednesday, etc.
 */
function isLastBusinessDayOfWeek(today: Date, holidayDates: Set<string>): boolean {
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) return false; // weekend

  const todayStr = today.toISOString().split("T")[0];

  // Find the last business day of the current week (Mon-Fri)
  const monday = new Date(today);
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(today.getDate() - diff);

  // Check from Friday back to Monday
  for (let offset = 4; offset >= 0; offset--) {
    const candidate = new Date(monday);
    candidate.setDate(monday.getDate() + offset);
    const candidateStr = candidate.toISOString().split("T")[0];
    if (!holidayDates.has(candidateStr)) {
      // This is the last business day
      return candidateStr === todayStr;
    }
  }

  return false;
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
    const isoWeek = getISOWeek(now);
    const isoYear = now.getFullYear();
    const weekStart = getISOWeekStart(now);

    // Calculate week end (Sunday)
    const weekEndDate = new Date(now);
    const dayOfWeek = weekEndDate.getDay();
    weekEndDate.setDate(weekEndDate.getDate() + (7 - (dayOfWeek === 0 ? 7 : dayOfWeek)));
    const weekEnd = weekEndDate.toISOString().split("T")[0];

    let totalReminders = 0;

    // Get all tenants
    const { data: tenants, error: tenantError } = await supabase
      .from("tenants")
      .select("id");
    if (tenantError) throw tenantError;

    for (const tenant of tenants ?? []) {
      // Get holidays for this week for this tenant
      const { data: holidays } = await supabase
        .from("holidays")
        .select("date")
        .eq("tenant_id", tenant.id)
        .gte("date", weekStart)
        .lte("date", weekEnd);

      const holidayDates = new Set((holidays ?? []).map((h: any) => h.date));

      // Check if today is the last business day of the week
      if (!isLastBusinessDayOfWeek(now, holidayDates)) continue;

      // Get active employees for this tenant
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
        // Idempotency: check if reminder already exists for this ISO week
        // We use the week_start date range to identify the same ISO week
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("recipient_id", emp.id)
          .eq("type", "timesheet_reminder")
          .gte("created_at", weekStart)
          .lte("created_at", weekEnd + "T23:59:59Z")
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Insert notification
        const weekStartFmt = weekStart.slice(8, 10) + "/" + weekStart.slice(5, 7);
        const weekEndFmt = weekEnd.slice(8, 10) + "/" + weekEnd.slice(5, 7);

        const { error: insertError } = await supabase
          .from("notifications")
          .insert({
            tenant_id: tenant.id,
            recipient_id: emp.id,
            type: "timesheet_reminder",
            category: "timesheet",
            priority: "normal",
            action_type: "navigate",
            action_url: "/my-timesheet",
            title: `Lançar timesheet — semana ${weekStartFmt} a ${weekEndFmt}`,
            message:
              "Lembre-se de lançar e enviar as horas trabalhadas desta semana em todos os seus projetos antes do final do dia.",
            metadata: { week_start: weekStart, week_end: weekEnd },
            is_read: false,
            is_resolved: false,
          });

        if (insertError) {
          console.error(`Error inserting notification for employee ${emp.id}:`, insertError);
          continue;
        }

        totalReminders++;
      }
    }

    return new Response(
      JSON.stringify({ reminders_sent: totalReminders }),
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
