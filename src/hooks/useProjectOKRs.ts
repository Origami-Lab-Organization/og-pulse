import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ProjectOKR,
  ProjectKeyResult,
  CreateOKRInput,
  UpdateOKRInput,
  CreateKeyResultInput,
  UpdateKeyResultInput,
  OKRStatus,
  KeyResultConfidenceLevel,
  KeyResultHistory,
} from '@/types/projectOkr';

// OKR Hooks
export const useProjectOKRs = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-okrs', projectId],
    queryFn: async () => {
      const { data: okrs, error } = await supabase
        .from('project_okrs')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const okrIds = okrs.map((o) => o.id);
      const { data: keyResults, error: krError } = await supabase
        .from('project_key_results')
        .select('*')
        .in('okr_id', okrIds.length > 0 ? okrIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: true });

      if (krError) throw krError;

      return okrs.map((okr) => ({
        ...okr,
        status: okr.status as OKRStatus,
        key_results: (keyResults || [])
          .filter((kr) => kr.okr_id === okr.id)
          .map((kr) => ({
            ...kr,
            confidence_level: (kr as any).confidence_level as KeyResultConfidenceLevel,
          })) as ProjectKeyResult[],
      })) as ProjectOKR[];
    },
    enabled: !!projectId,
  });
};

export const useCreateOKR = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateOKRInput) => {
      const { data, error } = await supabase
        .from('project_okrs')
        .insert({
          project_id: input.projectId,
          objective: input.objective,
          description: input.description || null,
          target_date: input.targetDate || null,
          status: input.status || 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-okrs', variables.projectId] });
      toast({ title: 'Objetivo criado', description: 'O objetivo foi adicionado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar objetivo', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateOKR = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId, updates }: { id: string; projectId: string; updates: UpdateOKRInput }) => {
      const { data, error } = await supabase
        .from('project_okrs')
        .update({
          objective: updates.objective,
          description: updates.description,
          target_date: updates.targetDate,
          status: updates.status,
          progress_percent: updates.progressPercent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-okrs', variables.projectId] });
      toast({ title: 'Objetivo atualizado', description: 'O objetivo foi atualizado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar objetivo', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteOKR = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('project_okrs').delete().eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-okrs', data.projectId] });
      toast({ title: 'Objetivo excluído', description: 'O objetivo foi removido com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir objetivo', description: error.message, variant: 'destructive' });
    },
  });
};

// Key Result Hooks
export const useCreateKeyResult = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ input, projectId }: { input: CreateKeyResultInput; projectId: string }) => {
      const { data, error } = await supabase
        .from('project_key_results')
        .insert({
          okr_id: input.okrId,
          description: input.description,
          target_value: input.targetValue || null,
          unit: input.unit || null,
          confidence_level: input.confidenceLevel || 'medium',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return { data, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project-okrs', result.projectId] });
      toast({ title: 'Key Result criado', description: 'O resultado-chave foi adicionado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar Key Result', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateKeyResult = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId, updates }: { id: string; projectId: string; updates: UpdateKeyResultInput }) => {
      const { data, error } = await supabase
        .from('project_key_results')
        .update({
          description: updates.description,
          target_value: updates.targetValue,
          current_value: updates.currentValue,
          unit: updates.unit,
          confidence_level: updates.confidenceLevel,
        } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Insert history record
      await supabase.from('key_result_history' as any).insert({
        key_result_id: id,
        current_value: updates.currentValue ?? (data as any).current_value,
        confidence_level: updates.confidenceLevel ?? (data as any).confidence_level,
      });

      // Auto-update OKR progress based on all KRs
      const okrId = (data as any).okr_id;
      if (okrId) {
        const { data: allKRs } = await supabase
          .from('project_key_results')
          .select('*')
          .eq('okr_id', okrId);

        if (allKRs && allKRs.length > 0) {
          const avgProgress = allKRs.reduce((sum, kr) => {
            const target = kr.target_value || 0;
            const current = kr.current_value || 0;
            return sum + (target > 0 ? Math.min(100, (current / target) * 100) : 0);
          }, 0) / allKRs.length;

          await supabase
            .from('project_okrs')
            .update({ progress_percent: Math.round(avgProgress), updated_at: new Date().toISOString() })
            .eq('id', okrId);
        }
      }

      return { data, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project-okrs', result.projectId] });
      queryClient.invalidateQueries({ queryKey: ['key-result-history'] });
      toast({ title: 'Key Result atualizado', description: 'O resultado-chave foi atualizado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar Key Result', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteKeyResult = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('project_key_results').delete().eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-okrs', data.projectId] });
      toast({ title: 'Key Result excluído', description: 'O resultado-chave foi removido com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir Key Result', description: error.message, variant: 'destructive' });
    },
  });
};

// History Hook
export const useKeyResultHistory = (okrId: string | undefined, keyResultIds: string[]) => {
  return useQuery({
    queryKey: ['key-result-history', okrId, keyResultIds],
    queryFn: async () => {
      if (keyResultIds.length === 0) return [];
      const { data, error } = await supabase
        .from('key_result_history' as any)
        .select('*')
        .in('key_result_id', keyResultIds)
        .order('changed_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as KeyResultHistory[];
    },
    enabled: !!okrId && keyResultIds.length > 0,
  });
};
