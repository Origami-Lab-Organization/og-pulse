export type ContractType = 'SOCIO' | 'CLT' | 'PJ' | 'MENOR_APRENDIZ' | 'ESTAGIO';

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  SOCIO: 'Sócio',
  CLT: 'CLT',
  PJ: 'PJ',
  MENOR_APRENDIZ: 'Menor Aprendiz',
  ESTAGIO: 'Estagiário',
};

export type EmployeeStatus = 'ativo' | 'aguardando_confirmacao' | 'bloqueado' | 'arquivado';

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ativo: 'Ativo',
  aguardando_confirmacao: 'Aguardando',
  bloqueado: 'Bloqueado',
  arquivado: 'Arquivado',
};

export type SystemRole = 'admin' | 'manager' | 'user';

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente de Projetos',
  user: 'Usuário',
};

export const SYSTEM_ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  admin: 'Acesso total ao sistema, gerencia usuários e configurações',
  manager: 'Pode gerenciar projetos, não tem acesso a configurações',
  user: 'Acesso básico, apenas visualização e funções limitadas',
};

export interface Employee {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  cpf: string;
  dataAdmissao: string;
  isGerente: boolean;
  systemRole: SystemRole;
  status: 'ativo' | 'inativo' | 'aguardando_confirmacao';
  salarioMensal: number;
  beneficios: number;
  encargos: number;
  tipoContratacao: ContractType;
  jornadaMensal: number;
  salarioLiquido: number;
  fgts: number;
  inssEmpresa: number;
  decimoTerceiro: number;
  ferias: number;
  proLabore: number;
  dataNascimento?: string;
  fotoUrl?: string;
  custoHora?: number;
  tools?: EmployeeTool[];
  totalToolsCost?: number;
  benefits?: EmployeeBenefit[];
  totalBenefitsCost?: number;
}

export interface EmployeeTool {
  id: string;
  employee_id: string;
  name: string;
  description: string | null;
  monthly_cost: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeBenefit {
  id: string;
  employee_id: string;
  name: string;
  description: string | null;
  monthly_value: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeToolInput {
  employeeId: string;
  name: string;
  description?: string;
  monthlyCost: number;
}

export interface CreateEmployeeBenefitInput {
  employeeId: string;
  name: string;
  description?: string;
  monthlyValue: number;
}

export type EmployeeFormData = Omit<Employee, 'id' | 'tools' | 'totalToolsCost' | 'benefits' | 'totalBenefitsCost' | 'custoHora'>;

// CLT charge calculation helper
export const calculateCLTCharges = (salarioBruto: number) => {
  const fgts = salarioBruto * 0.08;
  const inssEmpresa = salarioBruto * 0.20;
  const decimoTerceiro = salarioBruto / 12;
  const ferias = (salarioBruto / 12) * 1.33;
  const totalEncargos = fgts + inssEmpresa + decimoTerceiro + ferias;
  
  return {
    fgts,
    inssEmpresa,
    decimoTerceiro,
    ferias,
    totalEncargos,
  };
};
