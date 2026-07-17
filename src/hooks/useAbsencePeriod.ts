import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type AbsenceType = 'ferias' | 'atestado' | 'falta';

const TIPO_LABELS: Record<AbsenceType, string> = {
  ferias: 'Férias',
  atestado: 'Atestado',
  falta: 'Falta',
};

export interface RegisterAbsencePeriodInput {
  tipo: AbsenceType;
  employeeId: string;
  dataInicio: string;
  dataFim: string;
  motivo?: string;
}

export const useRegisterAbsencePeriod = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: RegisterAbsencePeriodInput) => {
      const { data, error } = await supabase.functions.invoke('register-absence-period', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.request;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-adjustment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['time-daily-summary'] });
      queryClient.invalidateQueries({ queryKey: ['time-bank-balance'] });
      queryClient.invalidateQueries({ queryKey: ['employees-jornada-overview'] });
      toast({
        title: `${TIPO_LABELS[variables.tipo]} lançado(a)`,
        description: 'O período foi registrado no ponto do colaborador.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Não foi possível lançar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
