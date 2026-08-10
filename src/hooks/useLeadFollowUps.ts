import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LeadFollowUp {
  id: string;
  tenant_id: string;
  lead_id: string;
  assigned_to: string | null;
  description: string;
  scheduled_at: string;
  status: 'pending' | 'done' | 'skipped';
  notified: boolean;
  created_by: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFollowUpInput {
  lead_id: string;
  description: string;
  scheduled_at: string;
  assigned_to?: string | null;
}

export function useLeadFollowUps(leadId: string | null) {
  const { employee } = useAuth();
  return useQuery<LeadFollowUp[]>({
    queryKey: ['lead-follow-ups', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_follow_ups' as any)
        .select('*')
        .eq('lead_id', leadId!)
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LeadFollowUp[];
    },
    enabled: !!leadId && !!employee,
  });
}

/**
 * Junta `leads` com `!inner` para descartar follow-ups de oportunidade
 * arquivada: sem isso, negócios já perdidos continuariam cobrando retorno nos
 * indicadores e no widget de urgentes.
 */
const PENDING_SELECT = '*, lead:leads!inner(archived)';

export function useAllPendingFollowUps() {
  const { employee } = useAuth();
  return useQuery<LeadFollowUp[]>({
    queryKey: ['all-pending-follow-ups', employee?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_follow_ups' as any)
        .select(PENDING_SELECT)
        .eq('tenant_id', employee!.tenant_id)
        .eq('status', 'pending')
        .eq('lead.archived', false)
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LeadFollowUp[];
    },
    enabled: !!employee?.tenant_id,
    // Reusa o mesmo mecanismo de polling (60s) — alimenta o indicador de "vencido"
    // dos cards do Pipeline sem novo mecanismo (GP-J5 CA-04).
    refetchInterval: 60000,
  });
}

export function useMyPendingFollowUps() {
  const { employee } = useAuth();
  return useQuery<LeadFollowUp[]>({
    queryKey: ['my-pending-follow-ups', employee?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_follow_ups' as any)
        .select(PENDING_SELECT)
        .eq('assigned_to', employee!.id)
        .eq('status', 'pending')
        .eq('lead.archived', false)
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LeadFollowUp[];
    },
    enabled: !!employee?.id,
    refetchInterval: 60000,
  });
}

export function useCreateFollowUp() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateFollowUpInput) => {
      const { data, error } = await supabase
        .from('lead_follow_ups' as any)
        .insert({
          tenant_id: employee!.tenant_id,
          lead_id: input.lead_id,
          description: input.description,
          scheduled_at: input.scheduled_at,
          assigned_to: input.assigned_to ?? employee!.id,
          created_by: employee!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LeadFollowUp;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['lead-follow-ups', variables.lead_id] });
      qc.invalidateQueries({ queryKey: ['all-pending-follow-ups'] });
      qc.invalidateQueries({ queryKey: ['my-pending-follow-ups'] });
    },
  });
}

export function useUpdateFollowUp() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: async ({ id, leadId, ...patch }: { id: string; leadId: string; status?: LeadFollowUp['status']; notified?: boolean }) => {
      const isCompleting = patch.status === 'done' || patch.status === 'skipped';
      const { data, error } = await supabase
        .from('lead_follow_ups' as any)
        .update({
          ...patch,
          ...(isCompleting ? { completed_by: employee!.id } : {}),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LeadFollowUp;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['lead-follow-ups', variables.leadId] });
      qc.invalidateQueries({ queryKey: ['all-pending-follow-ups'] });
      qc.invalidateQueries({ queryKey: ['my-pending-follow-ups'] });
    },
  });
}

export function useDeleteFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, leadId }: { id: string; leadId: string }) => {
      const { error } = await supabase
        .from('lead_follow_ups' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['lead-follow-ups', variables.leadId] });
      qc.invalidateQueries({ queryKey: ['all-pending-follow-ups'] });
      qc.invalidateQueries({ queryKey: ['my-pending-follow-ups'] });
    },
  });
}
