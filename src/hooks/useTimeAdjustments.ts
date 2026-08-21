import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { TimeEntryType } from '@/hooks/useTimePunches';

export type TimeAdjustmentType = 'ajuste_ponto' | 'hora_extra' | 'atestado' | 'ferias' | 'falta';

export interface TimeAdjustmentRequest {
  id: string;
  employee_id: string;
  tipo: TimeAdjustmentType;
  data_referencia: string;
  data_fim: string | null;
  tipo_marcacao: TimeEntryType | null;
  horario_solicitado: string | null;
  horas_solicitadas: number | null;
  motivo: string;
  anexo_path: string | null;
  anexo_nome: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  decidido_em: string | null;
  motivo_decisao: string | null;
  created_at: string;
  employees?: { nome: string } | null;
}

export interface SubmitAdjustmentInput {
  tipo: 'ajuste_ponto' | 'hora_extra' | 'atestado';
  data_referencia: string;
  data_fim?: string;
  tipo_marcacao?: TimeEntryType;
  horario_solicitado?: string;
  entry_id_original?: string;
  horas_solicitadas?: number;
  motivo: string;
  anexo_path?: string;
  anexo_nome?: string;
}

export const useMyAdjustmentRequests = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['time-adjustment-requests', 'mine', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_adjustment_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TimeAdjustmentRequest[];
    },
    enabled: !!employeeId,
  });
};

export const usePendingAdjustmentRequests = () => {
  const { employee } = useAuth();
  return useQuery({
    queryKey: ['time-adjustment-requests', 'pending', employee?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_adjustment_requests')
        .select('*, employees!time_adjustment_requests_employee_id_fkey(nome)')
        .eq('status', 'pendente')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as TimeAdjustmentRequest[];
    },
    enabled: !!employee?.tenant_id,
  });
};

export const useAllAdjustmentRequests = () => {
  const { employee } = useAuth();
  return useQuery({
    queryKey: ['time-adjustment-requests', 'all', employee?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_adjustment_requests')
        .select('*, employees!time_adjustment_requests_employee_id_fkey(nome)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []) as TimeAdjustmentRequest[];
    },
    enabled: !!employee?.tenant_id,
  });
};

export const useSubmitTimeAdjustment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async (input: SubmitAdjustmentInput) => {
      const { data, error } = await supabase.functions.invoke('submit-time-adjustment', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.request as TimeAdjustmentRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-adjustment-requests', 'mine', employee?.id] });
      toast({
        title: 'Solicitação enviada',
        description: 'O administrador vai analisar sua solicitação.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Não foi possível enviar a solicitação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDecideAdjustment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ requestId, decisao, motivoDecisao }: {
      requestId: string;
      decisao: 'aprovado' | 'rejeitado';
      motivoDecisao?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('decide-time-adjustment', {
        body: { requestId, decisao, motivo_decisao: motivoDecisao },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.request as TimeAdjustmentRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-adjustment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['time-daily-summary'] });
      queryClient.invalidateQueries({ queryKey: ['time-bank-balance'] });
      toast({
        title: 'Decisão registrada',
        description: 'A solicitação foi atualizada.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Não foi possível registrar a decisão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
