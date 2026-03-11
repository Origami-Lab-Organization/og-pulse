import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MyActivityType {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

export const useMyActivityTypes = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['my-activity-types', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      // Fetch all active activity types for the tenant
      const { data: allTypes, error } = await supabase
        .from('activity_types')
        .select(`
          id, name, description, color, applies_to_all,
          activity_type_employees(employee_id)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (allTypes || [])
        .filter((at: any) => {
          if (at.applies_to_all) return true;
          return at.activity_type_employees?.some((e: any) => e.employee_id === employeeId);
        })
        .map((at: any) => ({
          id: at.id,
          name: at.name,
          description: at.description,
          color: at.color,
        })) as MyActivityType[];
    },
    enabled: !!employeeId,
  });
};
