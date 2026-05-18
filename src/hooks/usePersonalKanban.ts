import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { personalKanbanService } from '@/services/personalKanbanService';
import {
  CreatePersonalKanbanCardInput,
  CreatePersonalKanbanColumnInput,
  UpdatePersonalKanbanCardInput,
} from '@/types/personalKanban';

const DEFAULT_COLUMNS = ['To do', 'Doing', 'Done'];

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
          DEFAULT_COLUMNS.map((name, i) =>
            personalKanbanService.createColumn({ name, position: i }, employeeId!, tenantId),
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
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      personalKanbanService.updateColumn(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kanban-columns', employee?.id] });
    },
    onError: () => {
      toast({ title: 'Erro ao renomear coluna', variant: 'destructive' });
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
