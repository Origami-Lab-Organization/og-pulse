import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { endOfMonth, format, isWeekend, subDays } from 'date-fns';
import { Holiday } from '@/types/holiday';
import { isHoliday } from '@/hooks/useHolidays';

export interface ActualChangeEntry {
  type: 'project' | 'internal_activity';
  /** project_member_id for projects, activity_type_id for activities */
  referenceId: string;
  /** project_id — required for project type */
  projectId?: string;
  employeeId: string;
  month: number;
  year: number;
  fromHours: number;
  toHours: number;
  itemTitle: string;
  monthLabel: string;
  /** Specific work date for the correction (yyyy-MM-dd) */
  workDate?: string;
}

function getLastWorkingDay(year: number, month: number, holidays: Holiday[]): string {
  let d = endOfMonth(new Date(year, month - 1));
  while (isWeekend(d) || isHoliday(d, holidays)) {
    d = subDays(d, 1);
  }
  return format(d, 'yyyy-MM-dd');
}

export const useAllocationActualEdits = (holidays: Holiday[]) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      changes,
      reasonCode,
      justification,
    }: {
      changes: ActualChangeEntry[];
      reasonCode: string;
      justification: string;
    }) => {
      if (!employee?.id || !employee.tenant_id || !user?.id) throw new Error('Sessão não encontrada');
      const authUserId = user.id;

      let persisted = 0;

      for (const change of changes) {
        const delta = change.toHours - change.fromHours;
        if (Math.round(delta * 10) === 0) continue;

        const workDate = change.workDate || getLastWorkingDay(change.year, change.month, holidays);

        if (change.type === 'project') {
          // Upsert project_timesheets adjustment record on last working day
          const { data: existing } = await supabase
            .from('project_timesheets')
            .select('id, hours')
            .eq('project_member_id', change.referenceId)
            .eq('work_date', workDate)
            .maybeSingle();

          let timesheetId: string;

          if (existing) {
            const { data: updated, error } = await supabase
              .from('project_timesheets')
              .update({ hours: Math.max(0, change.toHours), updated_at: new Date().toISOString() })
              .eq('id', existing.id)
              .select('id');
            if (error) throw error;
            if (!updated || updated.length === 0) throw new Error('Sem permissão para corrigir este lançamento.');
            timesheetId = existing.id;
          } else {
            const { data: created, error } = await supabase
              .from('project_timesheets')
              .insert([{
                project_id: change.projectId!,
                project_member_id: change.referenceId,
                work_date: workDate,
                hours: Math.max(0, change.toHours),
              }])
              .select('id')
              .single();
            if (error) throw error;
            timesheetId = created.id;
          }

          // Log audit
          const { error: logError } = await supabase.from('timesheet_edit_logs').insert([{
            timesheet_id: timesheetId,
            edited_by: authUserId,
            previous_hours: change.fromHours,
            new_hours: change.toHours,
            reason_code: reasonCode,
            justification,
          }]);
          if (logError) throw logError;
          persisted++;
        } else {
          // internal_activity — upsert activity_timesheets adjustment on last working day
          const { data: existing } = await supabase
            .from('activity_timesheets')
            .select('id, hours')
            .eq('employee_id', change.employeeId)
            .eq('activity_type_id', change.referenceId)
            .eq('work_date', workDate)
            .maybeSingle();

          let actTimesheetId: string;

          if (existing) {
            const { data: updated, error } = await supabase
              .from('activity_timesheets')
              .update({ hours: Math.max(0, change.toHours), updated_at: new Date().toISOString() })
              .eq('id', existing.id)
              .select('id');
            if (error) throw error;
            if (!updated || updated.length === 0) throw new Error('Sem permissão para corrigir este lançamento.');
            actTimesheetId = existing.id;
          } else {
            const { data: created, error } = await supabase
              .from('activity_timesheets')
              .insert([{
                tenant_id: employee.tenant_id,
                employee_id: change.employeeId,
                activity_type_id: change.referenceId,
                work_date: workDate,
                hours: Math.max(0, change.toHours),
              }])
              .select('id')
              .single();
            if (error) throw error;
            actTimesheetId = created.id;
          }

          // Log audit
          const { error: logError } = await supabase.from('activity_timesheet_edit_logs').insert([{
            activity_timesheet_id: actTimesheetId,
            edited_by: authUserId,
            previous_hours: change.fromHours,
            new_hours: change.toHours,
            reason_code: reasonCode,
            justification,
          }]);
          if (logError) throw logError;
          persisted++;
        }
      }

      return persisted;
    },
    onSuccess: (persisted) => {
      queryClient.invalidateQueries({ queryKey: ['allocation-overview-planner'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['activity-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['correction-week-data'] });
      toast({ title: 'Horas reais atualizadas', description: `${persisted} correção(ões) aplicada(s) com sucesso.` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao corrigir horas', description: error.message, variant: 'destructive' });
    },
  });
};
