import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService, CreateEmployeeInput, EmployeeDB } from '@/services/employeeService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Convert DB format to frontend format
export const dbToEmployee = (db: EmployeeDB) => ({
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
  tenantId: db.tenant_id,
  authId: db.auth_id,
  mustChangePassword: db.must_change_password,
});

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
