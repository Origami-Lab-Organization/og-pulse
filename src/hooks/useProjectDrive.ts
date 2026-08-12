import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { projectDriveService } from '@/services/projectDriveService';
import type { LinkProjectDriveInput } from '@/types/microsoftGraph';

export const useProjectDriveLink = (projectId: string) => {
  return useQuery({
    queryKey: ['project-drive-link', projectId],
    queryFn: () => projectDriveService.get(projectId),
    enabled: !!projectId,
  });
};

export const useLinkProjectDrive = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: LinkProjectDriveInput) => projectDriveService.link(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-drive-link', projectId] });
      toast({ title: 'Pasta do OneDrive vinculada.' });
    },
    onError: () => {
      toast({
        title: 'Erro ao vincular pasta',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    },
  });
};

export const useUnlinkProjectDrive = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => projectDriveService.unlink(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-drive-link', projectId] });
      toast({ title: 'Vínculo removido.' });
    },
    onError: () => {
      toast({
        title: 'Erro ao remover vínculo',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    },
  });
};
