import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ServiceDB } from '@/types/service';

export function useServices() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: ['services', tenantId],
    queryFn: async (): Promise<ServiceDB[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data as unknown as ServiceDB[]) || [];
    },
    enabled: !!tenantId,
  });
}
