import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { todayLocalDateString } from '@/lib/formatters';

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
  /**
   * Dados pessoais (aba "Dados") — sem efeito em nenhum cálculo de folha, servem só para o
   * histórico da aba Histórico. Null em versões criadas antes destes campos existirem.
   */
  nome: string | null;
  telefone: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  data_admissao: string | null;
  foto_url: string | null;
  system_role: string | null;
  is_gerente: boolean | null;
  pix_key_type: string | null;
  pix_key: string | null;
  bank_name: string | null;
  bank_account_type: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  /** Congelado por versão (Sócio/PJ) — mesmo tratamento de bolsa_auxilio, mas para dividendos/contrato PJ. */
  valor_contrato_pj: number | null;
  dividendos: number | null;
  /** Campos derivados — sem efeito em nenhum cálculo histórico, só snapshot para a aba Histórico. */
  total_annual_cost_estimated: number | null;
  breakdown_json: Json | null;
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
  nome?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  dataNascimento?: string | null;
  dataAdmissao?: string | null;
  fotoUrl?: string | null;
  systemRole?: string | null;
  isGerente?: boolean | null;
  pixKeyType?: string | null;
  pixKey?: string | null;
  bankName?: string | null;
  bankAccountType?: string | null;
  bankAgency?: string | null;
  bankAccount?: string | null;
  valorContratoPj?: number | null;
  dividendos?: number | null;
  totalAnnualCostEstimated?: number | null;
  breakdownJson?: Json | null;
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
      .order('effective_from', { ascending: true })
      .order('created_at', { ascending: true });

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
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching employee versions:', error);
      throw error;
    }

    return (data || []) as EmployeeVersionDB[];
  },

  /**
   * Versão vigente hoje — delega para `getVersionAtDate` (interval-contém-a-data), não
   * "a versão aberta": um marco futuro encadeado fecha a versão vigente sem deixá-la
   * aberta, então `effective_until IS NULL` sozinho pode apontar para uma versão que
   * ainda não começou (mesma causa do bug corrigido em activate_scheduled_employee_versions).
   */
  async getCurrentVersion(employeeId: string): Promise<EmployeeVersionDB | null> {
    return this.getVersionAtDate(employeeId, todayLocalDateString());
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
    const effectiveFrom = input.effectiveFrom || todayLocalDateString();

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
        nome: input.nome ?? null,
        telefone: input.telefone ?? null,
        cpf: input.cpf ?? null,
        data_nascimento: input.dataNascimento ?? null,
        data_admissao: input.dataAdmissao ?? null,
        foto_url: input.fotoUrl ?? null,
        system_role: input.systemRole ?? null,
        is_gerente: input.isGerente ?? null,
        pix_key_type: input.pixKeyType ?? null,
        pix_key: input.pixKey ?? null,
        bank_name: input.bankName ?? null,
        bank_account_type: input.bankAccountType ?? null,
        bank_agency: input.bankAgency ?? null,
        bank_account: input.bankAccount ?? null,
        valor_contrato_pj: input.valorContratoPj ?? null,
        dividendos: input.dividendos ?? null,
        total_annual_cost_estimated: input.totalAnnualCostEstimated ?? null,
        breakdown_json: input.breakdownJson ?? null,
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
   * Cancela um marco financeiro agendado para o futuro que ainda não entrou em vigor.
   * Roda inteiro dentro de `cancel_scheduled_employee_version` (Postgres, SECURITY
   * INVOKER) — não orquestrado em passos separados aqui — para: (1) evitar uma condição
   * de corrida onde outro admin criando uma versão concorrente para o mesmo colaborador
   * corromperia a linha do tempo (o UPDATE de extensão usaria um `effective_until` já
   * desatualizado, lido antes); (2) recusar explicitamente (erro, não sucesso silencioso)
   * quando o RLS bloqueia a operação — ex.: um gerente (que enxerga a aba Histórico, mas
   * não tem permissão de UPDATE/DELETE em employee_versions) clicando em "Cancelar" antes
   * via passos separados em JS recebia um "sucesso" mesmo sem nada ser alterado, porque
   * Supabase/PostgREST não trata UPDATE/DELETE filtrado pelo RLS como erro.
   */
  async cancelScheduledVersion(versionId: string): Promise<void> {
    const { error } = await (supabase.rpc as any)('cancel_scheduled_employee_version', {
      p_version_id: versionId,
      p_today: todayLocalDateString(),
    });

    if (error) {
      console.error('Error cancelling scheduled version:', error);
      throw new Error(error.message);
    }
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
   * Cria a versão de abertura de um colaborador recém-cadastrado, capturando o estado
   * completo (dados, contratação, benefícios/ferramentas ainda somam ao vivo — ver
   * total_benefits_cost/total_tools_cost abaixo) já em `data_admissao`, para que a aba
   * Histórico nunca comece vazia e nenhuma edição futura precise "adivinhar" o estado
   * inicial (bootstrap lazy em employeeService.ts continua existindo como rede de
   * segurança para colaboradores cadastrados antes desta versão inicial existir).
   */
  async createInitialVersion(employeeId: string, employee: EmployeeDBLike): Promise<EmployeeVersionDB> {
    return this.createVersion({
      employeeId,
      effectiveFrom: employee.data_admissao,
      salarioMensal: Number(employee.salario_mensal),
      salarioLiquido: Number(employee.salario_liquido),
      beneficios: Number(employee.beneficios),
      encargos: Number(employee.encargos),
      fgts: Number(employee.fgts),
      inssEmpresa: Number(employee.inss_empresa),
      decimoTerceiro: Number(employee.decimo_terceiro),
      ferias: Number(employee.ferias),
      proLabore: Number(employee.pro_labore),
      jornadaMensal: Number(employee.jornada_mensal),
      jornadaDiaria: Number(employee.jornada_diaria),
      tipoContratacao: employee.tipo_contratacao,
      cargo: employee.cargo,
      totalMonthlyCostEstimated: employee.total_monthly_cost_estimated,
      bolsaAuxilio: Number(employee.bolsa_auxilio),
      nome: employee.nome,
      telefone: employee.telefone,
      cpf: employee.cpf,
      dataNascimento: employee.data_nascimento,
      dataAdmissao: employee.data_admissao,
      fotoUrl: employee.foto_url,
      systemRole: employee.system_role,
      isGerente: employee.is_gerente,
      pixKeyType: employee.pix_key_type,
      pixKey: employee.pix_key,
      bankName: employee.bank_name,
      bankAccountType: employee.bank_account_type,
      bankAgency: employee.bank_agency,
      bankAccount: employee.bank_account,
      valorContratoPj: Number(employee.valor_contrato_pj),
      dividendos: Number(employee.dividendos),
      totalAnnualCostEstimated: employee.total_annual_cost_estimated,
      breakdownJson: employee.breakdown_json,
      // total_benefits_cost/total_tools_cost ficam de fora -> null (versão aberta, soma ao vivo,
      // que no momento da criação já reflete os benefícios/ferramentas recém-cadastrados).
    });
  },
};

/**
 * Subconjunto de EmployeeDB usado por createInitialVersion — declarado aqui (em vez de
 * importar EmployeeDB de employeeService.ts) para não criar import circular entre os dois
 * services.
 */
interface EmployeeDBLike {
  nome: string;
  telefone: string;
  cpf: string;
  data_admissao: string;
  is_gerente: boolean;
  system_role: string;
  salario_mensal: number;
  salario_liquido: number;
  beneficios: number;
  encargos: number;
  tipo_contratacao: string;
  jornada_mensal: number;
  jornada_diaria: number;
  fgts: number;
  inss_empresa: number;
  decimo_terceiro: number;
  ferias: number;
  pro_labore: number;
  bolsa_auxilio: number;
  valor_contrato_pj: number;
  dividendos: number;
  total_monthly_cost_estimated: number;
  total_annual_cost_estimated: number | null;
  breakdown_json: Json | null;
  data_nascimento: string | null;
  foto_url: string | null;
  pix_key_type: string | null;
  pix_key: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_account_type: string | null;
  cargo: string;
}
