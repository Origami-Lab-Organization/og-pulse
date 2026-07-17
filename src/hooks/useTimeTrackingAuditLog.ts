import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TimeTrackingAuditEntry {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  employees: { nome: string } | null;
}

export interface AuditLogFilters {
  employeeId?: string;
  dataInicio?: string;
  dataFim?: string;
}

export const useTimeTrackingAuditLog = (filters: AuditLogFilters) => {
  const { employee } = useAuth();

  return useQuery({
    queryKey: ['time-tracking-audit-log', employee?.tenant_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('time_tracking_audit_log')
        .select('*, employees:created_by(nome)')
        .order('created_at', { ascending: false })
        .limit(300);

      if (filters.employeeId) {
        query = query.eq('created_by', filters.employeeId);
      }
      if (filters.dataInicio) {
        query = query.gte('created_at', `${filters.dataInicio}T00:00:00`);
      }
      if (filters.dataFim) {
        query = query.lte('created_at', `${filters.dataFim}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TimeTrackingAuditEntry[];
    },
    enabled: !!employee?.tenant_id,
  });
};
