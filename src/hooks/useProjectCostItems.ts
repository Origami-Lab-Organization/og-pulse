import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toBRL } from '@/lib/projectCosts';
import type {
  ProjectCostDB,
  CreateProjectCostInput,
  UpdateProjectCostInput,
} from '@/types/project';

const costsKey = (projectId: string | undefined) => ['project-costs', projectId];

/** Lista os custos ativos (não excluídos) do projeto, mais recentes primeiro. */
export const useProjectCostItems = (projectId: string | undefined) => {
  return useQuery({
    queryKey: costsKey(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_costs')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('cost_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectCostDB[];
    },
    enabled: !!projectId,
  });
};

export const useAddProjectCost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateProjectCostInput) => {
      const rate = input.currency === 'BRL' ? 1 : input.exchangeRate;
      const { data, error } = await supabase
        .from('project_costs')
        .insert({
          project_id: input.projectId,
          category: input.category,
          description: input.description.trim(),
          cost_date: input.costDate,
          planned_amount: input.plannedAmount,
          actual_amount: input.actualAmount ?? null,
          original_currency: input.currency,
          exchange_rate: rate,
          planned_amount_brl: toBRL(input.plannedAmount, rate),
          actual_amount_brl:
            input.actualAmount != null ? toBRL(input.actualAmount, rate) : null,
          notes: input.notes?.trim() || null,
          status: input.status ?? 'planned',
        })
        .select()
        .single();

      if (error) throw error;
      return data as ProjectCostDB;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: costsKey(input.projectId) });
      toast({ title: 'Custo adicionado com sucesso' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar custo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateProjectCost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateProjectCostInput) => {
      const updates: Record<string, unknown> = {};
      if (input.category !== undefined) updates.category = input.category;
      if (input.description !== undefined) updates.description = input.description.trim();
      if (input.costDate !== undefined) updates.cost_date = input.costDate;
      if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;
      if (input.status !== undefined) updates.status = input.status;

      // Valores monetários e moeda são recalculados juntos para manter
      // os campos *_brl consistentes com a taxa informada.
      const touchesMoney =
        input.plannedAmount !== undefined ||
        input.actualAmount !== undefined ||
        input.currency !== undefined ||
        input.exchangeRate !== undefined;

      if (touchesMoney) {
        const currency = input.currency;
        const rate = currency === 'BRL' ? 1 : input.exchangeRate;
        if (currency !== undefined) updates.original_currency = currency;
        if (rate !== undefined) updates.exchange_rate = rate;
        if (input.plannedAmount !== undefined) {
          updates.planned_amount = input.plannedAmount;
          if (rate !== undefined) updates.planned_amount_brl = toBRL(input.plannedAmount, rate);
        }
        if (input.actualAmount !== undefined) {
          updates.actual_amount = input.actualAmount;
          updates.actual_amount_brl =
            input.actualAmount != null && rate !== undefined
              ? toBRL(input.actualAmount, rate)
              : null;
        }
      }

      const { data, error } = await supabase
        .from('project_costs')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data as ProjectCostDB;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: costsKey(input.projectId) });
      toast({ title: 'Custo atualizado' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar custo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useCancelProjectCost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_costs')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: costsKey(projectId) });
      toast({ title: 'Custo cancelado' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar custo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/** Soft delete — registra deleted_at; o item some das listas/totais. */
export const useDeleteProjectCost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_costs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: costsKey(projectId) });
      toast({ title: 'Custo excluído' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir custo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
