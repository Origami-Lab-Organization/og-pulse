import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MyActivityType {
  id: string;
  name: string;
  description: string | null;
}

/**
 * @param weekEndDate - last day of the week being viewed (yyyy-MM-dd).
 *   Only activity types created on or before this date are returned,
 *   so past weeks don't show activities that didn't exist yet.
 */
export const useMyActivityTypes = (employeeId: string | undefined, weekEndDate?: string) => {
  return useQuery({
    queryKey: ['my-activity-types', employeeId, weekEndDate],
    queryFn: async () => {
      if (!employeeId) return [];

      let query = (supabase as any)
        .from('activity_types')
        .select(`
          id, name, description, applies_to_all,
          activity_type_employees(employee_id)
        `)
        .eq('is_active', true)
        .order('name');

      // Only show activities that existed during the viewed week
      if (weekEndDate) {
        query = query.lte('created_at', weekEndDate + 'T23:59:59Z');
      }

      const { data: allTypes, error } = await query;

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
        })) as MyActivityType[];
    },
    enabled: !!employeeId,
  });
};
