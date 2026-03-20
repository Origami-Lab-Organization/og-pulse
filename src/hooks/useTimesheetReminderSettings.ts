import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TimesheetReminderSettingsDB {
  id: string;
  tenant_id: string;
  employee_reminder_enabled: boolean;
  employee_reminder_day: number;
  employee_reminder_time: string;
  manager_alert_enabled: boolean;
  manager_alert_time: string;
  notification_channels: string[];
}

export interface UpdateTimesheetReminderSettingsInput {
  employee_reminder_enabled: boolean;
  employee_reminder_day: number;
  employee_reminder_time: string;
  manager_alert_enabled: boolean;
  manager_alert_time: string;
}

export const useTimesheetReminderSettings = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['timesheet-reminder-settings', tenantId],
    queryFn: async (): Promise<TimesheetReminderSettingsDB | null> => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('timesheet_reminder_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
};

export const useUpdateTimesheetReminderSettings = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: UpdateTimesheetReminderSettingsInput) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const { error } = await supabase
        .from('timesheet_reminder_settings')
        .upsert({ tenant_id: tenantId, ...input }, { onConflict: 'tenant_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheet-reminder-settings', tenantId] });
      toast({ title: 'Configurações salvas com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar configurações.', variant: 'destructive' });
    },
  });
};
