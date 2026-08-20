import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { projectFileService } from '@/services/projectFileService';
import type { ProjectFile, UploadProjectFileInput } from '@/types/projectFile.types';

export const useProjectFiles = (projectId: string) => {
  return useQuery({
    queryKey: ['project-files', projectId],
    queryFn: () => projectFileService.list(projectId),
    enabled: !!projectId,
  });
};

export const useUploadProjectFile = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: UploadProjectFileInput) => projectFileService.upload(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      toast({ title: 'Arquivo enviado.' });
    },
    onError: () => {
      toast({
        title: 'Erro ao enviar arquivo',
        description: 'Verifique o tamanho e tente novamente.',
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveProjectFile = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (file: Pick<ProjectFile, 'id' | 'storagePath'>) => projectFileService.remove(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      // O contrato zera projects.contract_url por trigger — a tela precisa reler.
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({ title: 'Arquivo removido.' });
    },
    onError: () => {
      toast({
        title: 'Erro ao remover arquivo',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    },
  });
};
