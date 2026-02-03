export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
export type InstallmentStatus = 'pending' | 'invoiced' | 'received' | 'overdue';

export interface ProjectDB {
  id: string;
  tenant_id: string;
  client_id: string;
  manager_id: string;
  budget_id: string | null;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  is_continuous: boolean;
  total_value: number;
  payment_method: string;
  installments_count: number;
  first_invoice_date: string | null;
  due_day: number;
  status: ProjectStatus;
  contract_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMemberDB {
  id: string;
  project_id: string;
  employee_id: string;
  role: string;
  seniority: string;
  hours_per_month: number;
  created_at: string;
}

export interface ProjectInstallmentDB {
  id: string;
  project_id: string;
  installment_number: number;
  value: number;
  due_date: string;
  status: InstallmentStatus;
  invoice_number: string | null;
  invoice_date: string | null;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Project Suppliers (recurring external service costs)
export interface ProjectSupplierDB {
  id: string;
  project_id: string;
  supplier_id: string | null;
  name: string;
  description: string | null;
  monthly_value: number;
  start_month: number;
  end_month: number | null;
  created_at: string;
}

// Project Materials (one-off costs)
export interface ProjectMaterialDB {
  id: string;
  project_id: string;
  description: string;
  value: number;
  purchase_date: string | null;
  is_realized: boolean;
  created_at: string;
}

export interface CreateProjectInput {
  clientId: string;
  managerId: string;
  budgetId?: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isContinuous?: boolean;
  totalValue: number;
  paymentMethod: string;
  installmentsCount: number;
  firstInvoiceDate?: string;
  dueDay: number;
  status?: ProjectStatus;
  contractUrl?: string;
}

export interface CreateProjectMemberInput {
  projectId: string;
  employeeId: string;
  role: string;
  seniority: string;
  hoursPerMonth: number;
}

export interface CreateProjectSupplierInput {
  projectId: string;
  supplierId?: string;
  name: string;
  description?: string;
  monthlyValue: number;
  startMonth: number;
  endMonth?: number;
}

export interface CreateProjectMaterialInput {
  projectId: string;
  description: string;
  value: number;
  purchaseDate?: string;
  isRealized?: boolean;
}

export interface UpdateInstallmentInput {
  status?: InstallmentStatus;
  invoiceNumber?: string;
  invoiceDate?: string;
  paymentDate?: string;
  notes?: string;
  value?: number;
}

// Extended types with relations
export interface ProjectWithRelations extends ProjectDB {
  portfolio_stage?: string | null;
  client?: {
    id: string;
    company_name: string;
    trading_name: string | null;
  };
  manager?: {
    id: string;
    nome: string;
    cargo: string;
  };
  members?: (ProjectMemberDB & {
    employee?: {
      id: string;
      nome: string;
      cargo: string;
      salario_mensal: number;
      beneficios: number;
      encargos: number;
    };
  })[];
  installments?: ProjectInstallmentDB[];
  suppliers?: ProjectSupplierDB[];
  materials?: ProjectMaterialDB[];
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Em Planejamento',
  active: 'Em Andamento',
  paused: 'Pausado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: 'Pendente',
  invoiced: 'NF Emitida',
  received: 'Recebido',
  overdue: 'Atrasado',
};

export const SENIORITY_OPTIONS = [
  { value: 'junior', label: 'Júnior' },
  { value: 'pleno', label: 'Pleno' },
  { value: 'senior', label: 'Sênior' },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'por_entrega', label: 'Por Entrega' },
  { value: 'unico', label: 'Pagamento Único' },
  { value: 'personalizado', label: 'Personalizado' },
];
