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
  const { employee } = useAuth();

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
      if (!employee?.id || !employee.tenant_id) throw new Error('Sessão não encontrada');

      let persisted = 0;

      for (const change of changes) {
        const delta = change.toHours - change.fromHours;
        if (Math.round(delta * 10) === 0) continue;

        const workDate = getLastWorkingDay(change.year, change.month, holidays);

        if (change.type === 'project') {
          // Upsert project_timesheets adjustment record on last working day
          const { data: existing } = await supabase
            .from('project_timesheets')
            .select('id, hours')
            .eq('project_member_id', change.referenceId)
            .eq('work_date', workDate)
            .maybeSingle();

          let timesheetId: string;
          const previousHours = existing?.hours ?? 0;
          const newHours = previousHours + delta;

          if (existing) {
            const { error } = await supabase
              .from('project_timesheets')
              .update({ hours: Math.max(0, newHours), updated_at: new Date().toISOString() })
              .eq('id', existing.id);
            if (error) throw error;
            timesheetId = existing.id;
          } else {
            const { data: created, error } = await supabase
              .from('project_timesheets')
              .insert([{
                project_member_id: change.referenceId,
                work_date: workDate,
                hours: Math.max(0, delta),
              }])
              .select('id')
              .single();
            if (error) throw error;
            timesheetId = created.id;
          }

          // Log audit
          await supabase.from('timesheet_edit_logs').insert([{
            timesheet_id: timesheetId,
            edited_by: employee.id,
            previous_hours: change.fromHours,
            new_hours: change.toHours,
            reason_code: reasonCode,
            justification,
          }]);
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
          const previousHours = existing?.hours ?? 0;
          const newHours = previousHours + delta;

          if (existing) {
            const { error } = await supabase
              .from('activity_timesheets')
              .update({ hours: Math.max(0, newHours), updated_at: new Date().toISOString() })
              .eq('id', existing.id);
            if (error) throw error;
            actTimesheetId = existing.id;
          } else {
            const { data: created, error } = await supabase
              .from('activity_timesheets')
              .insert([{
                tenant_id: employee.tenant_id,
                employee_id: change.employeeId,
                activity_type_id: change.referenceId,
                work_date: workDate,
                hours: Math.max(0, delta),
              }])
              .select('id')
              .single();
            if (error) throw error;
            actTimesheetId = created.id;
          }

          // Log audit
          await supabase.from('activity_timesheet_edit_logs').insert([{
            activity_timesheet_id: actTimesheetId,
            edited_by: employee.id,
            previous_hours: change.fromHours,
            new_hours: change.toHours,
            reason_code: reasonCode,
            justification,
          }]);
          persisted++;
        }
      }

      return persisted;
    },
    onSuccess: (persisted) => {
      queryClient.invalidateQueries({ queryKey: ['allocation-overview-planner'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['activity-timesheets'] });
      toast({ title: 'Horas reais atualizadas', description: `${persisted} correção(ões) aplicada(s) com sucesso.` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao corrigir horas', description: error.message, variant: 'destructive' });
    },
  });
};
