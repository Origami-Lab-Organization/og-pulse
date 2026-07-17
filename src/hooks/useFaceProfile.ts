import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FaceProfileStatus {
  consentimento_aceito_em: string;
  consentimento_versao: string;
}

export const useFaceProfile = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['face-profile', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_punch_face_profiles')
        .select('consentimento_aceito_em, consentimento_versao')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error) throw error;
      return data as FaceProfileStatus | null;
    },
    enabled: !!employeeId,
  });
};

/** Busca o descriptor sob demanda (não fica em cache de query) — só quando o colaborador vai confirmar um ponto. */
export async function fetchFaceDescriptor(employeeId: string): Promise<number[] | null> {
  const { data, error } = await supabase
    .from('time_punch_face_profiles')
    .select('descriptor')
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error) throw error;
  return (data?.descriptor as number[] | undefined) ?? null;
}

export const useEnrollFaceProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ descriptor, consentimentoVersao }: { descriptor: number[]; consentimentoVersao: string }) => {
      const { data, error } = await supabase.functions.invoke('enroll-face-profile', {
        body: { descriptor, consentimento_aceito: true, consentimento_versao: consentimentoVersao },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['face-profile'] });
      toast({
        title: 'Reconhecimento facial ativado',
        description: 'Seu rosto foi cadastrado para confirmar suas marcações de ponto.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Não foi possível cadastrar o reconhecimento facial',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteFaceProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('delete-face-profile', { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['face-profile'] });
      toast({
        title: 'Dados biométricos removidos',
        description: 'Seu cadastro de reconhecimento facial foi excluído.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Não foi possível remover o cadastro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
