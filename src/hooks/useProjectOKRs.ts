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
  KeyResultStatus,
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

      // Fetch key results for each OKR
      const okrIds = okrs.map((o) => o.id);
      const { data: keyResults, error: krError } = await supabase
        .from('project_key_results')
        .select('*')
        .in('okr_id', okrIds.length > 0 ? okrIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: true });

      if (krError) throw krError;

      // Map key results to OKRs
      return okrs.map((okr) => ({
        ...okr,
        status: okr.status as OKRStatus,
        key_results: (keyResults || [])
          .filter((kr) => kr.okr_id === okr.id)
          .map((kr) => ({
            ...kr,
            status: kr.status as KeyResultStatus,
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
      toast({
        title: 'Objetivo criado',
        description: 'O objetivo foi adicionado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar objetivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateOKR = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      updates,
    }: {
      id: string;
      projectId: string;
      updates: UpdateOKRInput;
    }) => {
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
      toast({
        title: 'Objetivo atualizado',
        description: 'O objetivo foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar objetivo',
        description: error.message,
        variant: 'destructive',
      });
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
      toast({
        title: 'Objetivo excluído',
        description: 'O objetivo foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir objetivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Key Result Hooks
export const useCreateKeyResult = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      input,
      projectId,
    }: {
      input: CreateKeyResultInput;
      projectId: string;
    }) => {
      const { data, error } = await supabase
        .from('project_key_results')
        .insert({
          okr_id: input.okrId,
          description: input.description,
          target_value: input.targetValue || null,
          unit: input.unit || null,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project-okrs', result.projectId] });
      toast({
        title: 'Key Result criado',
        description: 'O resultado-chave foi adicionado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar Key Result',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateKeyResult = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      updates,
    }: {
      id: string;
      projectId: string;
      updates: UpdateKeyResultInput;
    }) => {
      const { data, error } = await supabase
        .from('project_key_results')
        .update({
          description: updates.description,
          target_value: updates.targetValue,
          current_value: updates.currentValue,
          unit: updates.unit,
          status: updates.status,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project-okrs', result.projectId] });
      toast({
        title: 'Key Result atualizado',
        description: 'O resultado-chave foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar Key Result',
        description: error.message,
        variant: 'destructive',
      });
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
      toast({
        title: 'Key Result excluído',
        description: 'O resultado-chave foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir Key Result',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
