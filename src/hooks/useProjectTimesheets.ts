import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export const useProjectTimesheets = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-timesheets', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_timesheets')
        .select('*')
        .eq('project_id', projectId)
        .order('work_date', { ascending: false });

      if (error) throw error;
      return data as ProjectTimesheetDB[];
    },
    enabled: !!projectId,
  });
};

export const useTimesheetsByMembers = (projectMemberIds: string[]) => {
  return useQuery({
    queryKey: ['timesheets-by-members', projectMemberIds],
    queryFn: async () => {
      if (projectMemberIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('project_timesheets')
        .select('*')
        .in('project_member_id', projectMemberIds)
        .order('work_date', { ascending: true });

      if (error) throw error;
      return data as ProjectTimesheetDB[];
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
        description: error.message,
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
        description: error.message,
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
        description: error.message,
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
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
