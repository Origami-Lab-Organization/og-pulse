import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  fetchLeads,
  fetchLeadById,
  createLead,
  updateLeadStage,
  updateLead,
  archiveLead,
  closeLeadAsLost,
  linkBudgetToLead,
  fetchCRMReceivedValue,
  fetchArchivedLeads,
  unarchiveLead,
  deleteLead,
  CreateLeadInput,
  ArchiveLeadInput,
  CloseLeadAsLostInput,
} from '@/services/leadService';
import { leadActivityService } from '@/services/leadActivityService';
import { CRMStage } from '@/types/lead';

export function useLeads() {
  const { employee } = useAuth();
  return useQuery({
    queryKey: ['leads', employee?.tenant_id],
    queryFn: () => fetchLeads(employee!.tenant_id),
    enabled: !!employee?.tenant_id,
  });
}

export function useLead(id: string | null) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => fetchLeadById(id!),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: Omit<CreateLeadInput, 'tenant_id' | 'created_by'>) =>
      createLead({
        ...input,
        tenant_id: employee!.tenant_id,
        created_by: employee!.id,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead criado com sucesso' });

      // Log activity (fire-and-forget)
      if (_data?.id && employee) {
        leadActivityService.log({
          tenantId: employee.tenant_id,
          leadId: _data.id,
          activityType: 'created',
          description: `Lead "${variables.name}" criado`,
          metadata: { name: variables.name, service_line: variables.service_line },
          createdBy: employee.id,
        }).catch(console.warn);
      }
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar lead', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLeadStage() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: ({ id, stage, fromStage }: { id: string; stage: CRMStage; fromStage?: CRMStage }) =>
      updateLeadStage(id, stage),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-activities', variables.id] });

      // Log stage change activity (fire-and-forget)
      if (employee && variables.fromStage) {
        leadActivityService.logStageChange(
          employee.tenant_id,
          variables.id,
          variables.fromStage,
          variables.stage,
          employee.id
        ).catch(console.warn);
      }
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao mover lead', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<CreateLeadInput>) =>
      updateLead(id, updates),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-activities', variables.id] });
      toast({ title: 'Lead atualizado' });

      // Log update activity (fire-and-forget)
      if (employee) {
        leadActivityService.log({
          tenantId: employee.tenant_id,
          leadId: variables.id,
          activityType: 'lead_updated',
          description: 'Dados do lead atualizados',
          createdBy: employee.id,
        }).catch(console.warn);
      }
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar lead', description: err.message, variant: 'destructive' });
    },
  });
}

export function useArchiveLead() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: ArchiveLeadInput) => archiveLead(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead arquivado' });

      // Log archive activity (fire-and-forget)
      if (employee) {
        leadActivityService.log({
          tenantId: employee.tenant_id,
          leadId: variables.id,
          activityType: 'archived',
          description: `Lead arquivado${variables.archive_reason ? ` — ${variables.archive_reason}` : ''}`,
          metadata: {
            reason: variables.archive_reason,
            notes: variables.archive_notes,
            competitor_name: variables.competitor_name ?? null,
          },
          createdBy: employee.id,
        }).catch(console.warn);
      }
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao arquivar lead', description: err.message, variant: 'destructive' });
    },
  });
}

export function useCloseLeadAsLost() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: CloseLeadAsLostInput & { fromStage: CRMStage }) =>
      closeLeadAsLost(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-activities', variables.id] });
      toast({ title: 'Oportunidade marcada como perdida' });

      // Log activity (fire-and-forget)
      if (employee) {
        leadActivityService.logDealLost(
          employee.tenant_id,
          variables.id,
          variables.fromStage,
          variables.reason,
          employee.id
        ).catch(console.warn);
      }
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao marcar oportunidade como perdida', description: err.message, variant: 'destructive' });
    },
  });
}

export function useLinkBudgetToLead() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: ({ leadId, budgetId }: { leadId: string; budgetId: string }) =>
      linkBudgetToLead(leadId, budgetId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-activities', variables.leadId] });

      // Log budget linked activity (fire-and-forget)
      if (employee) {
        leadActivityService.log({
          tenantId: employee.tenant_id,
          leadId: variables.leadId,
          activityType: 'budget_created',
          description: 'Orçamento vinculado ao lead',
          metadata: { budget_id: variables.budgetId },
          createdBy: employee.id,
        }).catch(console.warn);
      }
    },
  });
}

export function useArchivedLeads() {
  const { employee } = useAuth();
  return useQuery({
    queryKey: ['archived-leads', employee?.tenant_id],
    queryFn: () => fetchArchivedLeads(employee!.tenant_id),
    enabled: !!employee?.tenant_id,
  });
}

export function useUnarchiveLead() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: ({ id, targetStage }: { id: string; targetStage: CRMStage }) => unarchiveLead(id, targetStage),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['archived-leads'] });
      toast({ title: 'Oportunidade restaurada com sucesso' });

      // Log unarchive activity (fire-and-forget)
      if (employee) {
        leadActivityService.log({
          tenantId: employee.tenant_id,
          leadId: variables.id,
          activityType: 'unarchived',
          description: 'Oportunidade restaurada do arquivo',
          metadata: { to_stage: variables.targetStage },
          createdBy: employee.id,
        }).catch(console.warn);
      }
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao restaurar oportunidade', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['archived-leads'] });
      toast({ title: 'Lead excluído com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir lead', description: err.message, variant: 'destructive' });
    },
  });
}

export function useCRMReceivedValue(tenantId?: string) {
  return useQuery({
    queryKey: ['crm-received-value', tenantId],
    queryFn: () => fetchCRMReceivedValue(tenantId!),
    enabled: !!tenantId,
  });
}
