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
}

export type EmployeeFormData = Omit<Employee, 'id'>;
