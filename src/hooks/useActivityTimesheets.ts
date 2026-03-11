import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ActivityTimesheetEntry {
  id: string;
  employee_id: string;
  activity_type_id: string;
  work_date: string;
  hours: number;
  description: string | null;
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

export const useUpsertActivityTimesheet = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpsertActivityTimesheetInput) => {
      const { data, error } = await supabase
        .from('activity_timesheets')
        .upsert(
          [{
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
