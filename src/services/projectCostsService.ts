import { supabase } from '@/integrations/supabase/client';
import { addMonths, differenceInMonths } from 'date-fns';
import { resolveCostMonthIndex } from '@/lib/costRecognition';
import type { ProjectSupplierDB, ProjectMaterialDB } from '@/types/project';

/** Categorias de custo unificadas em project_costs (ADR-0003 / J9-01). */
export type ProjectCostCategory =
  | 'supplier'
  | 'subscription'
  | 'equipment_rental'
  | 'material'
  | 'travel'
  | 'reimbursement'
  | 'other';

/** Um custo realizado, já reconhecido no mês de calendário (0–11) do ano-alvo. */
export interface CategoryCostActual {
  project_id: string;
  category: ProjectCostCategory;
  monthIndex: number;
  value: number;
}

interface ProjectCostCategoryRow {
  project_id: string;
  category: ProjectCostCategory;
  is_recurring: boolean | null;
  cost_date: string | null;
  actual_amount: number | null;
  actual_amount_brl: number | null;
  planned_amount: number | null;
  planned_amount_brl: number | null;
  month_number: number | null;
  project: { start_date: string } | { start_date: string }[] | null;
  months: { month_number: number; actual_value: number | null; planned_value: number | null; invoice_date: string | null }[] | null;
}

export interface CategoryCostsByMonth {
  /** Já lançado (com data real / nota). */
  actuals: CategoryCostActual[];
  /** Ainda não lançado — atrasado (mês já passou) ou futuro. Nunca inclui o que já virou actual. */
  planned: CategoryCostActual[];
}

/**
 * Lê os custos de project_costs por categoria, separando REALIZADO (com data real / nota)
 * de PREVISTO (ainda sem actual_amount/actual_value lançado — atrasado ou futuro).
 * Reconhecimento: recorrente → project_cost_months (realizado pela data da nota, previsto
 * sempre pelo mês relativo ao projeto); avulso → cost_date (realizado) ou mês relativo
 * (previsto). Prefere o valor canônico em BRL quando disponível.
 *
 * Complementa fetchSuppliersWithActuals/fetchMaterials — passe apenas as categorias
 * ainda não agregadas (subscription/equipment_rental/travel/other) para evitar dupla
 * contagem de supplier/material, que os hooks já somam por outro caminho.
 */
export async function fetchProjectCostsRealizedByCategory(
  projectIds: string[],
  targetYear: number,
  categories?: ProjectCostCategory[],
): Promise<CategoryCostsByMonth> {
  if (projectIds.length === 0) return { actuals: [], planned: [] };

  let query = supabase
    .from('project_costs')
    .select(
      'project_id, category, is_recurring, cost_date, actual_amount, actual_amount_brl, planned_amount, planned_amount_brl, month_number, project:projects(start_date), months:project_cost_months(month_number, actual_value, planned_value, invoice_date)',
    )
    .is('deleted_at', null)
    .in('project_id', projectIds);
  if (categories && categories.length > 0) query = query.in('category', categories);

  const { data } = await query;
  const rows = (data ?? []) as unknown as ProjectCostCategoryRow[];
  const actuals: CategoryCostActual[] = [];
  const planned: CategoryCostActual[] = [];

  for (const row of rows) {
    const project = Array.isArray(row.project) ? row.project[0] : row.project;
    const projectStartDate = project?.start_date;

    if (row.is_recurring) {
      for (const m of row.months ?? []) {
        if (m.actual_value != null) {
          const idx = resolveCostMonthIndex({
            realDate: m.invoice_date,
            projectStartDate: projectStartDate ?? '',
            monthNumber: m.month_number,
            targetYear,
          });
          if (idx != null) actuals.push({ project_id: row.project_id, category: row.category, monthIndex: idx, value: Number(m.actual_value) });
        } else if (m.planned_value != null) {
          const idx = resolveCostMonthIndex({
            projectStartDate: projectStartDate ?? '',
            monthNumber: m.month_number,
            targetYear,
          });
          if (idx != null) planned.push({ project_id: row.project_id, category: row.category, monthIndex: idx, value: Number(m.planned_value) });
        }
      }
      continue;
    }

    const actual = row.actual_amount_brl ?? row.actual_amount;
    if (actual != null) {
      const idx = resolveCostMonthIndex({
        realDate: row.cost_date,
        projectStartDate: projectStartDate ?? '',
        monthNumber: row.month_number ?? 1,
        targetYear,
      });
      if (idx != null) actuals.push({ project_id: row.project_id, category: row.category, monthIndex: idx, value: Number(actual) });
      continue;
    }

    const plannedVal = row.planned_amount_brl ?? row.planned_amount;
    if (plannedVal == null) continue;
    const idx = resolveCostMonthIndex({
      projectStartDate: projectStartDate ?? '',
      monthNumber: row.month_number ?? 1,
      targetYear,
    });
    if (idx != null) planned.push({ project_id: row.project_id, category: row.category, monthIndex: idx, value: Number(plannedVal) });
  }

  return { actuals, planned };
}

/**
 * projectCostsService — ÚNICA porta de leitura dos custos extra-labor do projeto.
 *
 * Fonte de verdade (J9-02 Fase B.2): tabelas unificadas `project_costs` +
 * `project_cost_months`. As tabelas legadas (project_suppliers/_months/_actuals,
 * project_materials) não são mais lidas — ficam apenas como backup pós-migração.
 *
 * Cada função pública mantém EXATAMENTE o shape que o consumidor já esperava na
 * Fase A, então nenhum dos 6 consumidores precisou mudar. A transformação
 * legado→unificado vive só aqui.
 */

// ── Shapes de leitura (estáveis, herdados da Fase A) ──────────────────────────
export interface SupplierMonthValue {
  month_number: number;
  value: number;
}

export interface SupplierWithActuals {
  id: string;
  project_id: string;
  actuals: SupplierMonthValue[];
}

export interface SupplierWithActualsAndPlanned extends SupplierWithActuals {
  plannedMonths: SupplierMonthValue[];
}

export interface SupplierForReport extends SupplierWithActuals {
  monthly_value: number;
  start_month: number;
  end_month: number | null;
}

export interface SupplierRef {
  id: string;
  project_id: string;
}

export interface SupplierActualRef {
  project_supplier_id: string;
  month_number: number;
  value: number;
}

export interface MaterialCostRecord {
  project_id: string;
  month_number: number | null;
  value: number;
  is_realized: boolean;
}

/** Mês relativo do projeto (1-based) → data de calendário. */
export function projectMonthToDate(projectStartDate: string, monthNumber: number): Date {
  return addMonths(new Date(projectStartDate), monthNumber - 1);
}

/** Data de calendário → mês relativo do projeto (1-based). Inverso de projectMonthToDate. */
function dateToProjectMonth(projectStartDate: string, costDate: string): number {
  return differenceInMonths(new Date(costDate), new Date(projectStartDate)) + 1;
}

// ── Linha bruta de custo de fornecedor vinda da fonte unificada ───────────────
interface SupplierCostRow {
  id: string;
  project_id: string;
  is_recurring: boolean;
  cost_date: string | null;
  planned_amount: number;
  actual_amount: number | null;
  monthly_amount: number | null;
  start_month: number | null;
  end_month: number | null;
  project: { start_date: string } | null;
  months: { month_number: number; planned_value: number | null; actual_value: number | null }[] | null;
}

const SUPPLIER_SELECT =
  'id, project_id, is_recurring, cost_date, planned_amount, actual_amount, monthly_amount, start_month, end_month, project:projects(start_date), months:project_cost_months(month_number, planned_value, actual_value)';

/** Realizados por mês de um custo de fornecedor (recorrente: via meses; avulso: mês derivado da data). */
function supplierActuals(row: SupplierCostRow): SupplierMonthValue[] {
  if (row.is_recurring) {
    return (row.months ?? [])
      .filter((m) => m.actual_value != null)
      .map((m) => ({ month_number: m.month_number, value: Number(m.actual_value) }));
  }
  if (row.actual_amount == null || !row.cost_date || !row.project?.start_date) return [];
  return [{ month_number: dateToProjectMonth(row.project.start_date, row.cost_date), value: Number(row.actual_amount) }];
}

/** Ainda não realizados por mês de um custo de fornecedor (saldo em aberto: atrasado ou futuro). */
function supplierPlanned(row: SupplierCostRow): SupplierMonthValue[] {
  if (row.is_recurring) {
    return (row.months ?? [])
      .filter((m) => m.planned_value != null && m.actual_value == null)
      .map((m) => ({ month_number: m.month_number, value: Number(m.planned_value) }));
  }
  if (row.actual_amount != null || !row.cost_date || !row.project?.start_date) return [];
  return [{ month_number: dateToProjectMonth(row.project.start_date, row.cost_date), value: Number(row.planned_amount) }];
}

async function fetchSupplierCostRows(projectIds: string[]): Promise<SupplierCostRow[]> {
  if (projectIds.length === 0) return [];
  const { data } = await supabase
    .from('project_costs')
    .select(SUPPLIER_SELECT)
    .eq('category', 'supplier')
    .is('deleted_at', null)
    .in('project_id', projectIds);
  return (data ?? []) as unknown as SupplierCostRow[];
}

// ── Fornecedores ──────────────────────────────────────────────────────────────

export async function fetchSuppliersWithActuals(projectIds: string[]): Promise<SupplierWithActuals[]> {
  const rows = await fetchSupplierCostRows(projectIds);
  return rows.map((r) => ({ id: r.id, project_id: r.project_id, actuals: supplierActuals(r) }));
}

export async function fetchSuppliersWithActualsAndPlanned(
  projectIds: string[],
): Promise<SupplierWithActualsAndPlanned[]> {
  const rows = await fetchSupplierCostRows(projectIds);
  return rows.map((r) => ({
    id: r.id,
    project_id: r.project_id,
    actuals: supplierActuals(r),
    plannedMonths: supplierPlanned(r),
  }));
}

export async function fetchSuppliersForReport(projectIds: string[]): Promise<SupplierForReport[]> {
  const rows = await fetchSupplierCostRows(projectIds);
  return rows.map((r) => ({
    id: r.id,
    project_id: r.project_id,
    monthly_value: Number(r.monthly_amount ?? 0),
    start_month: r.start_month ?? 1,
    end_month: r.end_month,
    actuals: supplierActuals(r),
  }));
}

export async function fetchSupplierRefs(projectIds: string[]): Promise<SupplierRef[]> {
  const rows = await fetchSupplierCostRows(projectIds);
  return rows.map((r) => ({ id: r.id, project_id: r.project_id }));
}

/** Todos os realizados de fornecedor visíveis (escopo via RLS), achatados por mês. */
export async function fetchAllSupplierActuals(): Promise<SupplierActualRef[]> {
  const { data } = await supabase
    .from('project_costs')
    .select(SUPPLIER_SELECT)
    .eq('category', 'supplier')
    .is('deleted_at', null);
  const rows = (data ?? []) as unknown as SupplierCostRow[];
  return rows.flatMap((r) =>
    supplierActuals(r).map((a) => ({ project_supplier_id: r.id, month_number: a.month_number, value: a.value })),
  );
}

/** Linhas de fornecedor de um projeto no shape legado (ProjectSupplierDB), reconstruídas da fonte unificada. */
export async function fetchProjectSuppliersRaw(projectId: string): Promise<ProjectSupplierDB[]> {
  const { data } = await supabase
    .from('project_costs')
    .select(
      'id, project_id, supplier_id, budget_supplier_id, description, notes, monthly_amount, start_month, end_month, created_at',
    )
    .eq('category', 'supplier')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    project_id: r.project_id as string,
    supplier_id: (r.supplier_id as string) ?? null,
    budget_supplier_id: (r.budget_supplier_id as string) ?? null,
    name: (r.description as string) ?? '',
    description: (r.notes as string) ?? null,
    monthly_value: Number(r.monthly_amount ?? 0),
    start_month: (r.start_month as number) ?? 1,
    end_month: (r.end_month as number) ?? null,
    created_at: r.created_at as string,
  }));
}

// ── Materiais ───────────────────────────────────────────────────────────────

export async function fetchMaterials(
  projectIds: string[],
  options: { realizedOnly?: boolean } = {},
): Promise<MaterialCostRecord[]> {
  if (projectIds.length === 0) return [];
  let query = supabase
    .from('project_costs')
    .select('project_id, month_number, cost_date, planned_amount, actual_amount, project:projects(start_date)')
    .eq('category', 'material')
    .is('deleted_at', null)
    .in('project_id', projectIds);
  if (options.realizedOnly) {
    query = query.not('actual_amount', 'is', null);
  }
  const { data } = await query;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const project = r.project as { start_date: string } | null;
    const stored = r.month_number as number | null;
    const costDate = r.cost_date as string | null;
    const monthNumber =
      stored ?? (costDate && project?.start_date ? dateToProjectMonth(project.start_date, costDate) : null);
    return {
      project_id: r.project_id as string,
      month_number: monthNumber,
      value: Number(r.planned_amount ?? 0),
      is_realized: r.actual_amount != null,
    };
  });
}

/** Linhas de material de um projeto no shape legado (ProjectMaterialDB), reconstruídas da fonte unificada. */
export async function fetchProjectMaterialsRaw(projectId: string): Promise<ProjectMaterialDB[]> {
  const { data } = await supabase
    .from('project_costs')
    .select('id, project_id, description, planned_amount, actual_amount, cost_date, month_number, created_at')
    .eq('category', 'material')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    project_id: r.project_id as string,
    description: (r.description as string) ?? '',
    value: Number(r.planned_amount ?? 0),
    purchase_date: (r.cost_date as string) ?? null,
    is_realized: r.actual_amount != null,
    month_number: (r.month_number as number) ?? 1,
    created_at: r.created_at as string,
  }));
}
