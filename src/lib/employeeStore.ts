import { Employee, EmployeeFormData } from '@/types/employee';

// Simulated in-memory store for MVP (deprecated - using Supabase instead)
let employees: Employee[] = [
  {
    id: '1',
    nome: 'Ana Silva',
    email: 'ana.silva@origamilab.com',
    telefone: '(11) 99999-1234',
    cargo: 'Desenvolvedora Senior',
    cpf: '123.456.789-00',
    dataAdmissao: '2022-03-15',
    isGerente: false,
    systemRole: 'user',
    status: 'ativo',
    salarioMensal: 12000,
    beneficios: 1500,
    encargos: 4800,
    tipoContratacao: 'CLT',
    jornadaMensal: 176,
    jornadaDiaria: 8,
    salarioLiquido: 9000,
    fgts: 960,
    inssEmpresa: 2400,
    decimoTerceiro: 1000,
    ferias: 1333,
    proLabore: 0,
  },
  {
    id: '2',
    nome: 'Carlos Mendes',
    email: 'carlos.mendes@origamilab.com',
    telefone: '(11) 98888-5678',
    cargo: 'Gerente de Projetos',
    cpf: '987.654.321-00',
    dataAdmissao: '2021-01-10',
    isGerente: true,
    systemRole: 'admin',
    status: 'ativo',
    salarioMensal: 18000,
    beneficios: 2000,
    encargos: 7200,
    tipoContratacao: 'CLT',
    jornadaMensal: 176,
    jornadaDiaria: 8,
    salarioLiquido: 13500,
    fgts: 1440,
    inssEmpresa: 3600,
    decimoTerceiro: 1500,
    ferias: 2000,
    proLabore: 0,
  },
  {
    id: '3',
    nome: 'Marina Costa',
    email: 'marina.costa@origamilab.com',
    telefone: '(11) 97777-9012',
    cargo: 'Designer UX/UI',
    cpf: '456.789.123-00',
    dataAdmissao: '2023-06-20',
    isGerente: false,
    systemRole: 'user',
    status: 'ativo',
    salarioMensal: 9000,
    beneficios: 1200,
    encargos: 3600,
    tipoContratacao: 'CLT',
    jornadaMensal: 176,
    jornadaDiaria: 8,
    salarioLiquido: 6750,
    fgts: 720,
    inssEmpresa: 1800,
    decimoTerceiro: 750,
    ferias: 1000,
    proLabore: 0,
  },
];

export const getEmployees = (): Employee[] => {
  return [...employees];
};

export const getEmployeeById = (id: string): Employee | undefined => {
  return employees.find((e) => e.id === id);
};

export const createEmployee = (data: EmployeeFormData): Employee => {
  const newEmployee: Employee = {
    ...data,
    id: Date.now().toString(),
  };
  employees = [...employees, newEmployee];
  console.log('[LOG] Employee created:', newEmployee.nome);
  return newEmployee;
};

export const updateEmployee = (id: string, data: Partial<EmployeeFormData>): Employee | null => {
  const index = employees.findIndex((e) => e.id === id);
  if (index === -1) return null;
  
  employees[index] = { ...employees[index], ...data };
  console.log('[LOG] Employee updated:', employees[index].nome);
  return employees[index];
};

export const deleteEmployee = (id: string): boolean => {
  const index = employees.findIndex((e) => e.id === id);
  if (index === -1) return false;
  
  const deleted = employees[index];
  employees = employees.filter((e) => e.id !== id);
  console.log('[LOG] Employee deleted:', deleted.nome);
  return true;
};

export const searchEmployees = (query: string): Employee[] => {
  const lowerQuery = query.toLowerCase();
  return employees.filter(
    (e) =>
      e.nome.toLowerCase().includes(lowerQuery) ||
      e.cargo.toLowerCase().includes(lowerQuery) ||
      e.email.toLowerCase().includes(lowerQuery)
  );
};
