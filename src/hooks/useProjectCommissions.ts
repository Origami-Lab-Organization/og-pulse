import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectCommission {
  id: string;
  project_id: string;
  installment_id: string;
  planned_value: number;
  is_paid: boolean;
  paid_date: string | null;
  paid_to: string | null;
  notes: string | null;
  created_at: string;
}

export function useProjectCommissions(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-commissions', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_commissions' as any)
        .select('*')
        .eq('project_id', projectId!);
      if (error) throw error;
      return (data || []) as unknown as ProjectCommission[];
    },
  });
}

export function useGenerateCommissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      installments,
      totalCommission,
    }: {
      projectId: string;
      installments: { id: string }[];
      totalCommission: number;
    }) => {
      if (installments.length === 0) return;
      const perInstallment = totalCommission / installments.length;

      const rows = installments.map((inst) => ({
        project_id: projectId,
        installment_id: inst.id,
        planned_value: Math.round(perInstallment * 100) / 100,
      }));

      const { error } = await supabase
        .from('project_commissions' as any)
        .insert(rows as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-commissions', vars.projectId] });
      toast.success('Comissões geradas com sucesso');
    },
    onError: (err: any) => {
      toast.error('Erro ao gerar comissões: ' + err.message);
    },
  });
}

export function useUpdateCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      is_paid,
      paid_date,
      paid_to,
      notes,
    }: {
      id: string;
      is_paid: boolean;
      paid_date?: string | null;
      paid_to?: string | null;
      notes?: string | null;
    }) => {
      const { error } = await supabase
        .from('project_commissions' as any)
        .update({ is_paid, paid_date, paid_to, notes } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-commissions'] });
      toast.success('Comissão atualizada');
    },
    onError: (err: any) => {
      toast.error('Erro ao atualizar comissão: ' + err.message);
    },
  });
}
