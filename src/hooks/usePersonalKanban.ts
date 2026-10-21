import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { personalKanbanService } from '@/services/personalKanbanService';
import { DEFAULT_COLUMNS } from '@/lib/personalKanban';
import { NEW_ACTIVITY_COLUMN } from '@/lib/personalKanbanActivity';
import { useCreateActivity } from '@/hooks/useProjectActivities';
import type { ActivityColumnName } from '@/types/projectActivity';
import type {
  AssignedProjectCard,
  CreatePersonalKanbanCardInput,
  CreatePersonalKanbanColumnInput,
  PersonalKanbanCardWithTags,
  PersonalKanbanSettingsDB,
  PersonalKanbanStage,
  UpdatePersonalKanbanCardInput,
  UpdatePersonalKanbanColumnInput,
  UpdatePersonalKanbanSettingsInput,
} from '@/types/personalKanban';

// ── Columns ────────────────────────────────────────────────────────────────

export const usePersonalKanbanColumns = () => {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const employeeId = employee?.id;
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['personal-kanban-columns', employeeId],
    queryFn: async () => {
      const cols = await personalKanbanService.getColumns(employeeId!);
      if (cols.length === 0 && tenantId) {
        const created = await Promise.all(
          DEFAULT_COLUMNS.map((column, i) =>
            personalKanbanService.createColumn({ ...column, position: i }, employeeId!, tenantId),
          ),
        );
        queryClient.invalidateQueries({ queryKey: ['personal-kanban-columns', employeeId] });
        return created;
      }
      return cols;
    },
    enabled: !!employeeId,
  });
};

export const usePersonalKanbanCards = () => {
  const { employee } = useAuth();
  const employeeId = employee?.id;

  return useQuery({
    queryKey: ['personal-kanban-cards', employeeId],
    queryFn: () => personalKanbanService.getCards(employeeId!),
    enabled: !!employeeId,
  });
};

export const useCreatePersonalColumn = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreatePersonalKanbanColumnInput) =>
      personalKanbanService.createColumn(input, employee!.id, employee!.tenant_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-columns', employee?.id] });
    },
    onError: () => {
      toast({ title: 'Erro ao criar coluna', variant: 'destructive' });
    },
  });
};

export const useUpdatePersonalColumn = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdatePersonalKanbanColumnInput }) =>
      personalKanbanService.updateColumn(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-columns', employee?.id] });
      // A etapa decide onde entram as atividades de projeto e o que conta como concluído.
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-cards', employee?.id] });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar coluna', variant: 'destructive' });
    },
  });
};

export const useDeletePersonalColumn = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => personalKanbanService.deleteColumn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-columns', employee?.id] });
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-cards', employee?.id] });
      toast({ title: 'Coluna removida' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover coluna', variant: 'destructive' });
    },
  });
};

export const useBatchUpdateColumnPositions = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: (columns: { id: string; position: number }[]) =>
      personalKanbanService.batchUpdateColumnPositions(columns),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-columns', employee?.id] });
    },
  });
};

// ── Cards ──────────────────────────────────────────────────────────────────

export const useCreatePersonalCard = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreatePersonalKanbanCardInput) =>
      personalKanbanService.createCard(input, employee!.id, employee!.tenant_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-cards', employee?.id] });
    },
    onError: () => {
      toast({ title: 'Erro ao criar card', variant: 'destructive' });
    },
  });
};

export const useUpdatePersonalCard = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdatePersonalKanbanCardInput }) =>
      personalKanbanService.updateCard(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-cards', employee?.id] });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar card', variant: 'destructive' });
    },
  });
};

export const useDeletePersonalCard = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => personalKanbanService.deleteCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-cards', employee?.id] });
      toast({ title: 'Card removido' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover card', variant: 'destructive' });
    },
  });
};

export const useBatchUpdateCardPositions = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: (cards: { id: string; position: number; column_id: string }[]) =>
      personalKanbanService.batchUpdateCardPositions(cards),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-cards', employee?.id] });
    },
  });
};

export const useArchivedPersonalCards = (enabled: boolean) => {
  const { employee } = useAuth();
  return useQuery({
    queryKey: ['personal-kanban-archived', employee?.id],
    queryFn: () => personalKanbanService.getArchivedCards(employee!.id),
    enabled: enabled && !!employee?.id,
  });
};

export const useRestorePersonalCard = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    // Restaurar recomeça a contagem: sem isto o arquivamento diário levaria o card de volta.
    mutationFn: (id: string) =>
      personalKanbanService.updateCard(id, { archived_at: null, completed_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-cards', employee?.id] });
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-archived', employee?.id] });
      toast({ title: 'Card restaurado' });
    },
    onError: () => {
      toast({ title: 'Erro ao restaurar card', variant: 'destructive' });
    },
  });
};

// ── Settings ───────────────────────────────────────────────────────────────

export const usePersonalKanbanSettings = () => {
  const { employee } = useAuth();
  return useQuery({
    queryKey: ['personal-kanban-settings', employee?.id],
    queryFn: () => personalKanbanService.ensureSettings(employee!.id, employee!.tenant_id),
    enabled: !!employee?.id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdatePersonalKanbanSettings = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryKey = ['personal-kanban-settings', employee?.id];

  return useMutation({
    mutationFn: (updates: UpdatePersonalKanbanSettingsInput) =>
      personalKanbanService.updateSettings(employee!.id, updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PersonalKanbanSettingsDB>(queryKey);
      if (previous) queryClient.setQueryData(queryKey, { ...previous, ...updates });
      return { previous };
    },
    onError: (_error, _updates, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast({ title: 'Erro ao salvar preferência', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
};

// ── Tags ───────────────────────────────────────────────────────────────────

export const usePersonalTags = () => {
  const { employee } = useAuth();
  const employeeId = employee?.id;

  return useQuery({
    queryKey: ['personal-kanban-tags', employeeId],
    queryFn: () => personalKanbanService.getTags(employeeId!),
    enabled: !!employeeId,
  });
};

export const useCreatePersonalTag = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      personalKanbanService.createTag(name, color, employee!.id, employee!.tenant_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-tags', employee?.id] });
    },
    onError: () => {
      toast({ title: 'Erro ao criar tag', variant: 'destructive' });
    },
  });
};

export const useDeletePersonalTag = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => personalKanbanService.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-tags', employee?.id] });
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-cards', employee?.id] });
    },
    onError: () => {
      toast({ title: 'Erro ao remover tag', variant: 'destructive' });
    },
  });
};

export const useAddTagToCard = (cardId: string) => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: (tagId: string) => personalKanbanService.addTagToCard(cardId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-cards', employee?.id] });
    },
  });
};

export const useRemoveTagFromCard = (cardId: string) => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: (tagId: string) => personalKanbanService.removeTagFromCard(cardId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-cards', employee?.id] });
    },
  });
};

// ── Project integration ────────────────────────────────────────────────────

export const useAssignedProjectCards = () => {
  const { employee } = useAuth();
  return useQuery({
    queryKey: ['assigned-project-cards', employee?.id],
    queryFn: () => personalKanbanService.getAssignedProjectCards(employee!.id, employee!.tenant_id),
    enabled: !!employee?.id,
  });
};

// ── Vínculo com projeto (ADR-0050) ───────────────────────────────────────────

function useInvalidateBoard() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['personal-kanban-cards', employee?.id] });
    queryClient.invalidateQueries({ queryKey: ['assigned-project-cards', employee?.id] });
  };
}

export const useLinkableProjects = (enabled: boolean) =>
  useQuery({
    queryKey: ['personal-kanban-linkable-projects'],
    queryFn: () => personalKanbanService.listLinkableProjects(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

// O card vira atividade pelo mesmo caminho do board (checklist do projeto incluído), atribuída a
// quem vinculou e na coluna da etapa atual. O card pessoal continua, apontando para ela.
export const useLinkCardToProject = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const createActivity = useCreateActivity();
  const invalidateBoard = useInvalidateBoard();

  return useMutation({
    mutationFn: async (params: { card: PersonalKanbanCardWithTags; projectId: string; stage: PersonalKanbanStage }) => {
      const { card, projectId, stage } = params;
      const activity = await createActivity.mutateAsync({
        projectId,
        title: card.title,
        cardType: 'task',
        userStory: card.description ?? undefined,
        assigneeId: employee!.id,
        columnName: NEW_ACTIVITY_COLUMN[stage],
      });
      await personalKanbanService.updateCard(card.id, { project_activity_card_id: activity.id });
    },
    onSuccess: invalidateBoard,
    onError: () => {
      toast({ title: 'Erro ao vincular ao projeto', variant: 'destructive' });
    },
  });
};

export const useUnlinkCard = () => {
  const { toast } = useToast();
  const invalidateBoard = useInvalidateBoard();
  return useMutation({
    mutationFn: (cardId: string) => personalKanbanService.updateCard(cardId, { project_activity_card_id: null }),
    onSuccess: () => {
      invalidateBoard();
      toast({ title: 'Card desvinculado. A atividade continua no projeto.' });
    },
    onError: () => {
      toast({ title: 'Erro ao desvincular', variant: 'destructive' });
    },
  });
};

// Atividade atribuída que a pessoa passa a acompanhar no kanban dela (com prazo e lembrete).
export const useTrackProjectActivity = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const invalidateBoard = useInvalidateBoard();
  return useMutation({
    mutationFn: (params: { activity: AssignedProjectCard; columnId: string }) =>
      personalKanbanService.createCard(
        { column_id: params.columnId, title: params.activity.title, project_activity_card_id: params.activity.projectCardId },
        employee!.id,
        employee!.tenant_id,
      ),
    onSuccess: () => {
      invalidateBoard();
      toast({ title: 'Atividade no seu kanban. Agora dá para mover, dar prazo e lembrete.' });
    },
    onError: () => {
      toast({ title: 'Erro ao trazer a atividade', variant: 'destructive' });
    },
  });
};

export const useMoveLinkedActivity = () => {
  const invalidateBoard = useInvalidateBoard();
  return useMutation({
    mutationFn: (params: { activityId: string; projectId: string; column: ActivityColumnName }) =>
      personalKanbanService.moveProjectActivity(params.activityId, params.projectId, params.column),
    onSettled: invalidateBoard,
  });
};

// Título é um só: renomear o card vinculado renomeia a atividade no projeto.
export const useRenameLinkedActivity = () => {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (params: { activityId: string; title: string }) =>
      personalKanbanService.renameProjectActivity(params.activityId, params.title),
    onError: () => {
      toast({ title: 'O card foi salvo, mas o título da atividade no projeto não mudou', variant: 'destructive' });
    },
  });
};
