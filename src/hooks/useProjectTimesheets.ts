import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { todasAsPaginas } from '@/lib/paginacao';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';

export interface ProjectTimesheetDB {
  id: string;
  project_id: string;
  project_member_id: string;
  work_date: string;
  hours: number;
  description: string | null;
  cost_per_hour: number | null;
  created_at: string;
  created_by: string | null;
  /** Pessoa da hora, pelo vínculo gravado no lançamento (não pela equipe carregada no projeto). */
  project_member?: { employee_id: string } | null;
}

export interface CreateTimesheetInput {
  projectId: string;
  projectMemberId: string;
  workDate: string;
  hours: number;
  description?: string;
}

export interface BatchUpsertTimesheetInput {
  projectId: string;
  projectMemberId: string;
  workDate: string;
  hours: number;
  description?: string;
}

/** Horas lançadas no projeto inteiro, com a pessoa de cada hora. Também usado pelo portfólio. */
export function fetchProjectTimesheets(projectId: string): Promise<ProjectTimesheetDB[]> {
  // O projeto inteiro, desde o início: passa de 1000 linhas e o custo sairia menor.
  return todasAsPaginas<ProjectTimesheetDB>((de, ate) =>
    supabase
      .from('project_timesheets')
      // A pessoa vem do vínculo da própria hora, como na aba Equipe: `project.members`
      // pode vir sem a linha da pessoa (TD-0014, US-0027).
      .select('*, project_member:project_members(employee_id)')
      .eq('project_id', projectId)
      .order('work_date', { ascending: false })
      .order('id')
      .range(de, ate),
  );
}

export const useProjectTimesheets = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-timesheets', projectId],
    queryFn: () => (projectId ? fetchProjectTimesheets(projectId) : Promise.resolve([])),
    enabled: !!projectId,
  });
};

export const useTimesheetsByMembers = (projectMemberIds: string[]) => {
  return useQuery({
    queryKey: ['timesheets-by-members', projectMemberIds],
    queryFn: async () => {
      if (projectMemberIds.length === 0) return [];

      return todasAsPaginas<ProjectTimesheetDB>((de, ate) =>
        supabase
          .from('project_timesheets')
          .select('*')
          .in('project_member_id', projectMemberIds)
          .order('work_date', { ascending: true })
          .order('id')
          .range(de, ate),
      );
    },
    enabled: projectMemberIds.length > 0,
  });
};

export const useCreateTimesheet = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateTimesheetInput) => {
      const { data, error } = await supabase
        .from('project_timesheets')
        .insert({
          project_id: input.projectId,
          project_member_id: input.projectMemberId,
          work_date: input.workDate,
          hours: input.hours,
          description: input.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-timesheets', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-members'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-date-range'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast({
        title: 'Timesheet registrado',
        description: 'As horas foram registradas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao registrar timesheet',
        description: mensagemParaUsuario(error),
        variant: 'destructive',
      });
    },
  });
};

export const useUpsertTimesheet = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateTimesheetInput) => {
      const { data, error } = await supabase
        .from('project_timesheets')
        .upsert(
          {
            project_id: input.projectId,
            project_member_id: input.projectMemberId,
            work_date: input.workDate,
            hours: input.hours,
            description: input.description || null,
          },
          { onConflict: 'project_member_id,work_date' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-timesheets', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-members'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-date-range'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar timesheet',
        description: mensagemParaUsuario(error),
        variant: 'destructive',
      });
    },
  });
};

export const useBatchUpsertTimesheets = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (inputs: BatchUpsertTimesheetInput[]) => {
      if (inputs.length === 0) return [];

      const records = inputs.map((input) => ({
        project_id: input.projectId,
        project_member_id: input.projectMemberId,
        work_date: input.workDate,
        hours: input.hours,
        description: input.description || null,
      }));

      const { data, error } = await supabase
        .from('project_timesheets')
        .upsert(records, { onConflict: 'project_member_id,work_date' })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-members'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-date-range'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar timesheets',
        description: mensagemParaUsuario(error),
        variant: 'destructive',
      });
    },
  });
};

export interface ClearWeekProjectInput {
  projectMemberIds: string[];
  weekStart: string; // yyyy-MM-dd
  weekEnd: string; // yyyy-MM-dd
}

/**
 * "Limpar": apaga os lançamentos de projeto NÃO TRAVADOS dos membros na semana,
 * voltando as células ao estado de sugestão. Nunca toca em dias travados/enviados.
 */
export const useClearWeekProjectTimesheets = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectMemberIds, weekStart, weekEnd }: ClearWeekProjectInput) => {
      if (projectMemberIds.length === 0) return;
      const { error } = await supabase
        .from('project_timesheets')
        .delete()
        .in('project_member_id', projectMemberIds)
        .gte('work_date', weekStart)
        .lte('work_date', weekEnd)
        .eq('is_locked', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-members'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-date-range'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao limpar horas',
        description: mensagemParaUsuario(error),
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteTimesheet = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_timesheets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-members'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-date-range'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast({
        title: 'Timesheet removido',
        description: 'O registro foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover timesheet',
        description: mensagemParaUsuario(error),
        variant: 'destructive',
      });
    },
  });
};
