import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { endOfMonth, format, isWeekend, subDays } from 'date-fns';
import { Holiday } from '@/types/holiday';
import { isHoliday } from '@/hooks/useHolidays';

/** Motivos da correção de horas. Também rotulam o aviso que a pessoa recebe e a auditoria. */
export const CORRECTION_REASONS = [
  { value: 'wrong_hours', label: 'Horas incorretas' },
  { value: 'wrong_item', label: 'Item incorreto' },
  { value: 'post_approval_fix', label: 'Correção pós-aprovação' },
  { value: 'employee_request', label: 'Pedido do colaborador' },
  { value: 'other', label: 'Outro' },
] as const;

export const correctionReasonLabel = (code: string | null | undefined) =>
  CORRECTION_REASONS.find((r) => r.value === code)?.label ?? 'Correção';

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

const MAX_CHANGES_IN_MESSAGE = 5;

const mondayOf = (isoDate: string) => {
  const d = new Date(isoDate + 'T12:00:00');
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return format(d, 'yyyy-MM-dd');
};

/** `type`, não `interface`: vai dentro do `metadata` (Json), que só aceita tipo literal. */
type AppliedChange = {
  item: string;
  date: string;
  old_hours: number;
  new_hours: number;
};

/**
 * Avisa a pessoa que as horas dela foram corrigidas (decisão do Italo, 01/10/2026): um aviso por
 * correção, com o que mudou, o motivo e a justificativa. Mesmo tipo e formato do aviso da
 * aprovação de timesheet (`useTimesheetSubmissions`), para a caixa de entrada mostrar igual.
 * Falha no aviso não desfaz a correção: ela já está gravada e registrada.
 */
async function notifyCorrection(params: {
  tenantId: string;
  editorEmployeeId: string;
  editorName: string;
  recipientEmployeeId: string;
  applied: AppliedChange[];
  reasonCode: string;
  justification: string;
}): Promise<void> {
  const { tenantId, editorEmployeeId, editorName, recipientEmployeeId, applied, reasonCode, justification } = params;
  if (applied.length === 0 || recipientEmployeeId === editorEmployeeId) return;
  const lines = applied
    .slice(0, MAX_CHANGES_IN_MESSAGE)
    .map((c) => `${c.item} (${format(new Date(c.date + 'T12:00:00'), 'dd/MM')}): ${c.old_hours}h → ${c.new_hours}h`);
  const more = applied.length > MAX_CHANGES_IN_MESSAGE ? `\n… e mais ${applied.length - MAX_CHANGES_IN_MESSAGE}.` : '';
  const first = applied[0];
  const { error } = await supabase.from('notifications').insert([{
    type: 'timesheet_modified',
    category: 'timesheet',
    priority: 'normal',
    action_type: 'navigate',
    action_url: `/my-timesheet?week=${mondayOf(first.date)}`,
    recipient_id: recipientEmployeeId,
    tenant_id: tenantId,
    title: `Suas horas foram corrigidas por ${editorName}`,
    message: `${lines.join('\n')}${more}\n\nMotivo: ${correctionReasonLabel(reasonCode)}. ${justification}`,
    metadata: {
      editor_name: editorName,
      reason_code: reasonCode,
      reason_label: correctionReasonLabel(reasonCode),
      justification,
      changes: applied,
      ...(applied.length === 1 ? { old_hours: first.old_hours, new_hours: first.new_hours, date: first.date } : {}),
    },
    is_read: false,
    is_resolved: false,
  }]);
  if (error) console.error('Falha ao avisar a correção de horas:', error.code);
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
      const applied: AppliedChange[] = [];

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
          applied.push({ item: change.itemTitle, date: workDate, old_hours: change.fromHours, new_hours: change.toHours });
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
          applied.push({ item: change.itemTitle, date: workDate, old_hours: change.fromHours, new_hours: change.toHours });
        }
      }

      const recipient = changes[0]?.employeeId;
      if (recipient) {
        await notifyCorrection({
          tenantId: employee.tenant_id,
          editorEmployeeId: employee.id,
          editorName: employee.nome,
          recipientEmployeeId: recipient,
          applied,
          reasonCode,
          justification,
        });
      }

      return persisted;
    },
    onSuccess: (persisted) => {
      queryClient.invalidateQueries({ queryKey: ['allocation-overview-planner'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['activity-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['correction-week-data'] });
      queryClient.invalidateQueries({ queryKey: ['rateio-centro-custo'] });
      queryClient.invalidateQueries({ queryKey: ['auditoria-horas'] });
      toast({ title: 'Horas reais atualizadas', description: `${persisted} correção(ões) aplicada(s) com sucesso.` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao corrigir horas', description: error.message, variant: 'destructive' });
    },
  });
};
