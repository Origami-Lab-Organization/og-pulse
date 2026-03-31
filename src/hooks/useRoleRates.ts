import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { roleRateService } from '@/services/roleRateService';
import { CreateRoleRateInput, UpdateRoleRateInput, RoleRateDB, RoleRateStatus } from '@/types/roleRate';
import { useToast } from '@/hooks/use-toast';

export function useRoleRates() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['role-rates', tenantId],
    queryFn: () => roleRateService.getAll(tenantId!),
    enabled: !!tenantId,
  });
}

export function useActiveRoleRates() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['role-rates', tenantId, 'active'],
    queryFn: () => roleRateService.getActive(tenantId!),
    enabled: !!tenantId,
  });
}

export function useRoleRate(id: string | null) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: ['role-rate', id],
    queryFn: () => roleRateService.getById(id!, tenantId),
    enabled: !!id && !!tenantId,
  });
}

export function useCreateRoleRate() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: (input: CreateRoleRateInput) => 
      roleRateService.create(input, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-rates'] });
      toast({
        title: 'Sucesso',
        description: 'Papel cadastrado com sucesso!',
      });
    },
    onError: (error: Error) => {
      const message = error.message.includes('duplicate key')
        ? 'Já existe um papel com essa combinação de nome e senioridade.'
        : 'Erro ao cadastrar papel. Tente novamente.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateRoleRate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRoleRateInput }) =>
      roleRateService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-rates'] });
      toast({
        title: 'Sucesso',
        description: 'Papel atualizado com sucesso!',
      });
    },
    onError: (error: Error) => {
      const message = error.message.includes('duplicate key')
        ? 'Já existe um papel com essa combinação de nome e senioridade.'
        : 'Erro ao atualizar papel. Tente novamente.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteRoleRate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => roleRateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-rates'] });
      toast({
        title: 'Sucesso',
        description: 'Papel excluído com sucesso!',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir papel. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useSetRoleRateStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const statusMessages: Record<RoleRateStatus, string> = {
    active: 'Papel reativado!',
    inactive: 'Papel inativado!',
    archived: 'Papel arquivado!',
  };

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RoleRateStatus }) =>
      roleRateService.setStatus(id, status),
    onSuccess: (data: RoleRateDB) => {
      queryClient.invalidateQueries({ queryKey: ['role-rates'] });
      toast({
        title: 'Sucesso',
        description: statusMessages[data.status],
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao alterar status. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateMultipleRoleRates() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: (inputs: CreateRoleRateInput[]) =>
      roleRateService.createMultiple(inputs, tenantId!),
    onSuccess: (data: RoleRateDB[]) => {
      queryClient.invalidateQueries({ queryKey: ['role-rates'] });
      toast({
        title: 'Sucesso',
        description: `${data.length} ${data.length === 1 ? 'papel cadastrado' : 'papéis cadastrados'} com sucesso!`,
      });
    },
    onError: (error: Error) => {
      const message = error.message.includes('duplicate key')
        ? 'Já existe um papel com essa combinação de nome e senioridade.'
        : 'Erro ao cadastrar papéis. Tente novamente.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    },
  });
}
