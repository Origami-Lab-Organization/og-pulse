import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { equipeService } from '@/services/equipeService';
import { CreateProjectRolePayload } from '@/types/equipe.types';

export const useProjectRoles = (projectId: string) => {
  return useQuery({
    queryKey: ['project-roles', projectId],
    queryFn: () => equipeService.getProjectRoles(projectId),
    enabled: !!projectId,
  });
};

export const useCreateProjectRole = (projectId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { employee, user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateProjectRolePayload) =>
      equipeService.createProjectRole(payload, employee!.tenant_id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-roles', projectId] });
      toast({ title: 'Papel adicionado com sucesso' });
      onSuccess?.();
    },
    onError: () => {
      toast({ title: 'Erro ao adicionar papel. Tente novamente.', variant: 'destructive' });
    },
  });
};

export const useDeleteProjectRole = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => equipeService.deleteProjectRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-roles', projectId] });
      toast({ title: 'Papel removido' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover papel', variant: 'destructive' });
    },
  });
};
