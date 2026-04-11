import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { activityTagService } from '@/services/activityTagService';

export const useProjectTags = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-activity-tags', projectId],
    queryFn: () => activityTagService.getTagsByProject(projectId!),
    enabled: !!projectId,
  });
};

export const useCardTags = (cardId: string | undefined) => {
  return useQuery({
    queryKey: ['project-activity-card-tags', cardId],
    queryFn: () => activityTagService.getCardTags(cardId!),
    enabled: !!cardId,
  });
};

export const useCreateTag = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      activityTagService.createTag(projectId, employee!.tenant_id, name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-activity-tags', projectId] });
    },
    onError: () => {
      toast({ title: 'Erro ao criar tag', variant: 'destructive' });
    },
  });
};

export const useAddTagToCard = (cardId: string, projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (tagId: string) => activityTagService.addTagToCard(cardId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-activity-card-tags', cardId] });
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
    },
    onError: () => {
      toast({ title: 'Erro ao adicionar tag', variant: 'destructive' });
    },
  });
};

export const useRemoveTagFromCard = (cardId: string, projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (tagId: string) => activityTagService.removeTagFromCard(cardId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-activity-card-tags', cardId] });
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
    },
    onError: () => {
      toast({ title: 'Erro ao remover tag', variant: 'destructive' });
    },
  });
};
