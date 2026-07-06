import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useNpsAvailability(): { isAvailable: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['nps-availability'],
    queryFn: async () => {
      const { error } = await supabase.from('nps_surveys' as never).select('id').limit(0)
      return { available: !error }
    },
    staleTime: 5 * 60 * 1000,
  })
  return { isAvailable: data?.available ?? false, isLoading }
}
