import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { leadActivityService } from '@/services/leadActivityService';
import type { LeadAttachment } from '@/lib/leadAttachments';

export interface LeadInteraction {
  id: string;
  tenant_id: string;
  lead_id: string;
  message: string;
  interaction_date: string;
  channel: string;
  attachments: LeadAttachment[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: { id: string; nome: string } | null;
}

export const CHANNEL_LABELS: Record<string, string> = {
  phone: 'Telefone',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  in_person: 'Presencial',
  video_call: 'Videoconferência',
  linkedin: 'LinkedIn',
  other: 'Outro',
};

export function useLeadInteractions(leadId: string | null) {
  const { employee } = useAuth();
  return useQuery<LeadInteraction[]>({
    queryKey: ['lead-interactions', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_interactions' as any)
        .select('*, creator:employees!lead_interactions_created_by_fkey(id, nome)')
        .eq('lead_id', leadId!)
        .order('interaction_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LeadInteraction[];
    },
    enabled: !!leadId && !!employee,
  });
}

export function useCreateInteraction() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: async (input: { lead_id: string; message: string; interaction_date: string; channel: string; attachments?: LeadAttachment[] }) => {
      const { data, error } = await supabase
        .from('lead_interactions' as any)
        .insert({
          tenant_id: employee!.tenant_id,
          lead_id: input.lead_id,
          message: input.message,
          interaction_date: input.interaction_date,
          channel: input.channel,
          attachments: input.attachments ?? [],
          created_by: employee!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LeadInteraction;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['lead-interactions', variables.lead_id] });
      qc.invalidateQueries({ queryKey: ['lead-activities', variables.lead_id] });
      if (employee) {
        leadActivityService.log({
          tenantId: employee.tenant_id,
          leadId: variables.lead_id,
          activityType: 'note_added',
          description: `Follow-up registrado: ${CHANNEL_LABELS[variables.channel] ?? variables.channel} em ${variables.interaction_date}`,
          metadata: {
            follow_up_id: data.id,
            channel: variables.channel,
            interaction_date: variables.interaction_date,
            message_preview: variables.message.slice(0, 100),
            attachment_count: variables.attachments?.length ?? 0,
          },
          createdBy: employee.id,
        }).catch(console.warn);
      }
    },
  });
}

export function useUpdateInteraction() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      lead_id: string;
      message: string;
      interaction_date: string;
      channel: string;
      previous: Pick<LeadInteraction, 'message' | 'interaction_date' | 'channel'>;
    }) => {
      const { data, error } = await supabase
        .from('lead_interactions' as any)
        .update({
          message: input.message,
          interaction_date: input.interaction_date,
          channel: input.channel,
          updated_by: employee!.id,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LeadInteraction;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['lead-interactions', variables.lead_id] });
      qc.invalidateQueries({ queryKey: ['lead-activities', variables.lead_id] });
      if (employee) {
        const changes: Record<string, { old: string; new: string }> = {};
        if (variables.message !== variables.previous.message)
          changes.message = { old: variables.previous.message, new: variables.message };
        if (variables.interaction_date !== variables.previous.interaction_date)
          changes.interaction_date = { old: variables.previous.interaction_date, new: variables.interaction_date };
        if (variables.channel !== variables.previous.channel)
          changes.channel = { old: variables.previous.channel, new: variables.channel };

        leadActivityService.log({
          tenantId: employee.tenant_id,
          leadId: variables.lead_id,
          activityType: 'note_added',
          description: 'Follow-up editado',
          metadata: { follow_up_id: variables.id, changes },
          createdBy: employee.id,
        }).catch(console.warn);
      }
    },
  });
}

export function useDeleteInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; lead_id: string }) => {
      const { error } = await supabase
        .from('lead_interactions' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['lead-interactions', variables.lead_id] });
    },
  });
}
