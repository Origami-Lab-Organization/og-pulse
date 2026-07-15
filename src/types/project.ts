export type ProjectType =
  | "fixed_scope"
  | "continuous"
  | "success_fee"
  | "non_revenue";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  fixed_scope: "Escopo Fechado",
  continuous: "Receita Recorrente",
  success_fee: "Taxa de Sucesso",
  non_revenue: "Sem Receita",
};

export const PROJECT_TYPE_DESCRIPTIONS: Record<ProjectType, string> = {
  fixed_scope: "Projeto com escopo e valor definidos",
  continuous: "Contrato recorrente com faturamento mensal",
  success_fee: "Remuneração atrelada ao resultado",
  non_revenue: "Projeto interno sem geração de receita",
};

export type ProjectStatus =
  | "planning"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";
export type InstallmentStatus = "pending" | "invoiced" | "received" | "overdue";

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
  completed_date: string | null;
  is_continuous: boolean;
  total_value: number;
  payment_method: string;
  installments_count: number;
  first_invoice_date: string | null;
  due_day: number;
  status: ProjectStatus;
  contract_url: string | null;
  duration_months: number;
  renewal_date: string | null;
  created_at: string;
  updated_at: string;
  service_line: string | null;
  success_fee_percent: number | null;
  lead_id: string | null;
  value_book_url: string | null;
}

export interface ProjectMemberDB {
  id: string;
  project_id: string;
  employee_id: string;
  role: string;
  seniority: string;
  hours_per_month: number;
  budget_role_id: string | null;
  hourly_rate: number;
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
  budget_supplier_id: string | null;
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
  month_number: number;
  created_at: string;
}

// Project Costs (J9-01) — custos em categorias com moeda/conversão
export type ProjectCostCategory =
  | "supplier"
  | "subscription"
  | "equipment_rental"
  | "material"
  | "travel"
  | "reimbursement"
  | "other";

export type CostCurrency = "BRL" | "USD" | "EUR" | "GBP";
export type ProjectCostStatus = "planned" | "paid" | "cancelled";

export interface ProjectCostDB {
  id: string;
  project_id: string;
  category: ProjectCostCategory;
  description: string;
  cost_date: string | null;
  planned_amount: number;
  actual_amount: number | null;
  original_currency: CostCurrency;
  exchange_rate: number;
  planned_amount_brl: number;
  actual_amount_brl: number | null;
  status: ProjectCostStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateProjectCostInput {
  projectId: string;
  category: ProjectCostCategory;
  description: string;
  costDate: string;
  plannedAmount: number;
  actualAmount?: number | null;
  currency: CostCurrency;
  exchangeRate: number;
  notes?: string | null;
  status?: ProjectCostStatus;
}

export interface UpdateProjectCostInput {
  id: string;
  projectId: string;
  category?: ProjectCostCategory;
  description?: string;
  costDate?: string;
  plannedAmount?: number;
  actualAmount?: number | null;
  currency?: CostCurrency;
  exchangeRate?: number;
  notes?: string | null;
  status?: ProjectCostStatus;
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
  durationMonths?: number;
  renewalDate?: string;
  serviceLine?: string;
  successFeePercent?: number;
  leadId?: string;
  valueBookUrl?: string;
  customInstallments?: {
    installmentNumber: number;
    value: number;
    dueDate: string;
    invoiceDate?: string;
  }[];
}

export interface CreateProjectMemberInput {
  projectId: string;
  employeeId?: string; // Optional - allows creating roles without assigned employees
  role: string;
  seniority: string;
  hoursPerMonth: number;
  budgetRoleId?: string;
  hourlyRate?: number;
  monthlyHours?: { monthNumber: number; hours: number }[];
}

export interface CreateProjectSupplierInput {
  projectId: string;
  supplierId?: string;
  budgetSupplierId?: string;
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
  monthNumber?: number;
}

export interface CreateInstallmentInput {
  projectId: string;
  value: number;
  dueDate: string;
  notes?: string;
}

export interface UpdateInstallmentInput {
  status?: InstallmentStatus;
  invoiceNumber?: string;
  invoiceDate?: string;
  paymentDate?: string;
  notes?: string;
  value?: number;
  dueDate?: string;
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
      foto_url?: string | null;
      total_monthly_cost_estimated: number;
      jornada_diaria: number;
    };
  })[];
  installments?: ProjectInstallmentDB[];
  suppliers?: ProjectSupplierDB[];
  materials?: ProjectMaterialDB[];
  service?: {
    name: string;
    billing_type: string;
  } | null;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Em Planejamento",
  active: "Em Andamento",
  paused: "Pausado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: "Pendente",
  invoiced: "NF Emitida",
  received: "Recebido",
  overdue: "Atrasado",
};

// Project Member Months (hours per month)
export interface ProjectMemberMonthDB {
  id: string;
  project_member_id: string;
  month_number: number;
  hours: number;
  cost_per_hour: number | null;
}

// Project Supplier Months (value per month)
export interface ProjectSupplierMonthDB {
  id: string;
  project_supplier_id: string;
  month_number: number;
  value: number;
}

export interface CreateProjectMemberMonthInput {
  projectMemberId: string;
  monthNumber: number;
  hours: number;
}

export interface CreateProjectSupplierMonthInput {
  projectSupplierId: string;
  monthNumber: number;
  value: number;
}

// Project Commission (commission cost per installment)
export interface ProjectCommissionDB {
  id: string;
  project_id: string;
  installment_id: string;
  planned_value: number;
  is_paid: boolean;
  paid_date: string | null;
  paid_to: string | null;
  notes: string | null;
  created_at: string;
}

export const SENIORITY_OPTIONS = [
  { value: "junior", label: "Júnior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "mensal", label: "Mensal" },
  { value: "por_entrega", label: "Por Entrega" },
  { value: "unico", label: "Pagamento Único" },
  { value: "personalizado", label: "Personalizado" },
];
