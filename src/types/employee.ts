export interface Employee {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  cpf: string;
  dataAdmissao: string;
  isGerente: boolean;
  status: 'ativo' | 'inativo';
  salarioMensal: number;
  beneficios: number;
  encargos: number;
  custoHora?: number;
  tools?: EmployeeTool[];
  totalToolsCost?: number;
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

export interface CreateEmployeeToolInput {
  employeeId: string;
  name: string;
  description?: string;
  monthlyCost: number;
}

export type EmployeeFormData = Omit<Employee, 'id' | 'tools' | 'totalToolsCost'>;
