import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { projectFolderService } from '@/services/projectFolderService';
import type { CreateProjectFolderInput } from '@/types/projectFile.types';

export const useProjectFolders = (projectId: string) => {
  return useQuery({
    queryKey: ['project-folders', projectId],
    queryFn: () => projectFolderService.list(projectId),
    enabled: !!projectId,
  });
};

export const useCreateProjectFolder = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreateProjectFolderInput) => projectFolderService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders', projectId] });
      toast({ title: 'Pasta criada.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar pasta',
        description: error.message.includes('duplicate')
          ? 'Já existe uma pasta com esse nome aqui.'
          : error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveProjectFolder = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (folderId: string) => projectFolderService.remove(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders', projectId] });
      toast({ title: 'Pasta excluída.' });
    },
    onError: (error: Error) => {
      // O trigger do banco recusa pasta não vazia com mensagem própria.
      toast({
        title: 'Erro ao excluir pasta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
