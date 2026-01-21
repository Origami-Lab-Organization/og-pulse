import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService, CreateEmployeeInput, EmployeeDB } from '@/services/employeeService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CreateEmployeeToolInput } from '@/types/employee';

// Type for employee with tools from DB
type EmployeeWithTools = EmployeeDB & { employee_tools?: { monthly_cost: number }[] };

// Convert DB format to frontend format
export const dbToEmployee = (db: EmployeeWithTools) => {
  const totalToolsCost = (db.employee_tools || []).reduce(
    (sum, tool) => sum + Number(tool.monthly_cost),
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
    status: db.status as 'ativo' | 'inativo',
    salarioMensal: Number(db.salario_mensal),
    beneficios: Number(db.beneficios),
    encargos: Number(db.encargos),
    totalToolsCost,
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
      return data.map(dbToEmployee);
    },
    enabled: !!tenantId,
  });
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
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateEmployeeInput> }) => {
      return employeeService.update(id, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Funcionário atualizado',
        description: `${data.nome} foi atualizado com sucesso.`,
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

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      await employeeService.delete(id);
      return { nome };
    },
    onSuccess: ({ nome }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: 'Funcionário excluído',
        description: `${nome} foi removido.`,
        variant: 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir funcionário',
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
