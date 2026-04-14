import { supabase } from '@/integrations/supabase/client';
import { addMonths, startOfMonth, parseISO, getYear } from 'date-fns';

const REPORT_YEAR = 2026;

export interface ProjectCostSummary {
  projectId: string;
  laborPlanned: number;
  laborActual: number;
  supplierPlanned: number;
  supplierActual: number;
  materialPlanned: number;
  materialActual: number;
  totalPlanned: number;
  totalActual: number;
}

/** Returns 1-indexed project month numbers whose calendar date falls in REPORT_YEAR */
function monthNumbersIn2026(startDate: string): number[] {
  const start = startOfMonth(parseISO(startDate));
  const result: number[] = [];
  for (let n = 1; n <= 240; n++) {
    const date = addMonths(start, n - 1);
    const yr = getYear(date);
    if (yr === REPORT_YEAR) result.push(n);
    if (yr > REPORT_YEAR) break;
  }
  return result;
}

/**
 * Fetches planned vs actual costs for a given set of projects, scoped to REPORT_YEAR.
 *
 * Planned costs:
 *   - Labor: project_member_months hours (or hours_per_month fallback) × hourly_rate
 *   - Supplier: project_suppliers.monthly_value for active months in 2026
 *   - Material: project_materials where is_realized = false and month maps to 2026
 *
 * Actual costs:
 *   - Labor: project_timesheets hours × member hourly_rate for work_dates in 2026
 *   - Supplier: project_supplier_actuals.value for months in 2026
 *   - Material: project_materials where is_realized = true and month maps to 2026
 */
export async function fetchProjectCosts2026(
  projects: { id: string; start_date: string }[]
): Promise<Map<string, ProjectCostSummary>> {
  const result = new Map<string, ProjectCostSummary>();
  if (projects.length === 0) return result;

  const projectIds = projects.map(p => p.id);
  const projectMap = new Map(projects.map(p => [p.id, p]));

  for (const p of projects) {
    result.set(p.id, {
      projectId: p.id,
      laborPlanned: 0,
      laborActual: 0,
      supplierPlanned: 0,
      supplierActual: 0,
      materialPlanned: 0,
      materialActual: 0,
      totalPlanned: 0,
      totalActual: 0,
    });
  }

  // Phase 1: fetch members to get their IDs for the member_months sub-query
  const { data: members } = await supabase
    .from('project_members')
    .select('id, project_id, hours_per_month, hourly_rate')
    .in('project_id', projectIds);

  const memberRows = (members || []) as {
    id: string;
    project_id: string;
    hours_per_month: number;
    hourly_rate: number;
  }[];
  const memberIds = memberRows.map(m => m.id);
  const memberMap = new Map(memberRows.map(m => [m.id, m]));

  // Phase 2: parallel fetches for the rest
  const [memberMonthsRes, timesheetsRes, suppliersRes, materialsRes] = await Promise.all([
    memberIds.length > 0
      ? supabase
          .from('project_member_months')
          .select('project_member_id, month_number, hours')
          .in('project_member_id', memberIds)
      : Promise.resolve({ data: [] }),

    supabase
      .from('project_timesheets')
      .select('project_id, project_member_id, hours, work_date')
      .in('project_id', projectIds)
      .gte('work_date', `${REPORT_YEAR}-01-01`)
      .lte('work_date', `${REPORT_YEAR}-12-31`),

    supabase
      .from('project_suppliers')
      .select('id, project_id, monthly_value, start_month, end_month, actuals:project_supplier_actuals(month_number, value)')
      .in('project_id', projectIds),

    supabase
      .from('project_materials')
      .select('project_id, value, is_realized, month_number')
      .in('project_id', projectIds),
  ]);

  const memberMonths = (memberMonthsRes.data || []) as {
    project_member_id: string;
    month_number: number;
    hours: number;
  }[];
  const timesheets = (timesheetsRes.data || []) as {
    project_id: string;
    project_member_id: string;
    hours: number;
    work_date: string;
  }[];
  const suppliers = (suppliersRes.data || []) as {
    id: string;
    project_id: string;
    monthly_value: number;
    start_month: number;
    end_month: number | null;
    actuals: { month_number: number; value: number }[];
  }[];
  const materials = (materialsRes.data || []) as {
    project_id: string;
    value: number;
    is_realized: boolean;
    month_number: number | null;
  }[];

  // Build member-months lookup: memberId → monthNumber → hours
  const mmMap = new Map<string, Map<number, number>>();
  for (const mm of memberMonths) {
    if (!mmMap.has(mm.project_member_id)) mmMap.set(mm.project_member_id, new Map());
    mmMap.get(mm.project_member_id)!.set(mm.month_number, Number(mm.hours));
  }

  // ── Planned Labor ──────────────────────────────────────────────────────────
  for (const member of memberRows) {
    const project = projectMap.get(member.project_id);
    if (!project) continue;

    const months2026 = monthNumbersIn2026(project.start_date);
    if (months2026.length === 0) continue;

    const overrides = mmMap.get(member.id);
    let laborCost = 0;

    for (const n of months2026) {
      const hours = overrides?.has(n) ? overrides.get(n)! : Number(member.hours_per_month);
      laborCost += hours * Number(member.hourly_rate);
    }

    const s = result.get(member.project_id)!;
    s.laborPlanned += laborCost;
  }

  // ── Actual Labor ───────────────────────────────────────────────────────────
  for (const ts of timesheets) {
    const member = memberMap.get(ts.project_member_id);
    const rate = member ? Number(member.hourly_rate) : 0;
    const s = result.get(ts.project_id);
    if (s) s.laborActual += Number(ts.hours) * rate;
  }

  // ── Planned & Actual Supplier Costs ────────────────────────────────────────
  for (const supplier of suppliers) {
    const project = projectMap.get(supplier.project_id);
    if (!project) continue;

    const months2026 = monthNumbersIn2026(project.start_date);
    if (months2026.length === 0) continue;

    const endMonth = supplier.end_month ?? 9999;
    const actualsMap = new Map(supplier.actuals.map(a => [a.month_number, Number(a.value)]));

    const s = result.get(supplier.project_id)!;

    for (const n of months2026) {
      if (n < Number(supplier.start_month) || n > endMonth) continue;

      // Planned: always the contract monthly_value
      s.supplierPlanned += Number(supplier.monthly_value);

      // Actual: use recorded actual if available, else 0 (not yet registered)
      if (actualsMap.has(n)) {
        s.supplierActual += actualsMap.get(n)!;
      }
    }
  }

  // ── Planned & Actual Material Costs ────────────────────────────────────────
  for (const mat of materials) {
    const project = projectMap.get(mat.project_id);
    if (!project || !mat.month_number) continue;

    const months2026 = monthNumbersIn2026(project.start_date);
    if (!months2026.includes(Number(mat.month_number))) continue;

    const s = result.get(mat.project_id)!;
    if (mat.is_realized) {
      s.materialActual += Number(mat.value);
    } else {
      s.materialPlanned += Number(mat.value);
    }
  }

  // ── Totals ─────────────────────────────────────────────────────────────────
  for (const s of result.values()) {
    s.totalPlanned = s.laborPlanned + s.supplierPlanned + s.materialPlanned;
    s.totalActual = s.laborActual + s.supplierActual + s.materialActual;
  }

  return result;
}
