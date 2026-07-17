import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface TimeTrackingSettings {
  tolerancia_entrada_minutos: number;
  tolerancia_saida_minutos: number;
  intervalo_minimo_minutos: number;
  limite_horas_extras_diarias: number;
  exigir_selfie: boolean;
}

const DEFAULT_SETTINGS: TimeTrackingSettings = {
  tolerancia_entrada_minutos: 10,
  tolerancia_saida_minutos: 10,
  intervalo_minimo_minutos: 60,
  limite_horas_extras_diarias: 2,
  exigir_selfie: false,
};

export const useTimeTrackingSettings = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['time-tracking-settings', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_tracking_settings')
        .select('tolerancia_entrada_minutos, tolerancia_saida_minutos, intervalo_minimo_minutos, limite_horas_extras_diarias, exigir_selfie')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      return (data as TimeTrackingSettings | null) ?? DEFAULT_SETTINGS;
    },
    enabled: !!tenantId,
  });
};

export const useUpsertTimeTrackingSettings = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (settings: TimeTrackingSettings) => {
      if (!tenantId) throw new Error('Tenant não identificado');

      const { error } = await supabase
        .from('time_tracking_settings')
        .upsert({ tenant_id: tenantId, ...settings }, { onConflict: 'tenant_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking-settings', tenantId] });
      toast({
        title: 'Configurações salvas',
        description: 'As regras de jornada foram atualizadas.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar configurações',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
