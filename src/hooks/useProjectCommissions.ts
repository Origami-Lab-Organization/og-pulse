import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectCommission {
  id: string;
  project_id: string;
  installment_id: string | null;
  commission_percent: number;
  planned_value: number;
  is_paid: boolean;
  paid_date: string | null;
  paid_to: string | null;
  notes: string | null;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
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
      commissionPercent,
    }: {
      projectId: string;
      installments: { id: string }[];
      totalCommission: number;
      commissionPercent: number;
    }) => {
      if (installments.length === 0) return;
      const perInstallment = totalCommission / installments.length;

      const rows = installments.map((inst) => ({
        project_id: projectId,
        installment_id: inst.id,
        planned_value: Math.round(perInstallment * 100) / 100,
        commission_percent: commissionPercent,
        approval_status: 'approved',
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
      planned_value,
      commission_percent,
    }: {
      id: string;
      is_paid?: boolean;
      paid_date?: string | null;
      paid_to?: string | null;
      notes?: string | null;
      planned_value?: number;
      commission_percent?: number;
    }) => {
      const updates: Record<string, any> = {};
      if (is_paid !== undefined) updates.is_paid = is_paid;
      if (paid_date !== undefined) updates.paid_date = paid_date;
      if (paid_to !== undefined) updates.paid_to = paid_to;
      if (notes !== undefined) updates.notes = notes;
      if (planned_value !== undefined) updates.planned_value = planned_value;
      if (commission_percent !== undefined) updates.commission_percent = commission_percent;

      const { error } = await supabase
        .from('project_commissions' as any)
        .update(updates as any)
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

export function useCreateManualCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      planned_value,
      paid_to,
      notes,
      requested_by,
    }: {
      projectId: string;
      planned_value: number;
      paid_to: string;
      notes?: string;
      requested_by: string;
    }) => {
      const { error } = await supabase
        .from('project_commissions' as any)
        .insert({
          project_id: projectId,
          planned_value,
          paid_to,
          notes: notes || null,
          commission_percent: 0,
          approval_status: 'pending',
          requested_by,
        } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-commissions', vars.projectId] });
      toast.success('Solicitação de comissão enviada para aprovação');
    },
    onError: (err: any) => {
      toast.error('Erro ao solicitar comissão: ' + err.message);
    },
  });
}

export function useApproveCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      approved,
      approved_by,
      rejection_reason,
    }: {
      id: string;
      approved: boolean;
      approved_by: string;
      rejection_reason?: string;
    }) => {
      const updates: Record<string, any> = {
        approval_status: approved ? 'approved' : 'rejected',
        approved_by,
        approved_at: new Date().toISOString(),
      };
      if (!approved && rejection_reason) {
        updates.rejection_reason = rejection_reason;
      }

      const { error } = await supabase
        .from('project_commissions' as any)
        .update(updates as any)
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
