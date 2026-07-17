import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TimeEntryType = 'entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida';

export interface TimeEntry {
  id: string;
  tipo: TimeEntryType;
  horario: string;
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export const useTodayPunches = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['time-punches-today', employeeId],
    queryFn: async () => {
      const { start, end } = todayRange();
      const { data, error } = await supabase
        .from('time_entries')
        .select('id, tipo, horario')
        .eq('employee_id', employeeId)
        .gte('horario', start)
        .lte('horario', end)
        .order('horario', { ascending: true });

      if (error) throw error;
      return (data || []) as TimeEntry[];
    },
    enabled: !!employeeId,
  });
};

export const useMonthPunches = (employeeId: string | undefined, monthStart: string, monthEnd: string) => {
  return useQuery({
    queryKey: ['time-punches-month', employeeId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('id, tipo, horario')
        .eq('employee_id', employeeId)
        .gte('horario', `${monthStart}T00:00:00`)
        .lte('horario', `${monthEnd}T23:59:59`)
        .order('horario', { ascending: true });

      if (error) throw error;
      return (data || []) as TimeEntry[];
    },
    enabled: !!employeeId,
  });
};

function getGeolocation(): Promise<{ latitude: number | null; longitude: number | null }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      () => resolve({ latitude: null, longitude: null }),
      { timeout: 5000 },
    );
  });
}

export const useRecordPunch = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      tipo,
      employeeId,
      selfiePath,
      faceMatchStatus,
      faceMatchScore,
    }: {
      tipo: TimeEntryType;
      employeeId: string | undefined;
      selfiePath?: string | null;
      faceMatchStatus?: string | null;
      faceMatchScore?: number | null;
    }) => {
      const { latitude, longitude } = await getGeolocation();

      const { data, error } = await supabase.functions.invoke('record-time-punch', {
        body: {
          tipo,
          latitude,
          longitude,
          selfie_path: selfiePath ?? undefined,
          face_match_status: faceMatchStatus ?? undefined,
          face_match_score: faceMatchScore ?? undefined,
          origem: window.matchMedia('(display-mode: standalone)').matches ? 'pwa' : 'web',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { entry: data.entry as TimeEntry, employeeId };
    },
    onSuccess: ({ employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ['time-punches-today', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-daily-summary', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['time-bank-balance', employeeId] });
      toast({
        title: 'Marcação registrada',
        description: 'Seu ponto foi registrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Não foi possível registrar o ponto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
