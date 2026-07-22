import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ActivityTimesheetEntry {
  id: string;
  employee_id: string;
  activity_type_id: string;
  work_date: string;
  hours: number;
  description: string | null;
  is_locked?: boolean;
}

export const useActivityTimesheetsByRange = (
  employeeId: string | undefined,
  startDate: string,
  endDate: string,
) => {
  return useQuery({
    queryKey: ['activity-timesheets', employeeId, startDate, endDate],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from('activity_timesheets')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('work_date', startDate)
        .lte('work_date', endDate);

      if (error) throw error;
      return (data || []) as ActivityTimesheetEntry[];
    },
    enabled: !!employeeId,
  });
};

export interface UpsertActivityTimesheetInput {
  employeeId: string;
  activityTypeId: string;
  workDate: string;
  hours: number;
  description?: string;
}

export interface ClearWeekActivityInput {
  employeeId: string;
  weekStart: string; // yyyy-MM-dd
  weekEnd: string; // yyyy-MM-dd
}

/**
 * "Limpar": apaga as atividades internas NÃO TRAVADAS do funcionário na semana.
 * A RLS já permite apagar as próprias linhas não travadas.
 */
export const useClearWeekActivityTimesheets = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ employeeId, weekStart, weekEnd }: ClearWeekActivityInput) => {
      const { error } = await supabase
        .from('activity_timesheets')
        .delete()
        .eq('employee_id', employeeId)
        .gte('work_date', weekStart)
        .lte('work_date', weekEnd)
        .eq('is_locked', false);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activity-timesheets', variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['activity-timesheets'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao limpar horas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpsertActivityTimesheet = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async (input: UpsertActivityTimesheetInput) => {
      if (!employee?.tenant_id) throw new Error('Tenant não encontrado');
      const { data, error } = await supabase
        .from('activity_timesheets')
        .upsert(
          [{
            tenant_id: employee.tenant_id,
            employee_id: input.employeeId,
            activity_type_id: input.activityTypeId,
            work_date: input.workDate,
            hours: input.hours,
            description: input.description || null,
            updated_at: new Date().toISOString(),
          }],
          { onConflict: 'employee_id,activity_type_id,work_date' },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activity-timesheets', variables.employeeId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar horas',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
