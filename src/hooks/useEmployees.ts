import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService, CreateEmployeeInput, EmployeeDB } from '@/services/employeeService';
import { employeeVersionService, EmployeeVersionDB } from '@/services/employeeVersionService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CreateEmployeeToolInput, CreateEmployeeBenefitInput, ContractType, SystemRole } from '@/types/employee';
import { CostBreakdown } from '@/lib/employeeCostCalculator';

// Type for employee with tools and benefits from DB
type EmployeeWithRelations = EmployeeDB & { 
  employee_tools?: { monthly_cost: number }[];
  employee_benefits?: { monthly_value: number }[];
};

// Convert DB format to frontend format
export const dbToEmployee = (db: EmployeeWithRelations) => {
  const totalToolsCost = (db.employee_tools || []).reduce(
    (sum, tool) => sum + Number(tool.monthly_cost),
    0
  );
  
  const totalBenefitsCost = (db.employee_benefits || []).reduce(
    (sum, benefit) => sum + Number(benefit.monthly_value),
    0
  );
  
  return {
    id: db.id,
    nome: db.nome,
    email: db.email,
    telefone: db.telefone || '',
    cargo: db.cargo,
    cpf: db.cpf || '',
    dataAdmissao: db.data_admissao,
    isGerente: db.is_gerente,
    systemRole: (db.system_role || 'user') as SystemRole,
    status: db.status as 'ativo' | 'aguardando_confirmacao' | 'bloqueado' | 'arquivado',
    salarioMensal: Number(db.salario_mensal),
    beneficios: Number(db.beneficios),
    encargos: Number(db.encargos),
    tipoContratacao: (db.tipo_contratacao || 'CLT') as ContractType,
    jornadaMensal: Number(db.jornada_mensal) || 168,
    jornadaDiaria: Number((db as any).jornada_diaria) || 8,
    salarioLiquido: Number(db.salario_liquido) || 0,
    fgts: Number(db.fgts) || 0,
    inssEmpresa: Number(db.inss_empresa) || 0,
    decimoTerceiro: Number(db.decimo_terceiro) || 0,
    ferias: Number(db.ferias) || 0,
    proLabore: Number(db.pro_labore) || 0,
    // New fields
    bolsaAuxilio: Number(db.bolsa_auxilio) || 0,
    valorContratoPj: Number(db.valor_contrato_pj) || 0,
    dividendos: Number(db.dividendos) || 0,
    provisao13: Number(db.provisao_13) || 0,
    provisaoFerias: Number(db.provisao_ferias) || 0,
    provisaoRecesso: Number(db.provisao_recesso) || 0,
    totalMonthlyCostEstimated: Number(db.total_monthly_cost_estimated) || 0,
    totalAnnualCostEstimated: Number(db.total_annual_cost_estimated) || 0,
    breakdownJson: db.breakdown_json as unknown as CostBreakdown | null,
    dataNascimento: db.data_nascimento || undefined,
    fotoUrl: db.foto_url || undefined,
    totalToolsCost,
    totalBenefitsCost,
    tenantId: db.tenant_id,
    authId: db.auth_id,
    mustChangePassword: db.must_change_password,
  };
};

export type Employee = ReturnType<typeof dbToEmployee>;

export const useEmployees = () => {
  const { employee: currentEmployee } = useAuth();
  const tenantId = currentEmployee?.tenant_id;

  return useQuery({
    queryKey: ['employees', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await employeeService.getAll(tenantId);
      // Filter out archived employees from main listing
      return data
        .filter(emp => emp.status !== 'arquivado')
        .map(dbToEmployee);
    },
    enabled: !!tenantId,
  });
};

// Hook to get project managers (employees with manager or admin role)
export const useProjectManagers = () => {
  const { data: employees = [], ...rest } = useEmployees();
  
  const managers = employees.filter((e) => e.systemRole === 'manager' || e.systemRole === 'admin');
  
  return {
    ...rest,
    data: managers,
  };
};

export const useSearchEmployees = (query: string) => {
  const { employee: currentEmployee } = useAuth();
  const tenantId = currentEmployee?.tenant_id;

  return useQuery({
    queryKey: ['employees', 'search', tenantId, query],
    queryFn: async () => {
      if (!tenantId || !query.trim()) return [];
      const data = await employeeService.search(query, tenantId);
      return data.map(dbToEmployee);
    },
    enabled: !!tenantId && !!query.trim(),
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  const { employee: currentEmployee } = useAuth();
  const { toast } = useToast();
  const tenantId = currentEmployee?.tenant_id;

  return useMutation({
    mutationFn: async (input: CreateEmployeeInput) => {
      if (!tenantId) throw new Error('No tenant');
      const loginUrl = `${window.location.origin}/login`;
      return employeeService.create(input, tenantId, loginUrl);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Funcionário cadastrado',
        description: `${data.nome} foi adicionado e um convite foi enviado por email.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cadastrar funcionário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates,
      createNewVersion = false,
      effectiveFrom,
    }: { 
      id: string; 
      updates: Partial<CreateEmployeeInput>;
      createNewVersion?: boolean;
      effectiveFrom?: string;
    }) => {
      return employeeService.update(id, updates, createNewVersion, effectiveFrom);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      if (variables.createNewVersion) {
        queryClient.invalidateQueries({ queryKey: ['employee-versions', variables.id] });
      }
      toast({
        title: 'Funcionário atualizado',
        description: variables.createNewVersion 
          ? `${data.nome} foi atualizado. Um novo marco financeiro foi criado.`
          : `${data.nome} foi atualizado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar funcionário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useBlockEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      await employeeService.block(id);
      return { nome };
    },
    onSuccess: ({ nome }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Funcionário bloqueado',
        description: `${nome} foi bloqueado e não poderá mais acessar o sistema.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao bloquear funcionário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUnblockEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, nome, hadLoggedIn }: { id: string; nome: string; hadLoggedIn: boolean }) => {
      const newStatus = hadLoggedIn ? 'ativo' : 'aguardando_confirmacao';
      await employeeService.unblock(id, newStatus);
      return { nome };
    },
    onSuccess: ({ nome }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Funcionário desbloqueado',
        description: `${nome} pode acessar o sistema novamente.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao desbloquear funcionário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useArchiveEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      await employeeService.archive(id);
      return { nome };
    },
    onSuccess: ({ nome }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Funcionário arquivado',
        description: `${nome} foi arquivado e removido da listagem.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao arquivar funcionário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useResendInvite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const loginUrl = `${window.location.origin}/login`;
      await employeeService.resendInvite(id, loginUrl);
      return { nome };
    },
    onSuccess: ({ nome }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Convite reenviado',
        description: `Um novo convite foi enviado para ${nome}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao reenviar convite',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Employee Tools hooks
export const useEmployeeTools = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['employee-tools', employeeId],
    queryFn: () => employeeService.getTools(employeeId!),
    enabled: !!employeeId,
  });
};

export const useAddEmployeeTool = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateEmployeeToolInput) => {
      return employeeService.addTool(input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-tools', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Ferramenta adicionada',
        description: 'A ferramenta foi adicionada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar ferramenta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateEmployeeTool = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      employeeId,
      updates,
    }: {
      id: string;
      employeeId: string;
      updates: Partial<Omit<CreateEmployeeToolInput, 'employeeId'>>;
    }) => {
      return employeeService.updateTool(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-tools', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Ferramenta atualizada',
        description: 'A ferramenta foi atualizada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar ferramenta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteEmployeeTool = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      await employeeService.deleteTool(id);
      return { employeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee-tools', data.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Ferramenta removida',
        description: 'A ferramenta foi removida com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover ferramenta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Employee Benefits hooks
export const useEmployeeBenefits = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['employee-benefits', employeeId],
    queryFn: () => employeeService.getBenefits(employeeId!),
    enabled: !!employeeId,
  });
};

export const useAddEmployeeBenefit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateEmployeeBenefitInput) => {
      return employeeService.addBenefit(input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-benefits', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Benefício adicionado',
        description: 'O benefício foi adicionado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar benefício',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateEmployeeBenefit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      employeeId,
      updates,
    }: {
      id: string;
      employeeId: string;
      updates: Partial<Omit<CreateEmployeeBenefitInput, 'employeeId'>>;
    }) => {
      return employeeService.updateBenefit(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-benefits', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Benefício atualizado',
        description: 'O benefício foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar benefício',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteEmployeeBenefit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      await employeeService.deleteBenefit(id);
      return { employeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee-benefits', data.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Benefício removido',
        description: 'O benefício foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover benefício',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Employee Versions hooks
export const useEmployeeVersions = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['employee-versions', employeeId],
    queryFn: () => employeeVersionService.getVersions(employeeId!),
    enabled: !!employeeId,
  });
};

export const useCurrentEmployeeVersion = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['employee-version-current', employeeId],
    queryFn: () => employeeVersionService.getCurrentVersion(employeeId!),
    enabled: !!employeeId,
  });
};

export const useEmployeeVersionAtDate = (employeeId: string | undefined, date: string | undefined) => {
  return useQuery({
    queryKey: ['employee-version-at-date', employeeId, date],
    queryFn: () => employeeVersionService.getVersionAtDate(employeeId!, date!),
    enabled: !!employeeId && !!date,
  });
};

export type { EmployeeVersionDB };