import { supabase } from '@/integrations/supabase/client';

export interface EmployeeVersionDB {
  id: string;
  employee_id: string;
  effective_from: string;
  effective_until: string | null;
  salario_mensal: number;
  salario_liquido: number;
  beneficios: number;
  encargos: number;
  fgts: number;
  inss_empresa: number;
  decimo_terceiro: number;
  ferias: number;
  pro_labore: number;
  jornada_mensal: number;
  tipo_contratacao: string;
  cargo: string;
  total_monthly_cost_estimated: number | null;
  created_at: string;
}

export interface CreateVersionInput {
  employeeId: string;
  effectiveFrom?: string;
  salarioMensal: number;
  salarioLiquido: number;
  beneficios: number;
  encargos: number;
  fgts: number;
  inssEmpresa: number;
  decimoTerceiro: number;
  ferias: number;
  proLabore: number;
  jornadaMensal: number;
  tipoContratacao: string;
  cargo: string;
  totalMonthlyCostEstimated?: number | null;
}

// Fields that trigger a new version when changed
const VERSIONED_FIELDS = [
  'salario_mensal',
  'salario_liquido', 
  'beneficios',
  'encargos',
  'fgts',
  'inss_empresa',
  'decimo_terceiro',
  'ferias',
  'pro_labore',
  'jornada_mensal',
  'tipo_contratacao',
  'cargo',
] as const;

export const employeeVersionService = {
  /**
   * Get all versions for an employee
   */
  async getVersions(employeeId: string): Promise<EmployeeVersionDB[]> {
    const { data, error } = await supabase
      .from('employee_versions')
      .select('*')
      .eq('employee_id', employeeId)
      .order('effective_from', { ascending: false });

    if (error) {
      console.error('Error fetching employee versions:', error);
      throw error;
    }

    return (data || []) as EmployeeVersionDB[];
  },

  /**
   * Get the current active version for an employee
   */
  async getCurrentVersion(employeeId: string): Promise<EmployeeVersionDB | null> {
    const { data, error } = await supabase
      .from('employee_versions')
      .select('*')
      .eq('employee_id', employeeId)
      .is('effective_until', null)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching current version:', error);
      throw error;
    }

    return data as EmployeeVersionDB | null;
  },

  /**
   * Get the version that was active at a specific date
   */
  async getVersionAtDate(employeeId: string, date: string): Promise<EmployeeVersionDB | null> {
    const { data, error } = await supabase
      .from('employee_versions')
      .select('*')
      .eq('employee_id', employeeId)
      .lte('effective_from', date)
      .or(`effective_until.is.null,effective_until.gt.${date}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching version at date:', error);
      throw error;
    }

    return data as EmployeeVersionDB | null;
  },

  /**
   * Create a new version (closes the current one if exists)
   */
  async createVersion(input: CreateVersionInput): Promise<EmployeeVersionDB> {
    const effectiveFrom = input.effectiveFrom || new Date().toISOString().split('T')[0];

    // First, close any current version
    await supabase
      .from('employee_versions')
      .update({ effective_until: effectiveFrom })
      .eq('employee_id', input.employeeId)
      .is('effective_until', null);

    // Create the new version
    const { data, error } = await supabase
      .from('employee_versions')
      .insert({
        employee_id: input.employeeId,
        effective_from: effectiveFrom,
        effective_until: null,
        salario_mensal: input.salarioMensal,
        salario_liquido: input.salarioLiquido,
        beneficios: input.beneficios,
        encargos: input.encargos,
        fgts: input.fgts,
        inss_empresa: input.inssEmpresa,
        decimo_terceiro: input.decimoTerceiro,
        ferias: input.ferias,
        pro_labore: input.proLabore,
        jornada_mensal: input.jornadaMensal,
        tipo_contratacao: input.tipoContratacao,
        cargo: input.cargo,
        total_monthly_cost_estimated: input.totalMonthlyCostEstimated ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating employee version:', error);
      throw error;
    }

    return data as EmployeeVersionDB;
  },

  /**
   * Check if an update contains changes to versioned fields
   */
  hasVersionedChanges(
    currentData: Record<string, unknown>,
    updates: Record<string, unknown>
  ): boolean {
    for (const field of VERSIONED_FIELDS) {
      if (updates[field] !== undefined && updates[field] !== currentData[field]) {
        return true;
      }
    }
    return false;
  },

  /**
   * Create initial version for a new employee
   */
  async createInitialVersion(
    employeeId: string,
    data: {
      salarioMensal: number;
      salarioLiquido: number;
      beneficios: number;
      encargos: number;
      fgts: number;
      inssEmpresa: number;
      decimoTerceiro: number;
      ferias: number;
      proLabore: number;
      jornadaMensal: number;
      tipoContratacao: string;
      cargo: string;
      dataAdmissao: string;
    }
  ): Promise<EmployeeVersionDB> {
    return this.createVersion({
      employeeId,
      effectiveFrom: data.dataAdmissao,
      salarioMensal: data.salarioMensal,
      salarioLiquido: data.salarioLiquido,
      beneficios: data.beneficios,
      encargos: data.encargos,
      fgts: data.fgts,
      inssEmpresa: data.inssEmpresa,
      decimoTerceiro: data.decimoTerceiro,
      ferias: data.ferias,
      proLabore: data.proLabore,
      jornadaMensal: data.jornadaMensal,
      tipoContratacao: data.tipoContratacao,
      cargo: data.cargo,
    });
  },
};
