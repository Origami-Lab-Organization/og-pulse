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
  jornada_diaria: number;
  tipo_contratacao: string;
  cargo: string;
  total_monthly_cost_estimated: number | null;
  /** Null em versões criadas antes deste campo existir — cai para o cadastro atual nesse caso. */
  bolsa_auxilio: number | null;
  /** Congelado no fechamento da versão — null enquanto a versão está aberta (usa soma ao vivo nesse caso). */
  total_benefits_cost: number | null;
  /** Congelado no fechamento da versão — null enquanto a versão está aberta (usa soma ao vivo nesse caso). */
  total_tools_cost: number | null;
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
  jornadaDiaria: number;
  tipoContratacao: string;
  cargo: string;
  totalMonthlyCostEstimated?: number | null;
  bolsaAuxilio?: number | null;
  totalBenefitsCost?: number | null;
  totalToolsCost?: number | null;
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
   * Todas as versões de todos os colaboradores do tenant (RLS escopa via employees,
   * mesmo padrão de `usePayrollHistory.ts`) — usada pela Folha de Pagamento/Custo x
   * Hora para resolver o tipo de contratação/salário/jornada vigente em cada mês.
   */
  async getAllVersionsForTenant(): Promise<EmployeeVersionDB[]> {
    const { data, error } = await supabase
      .from('employee_versions')
      .select('*')
      .order('effective_from', { ascending: true });

    if (error) {
      console.error('Error fetching all employee versions:', error);
      throw error;
    }

    return (data || []) as EmployeeVersionDB[];
  },

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
   * Cria uma nova versão, encaixando-a na linha do tempo em `effectiveFrom` — não
   * necessariamente ao final. Fecha a versão cujo intervalo CONTÉM `effectiveFrom` (que pode
   * não ser "a versão aberta", se já existir uma futura agendada depois) e, se já houver uma
   * versão futura agendada para depois de `effectiveFrom`, a nova versão termina exatamente
   * onde aquela começa — evita sobrepor ou apagar um marco já agendado por um edit anterior.
   */
  async createVersion(input: CreateVersionInput): Promise<EmployeeVersionDB> {
    const effectiveFrom = input.effectiveFrom || new Date().toISOString().split('T')[0];

    await supabase
      .from('employee_versions')
      .update({ effective_until: effectiveFrom })
      .eq('employee_id', input.employeeId)
      .lte('effective_from', effectiveFrom)
      .or(`effective_until.is.null,effective_until.gt.${effectiveFrom}`);

    const { data: nextVersion } = await supabase
      .from('employee_versions')
      .select('effective_from')
      .eq('employee_id', input.employeeId)
      .gt('effective_from', effectiveFrom)
      .order('effective_from', { ascending: true })
      .limit(1)
      .maybeSingle();

    // Create the new version
    const { data, error } = await supabase
      .from('employee_versions')
      .insert({
        employee_id: input.employeeId,
        effective_from: effectiveFrom,
        effective_until: nextVersion?.effective_from ?? null,
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
        jornada_diaria: input.jornadaDiaria,
        tipo_contratacao: input.tipoContratacao,
        cargo: input.cargo,
        total_monthly_cost_estimated: input.totalMonthlyCostEstimated ?? null,
        bolsa_auxilio: input.bolsaAuxilio ?? null,
        total_benefits_cost: input.totalBenefitsCost ?? null,
        total_tools_cost: input.totalToolsCost ?? null,
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
