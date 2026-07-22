import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseEmployeeAvailabilityParams {
  tenantId: string | undefined;
  employeeId: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
  enabled?: boolean;
}

export interface EmployeeAvailability {
  capacityHours: number;
}

export function useEmployeeAvailability({
  tenantId,
  employeeId,
  startDate,
  endDate,
  enabled = true,
}: UseEmployeeAvailabilityParams) {
  return useQuery({
    queryKey: ['employee-availability', tenantId, employeeId, startDate, endDate],
    queryFn: async (): Promise<EmployeeAvailability> => {
      if (!tenantId || !employeeId || !startDate || !endDate) {
        return { capacityHours: 0 };
      }

      const { data, error } = await supabase.rpc('calculate_employee_capacity_hours', {
        p_tenant_id: tenantId,
        p_employee_id: employeeId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;

      return { capacityHours: Math.round(Number(data) || 0) };
    },
    enabled: enabled && !!tenantId && !!employeeId && !!startDate && !!endDate,
    refetchOnWindowFocus: true,
  });
}
