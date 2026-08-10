import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  fetchLeads,
  fetchLeadById,
  createLead,
  updateLeadStage,
  updateLead,
  closeLeadAsLost,
  linkBudgetToLead,
  fetchCRMReceivedValue,
  fetchArchivedLeads,
  unarchiveLead,
  deleteLead,
  moveLeadToStandBy,
  resumeLeadFromStandBy,
  CreateLeadInput,
  CloseLeadAsLostInput,
  MoveLeadToStandByInput,
} from '@/services/leadService';
import { leadActivityService } from '@/services/leadActivityService';
import { CRMStage, getStageLabel } from '@/types/lead';

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

export function useCloseLeadAsLost() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: CloseLeadAsLostInput & { fromStage: CRMStage }) =>
      closeLeadAsLost(input),
    onSuccess: (_data, variables) => {
      // Dar perda arquiva a oportunidade: as duas listas mudam.
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['archived-leads'] });
      qc.invalidateQueries({ queryKey: ['lead-activities', variables.id] });
      // Os follow-ups pendentes foram cancelados junto — atualiza indicadores.
      qc.invalidateQueries({ queryKey: ['lead-follow-ups', variables.id] });
      qc.invalidateQueries({ queryKey: ['all-pending-follow-ups'] });
      qc.invalidateQueries({ queryKey: ['my-pending-follow-ups'] });
      toast({ title: 'Oportunidade movida para Perdas' });

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

/**
 * Coloca a oportunidade em Follow Up. O follow-up da data de retorno é criado
 * ANTES desta mutation pelo chamador (MoveToStandByDialog) — se a criação do
 * follow-up falhar, a oportunidade permanece no funil, que é o estado seguro.
 */
export function useMoveLeadToStandBy() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: MoveLeadToStandByInput) => moveLeadToStandBy(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-activities', variables.id] });
      toast({ title: 'Oportunidade movida para Stand By' });

      if (employee) {
        leadActivityService.log({
          tenantId: employee.tenant_id,
          leadId: variables.id,
          activityType: 'moved_to_stand_by',
          description: `Oportunidade movida para Stand By (saiu de ${getStageLabel(variables.fromStage)})`,
          metadata: { from_stage: variables.fromStage },
          createdBy: employee.id,
        }).catch(console.warn);
      }
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao mover para Stand By', description: err.message, variant: 'destructive' });
    },
  });
}

export function useResumeLeadFromStandBy() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: ({ id, targetStage }: { id: string; targetStage: CRMStage }) =>
      resumeLeadFromStandBy(id, targetStage),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-activities', variables.id] });
      toast({
        title: 'Oportunidade retomada',
        description: `Voltou para ${getStageLabel(variables.targetStage)}.`,
      });

      if (employee) {
        leadActivityService.log({
          tenantId: employee.tenant_id,
          leadId: variables.id,
          activityType: 'stand_by_resumed',
          description: `Oportunidade retomada em ${getStageLabel(variables.targetStage)}`,
          metadata: { to_stage: variables.targetStage },
          createdBy: employee.id,
        }).catch(console.warn);
      }
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao retomar oportunidade', description: err.message, variant: 'destructive' });
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
      toast({ title: 'Oportunidade reaberta no Pipeline' });

      // Log unarchive activity (fire-and-forget)
      if (employee) {
        leadActivityService.log({
          tenantId: employee.tenant_id,
          leadId: variables.id,
          activityType: 'unarchived',
          description: 'Oportunidade reaberta a partir de Perdas',
          metadata: { to_stage: variables.targetStage },
          createdBy: employee.id,
        }).catch(console.warn);
      }
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao reabrir oportunidade', description: err.message, variant: 'destructive' });
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
