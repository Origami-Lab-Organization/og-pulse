import { supabase } from '@/integrations/supabase/client';
import { BudgetWithDetails } from '@/types/budget';

export interface BudgetVersionDB {
  id: string;
  budget_id: string;
  version_number: number;
  created_at: string;
  created_by: string | null;
  snapshot_data: BudgetVersionSnapshot;
  change_summary: string | null;
}

export interface BudgetVersionSnapshot {
  // General info
  title: string;
  status: string;
  start_date: string;
  valid_until: string | null;
  client_id: string | null;
  client_name: string | null;
  lead_name: string | null;
  lead_contact: string | null;
  notes: string | null;
  // Configuration
  duration_months: number;
  admin_expenses_percent: number;
  taxes_percent: number;
  commission_percent: number;
  net_margin_percent: number;
  discount_value: number;
  // Roles with months
  roles: {
    role_name: string;
    seniority: string;
    hourly_rate: number;
    months: { month_number: number; hours: number }[];
  }[];
  // Suppliers
  suppliers: {
    name: string;
    description: string | null;
    monthly_value: number;
  }[];
  // Materials
  materials: {
    description: string;
    value: number;
  }[];
  // Calculated totals
  subtotal: number;
  total_with_fees: number;
  final_total: number;
}

export interface BudgetVersionWithCreator extends BudgetVersionDB {
  creator?: {
    id: string;
    nome: string;
  } | null;
}

export interface VersionDiff {
  field: string;
  label: string;
  oldValue: string | number | null;
  newValue: string | number | null;
  type: 'added' | 'removed' | 'changed' | 'unchanged' | 'currency' | 'percent' | 'count';
}

export function compareSnapshots(
  older: BudgetVersionSnapshot,
  newer: BudgetVersionSnapshot
): VersionDiff[] {
  const diffs: VersionDiff[] = [];

  const textFields: { key: keyof BudgetVersionSnapshot; label: string }[] = [
    { key: 'title', label: 'Título' },
    { key: 'status', label: 'Status' },
    { key: 'client_name', label: 'Cliente' },
    { key: 'notes', label: 'Observações' },
  ];

  const currencyFields: { key: keyof BudgetVersionSnapshot; label: string }[] = [
    { key: 'discount_value', label: 'Desconto' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'total_with_fees', label: 'Total com Taxas' },
    { key: 'final_total', label: 'Total Final' },
  ];

  const percentFields: { key: keyof BudgetVersionSnapshot; label: string }[] = [
    { key: 'admin_expenses_percent', label: 'Despesas Admin (%)' },
    { key: 'taxes_percent', label: 'Impostos (%)' },
    { key: 'commission_percent', label: 'Comissão (%)' },
    { key: 'net_margin_percent', label: 'Margem Líquida (%)' },
  ];

  const countFields: { key: keyof BudgetVersionSnapshot; label: string }[] = [
    { key: 'duration_months', label: 'Duração (meses)' },
  ];

  for (const { key, label } of textFields) {
    const oldVal = older[key] as string | number | null;
    const newVal = newer[key] as string | number | null;
    if (oldVal !== newVal) diffs.push({ field: key, label, oldValue: oldVal, newValue: newVal, type: 'changed' });
  }
  for (const { key, label } of currencyFields) {
    const oldVal = older[key] as number | null;
    const newVal = newer[key] as number | null;
    if (oldVal !== newVal) diffs.push({ field: key, label, oldValue: oldVal, newValue: newVal, type: 'currency' });
  }
  for (const { key, label } of percentFields) {
    const oldVal = older[key] as number | null;
    const newVal = newer[key] as number | null;
    if (oldVal !== newVal) diffs.push({ field: key, label, oldValue: oldVal, newValue: newVal, type: 'percent' });
  }
  for (const { key, label } of countFields) {
    const oldVal = older[key] as number | null;
    const newVal = newer[key] as number | null;
    if (oldVal !== newVal) diffs.push({ field: key, label, oldValue: oldVal, newValue: newVal, type: 'count' });
  }

  if (older.roles.length !== newer.roles.length) {
    diffs.push({ field: 'roles', label: 'Papéis', oldValue: older.roles.length, newValue: newer.roles.length, type: 'count' });
  }
  if (older.suppliers.length !== newer.suppliers.length) {
    diffs.push({ field: 'suppliers', label: 'Fornecedores', oldValue: older.suppliers.length, newValue: newer.suppliers.length, type: 'count' });
  }
  if (older.materials.length !== newer.materials.length) {
    diffs.push({ field: 'materials', label: 'Materiais', oldValue: older.materials.length, newValue: newer.materials.length, type: 'count' });
  }

  return diffs;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (table: string) => supabase.from(table as any);

/**
 * Creates a snapshot of the current budget state
 */
function createSnapshot(budget: BudgetWithDetails): BudgetVersionSnapshot {
  return {
    title: budget.title,
    status: budget.status,
    start_date: budget.start_date,
    valid_until: budget.valid_until,
    client_id: budget.client_id,
    client_name: budget.client?.company_name || null,
    lead_name: budget.lead_name,
    lead_contact: budget.lead_contact,
    notes: budget.notes,
    duration_months: budget.duration_months,
    admin_expenses_percent: budget.admin_expenses_percent,
    taxes_percent: budget.taxes_percent,
    commission_percent: budget.commission_percent,
    net_margin_percent: (budget as any).net_margin_percent ?? 0,
    discount_value: (budget as any).discount_value ?? 0,
    roles: budget.roles.map((role) => ({
      role_name: role.role_name,
      seniority: role.seniority,
      hourly_rate: role.hourly_rate,
      months: role.months.map((m) => ({
        month_number: m.month_number,
        hours: m.hours,
      })),
    })),
    suppliers: (budget.suppliers || []).map((s) => ({
      name: s.name,
      description: s.description,
      monthly_value: s.monthly_value,
    })),
    materials: (budget.materials || []).map((m) => ({
      description: m.description,
      value: m.value,
    })),
    subtotal: budget.subtotal,
    total_with_fees: budget.total_with_fees,
    final_total: budget.final_total,
  };
}

export const budgetVersionService = {
  /**
   * Get all versions for a budget, ordered by version number descending
   */
  async getByBudgetId(budgetId: string): Promise<BudgetVersionWithCreator[]> {
    const { data, error } = await fromTable('budget_versions')
      .select(`
        *,
        creator:employees!budget_versions_created_by_fkey(id, nome)
      `)
      .eq('budget_id', budgetId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error fetching budget versions:', error);
      throw error;
    }

    return data as unknown as BudgetVersionWithCreator[];
  },

  /**
   * Get the latest version number for a budget
   */
  async getLatestVersionNumber(budgetId: string): Promise<number> {
    const { data, error } = await fromTable('budget_versions')
      .select('version_number')
      .eq('budget_id', budgetId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest version number:', error);
      throw error;
    }

    const result = data as unknown as { version_number: number } | null;
    return result?.version_number ?? 0;
  },

  /**
   * Create a new version snapshot for a budget
   */
  async createVersion(
    budget: BudgetWithDetails,
    createdBy: string | null
  ): Promise<BudgetVersionDB> {
    // Get the next version number
    const latestVersion = await this.getLatestVersionNumber(budget.id);
    const newVersionNumber = latestVersion + 1;

    // Create the snapshot
    const snapshot = createSnapshot(budget);

    const { data, error } = await fromTable('budget_versions')
      .insert({
        budget_id: budget.id,
        version_number: newVersionNumber,
        created_by: createdBy,
        snapshot_data: snapshot,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating budget version:', error);
      throw error;
    }

    return data as unknown as BudgetVersionDB;
  },

  /**
   * Get a specific version by ID
   */
  async getById(versionId: string): Promise<BudgetVersionWithCreator | null> {
    const { data, error } = await fromTable('budget_versions')
      .select(`
        *,
        creator:employees!budget_versions_created_by_fkey(id, nome)
      `)
      .eq('id', versionId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching budget version:', error);
      throw error;
    }

    return data as unknown as BudgetVersionWithCreator | null;
  },
};
