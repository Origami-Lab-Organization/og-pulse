import { supabase } from '@/integrations/supabase/client';
import { getStageLabel } from '@/types/lead';

export type LeadActivityType =
  | 'created'
  | 'stage_changed'
  | 'lead_updated'
  | 'budget_created'
  | 'budget_updated'
  | 'budget_unlinked'
  | 'archived'
  | 'unarchived'
  | 'closed'
  | 'closed_lost'
  | 'moved_to_follow_up'
  | 'follow_up_resumed'
  | 'note_added';

export interface LeadActivityDB {
  id: string;
  tenant_id: string;
  lead_id: string;
  activity_type: LeadActivityType;
  description: string;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface LeadActivityWithCreator extends LeadActivityDB {
  creator?: {
    id: string;
    nome: string;
  } | null;
}

export interface CreateLeadActivityInput {
  tenantId: string;
  leadId: string;
  activityType: LeadActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (table: string) => supabase.from(table as any);

export const leadActivityService = {
  /**
   * Get all activities for a lead, ordered by most recent first
   */
  async getByLeadId(leadId: string): Promise<LeadActivityWithCreator[]> {
    const { data, error } = await fromTable('lead_activity_log')
      .select(`
        *,
        creator:employees!lead_activity_log_created_by_fkey(id, nome)
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lead activities:', error);
      throw error;
    }

    return data as unknown as LeadActivityWithCreator[];
  },

  /**
   * Log a new activity for a lead
   */
  async log(input: CreateLeadActivityInput): Promise<LeadActivityDB> {
    const { data, error } = await fromTable('lead_activity_log')
      .insert({
        tenant_id: input.tenantId,
        lead_id: input.leadId,
        activity_type: input.activityType,
        description: input.description,
        metadata: input.metadata || {},
        created_by: input.createdBy || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging lead activity:', error);
      throw error;
    }

    return data as unknown as LeadActivityDB;
  },

  /**
   * Helper: log a stage change
   */
  async logStageChange(
    tenantId: string,
    leadId: string,
    fromStage: string,
    toStage: string,
    createdBy?: string | null
  ): Promise<LeadActivityDB> {
    return this.log({
      tenantId,
      leadId,
      activityType: 'stage_changed',
      description: `Movido de ${getStageLabel(fromStage)} para ${getStageLabel(toStage)}`,
      metadata: { from_stage: fromStage, to_stage: toStage },
      createdBy,
    });
  },

  /**
   * Helper: log budget update with version info
   */
  async logBudgetUpdate(
    tenantId: string,
    leadId: string,
    budgetId: string,
    versionNumber: number,
    changeSummary: string,
    changeReason: string | null,
    createdBy?: string | null
  ): Promise<LeadActivityDB> {
    return this.log({
      tenantId,
      leadId,
      activityType: 'budget_updated',
      description: `Orçamento atualizado (v${versionNumber})${changeReason ? `: ${changeReason}` : ''}`,
      metadata: {
        budget_id: budgetId,
        version_number: versionNumber,
        change_summary: changeSummary,
        change_reason: changeReason,
      },
      createdBy,
    });
  },

  /**
   * Helper: log deal closing
   */
  async logDealClosed(
    tenantId: string,
    leadId: string,
    projectId: string,
    projectType: string,
    finalValue: number,
    createdBy?: string | null
  ): Promise<LeadActivityDB> {
    const typeLabels: Record<string, string> = {
      fixed_scope: 'Escopo Fixo',
      continuous: 'Contínuo',
      success_fee: 'Taxa de Sucesso',
      non_revenue: 'Sem Receita',
    };

    return this.log({
      tenantId,
      leadId,
      activityType: 'closed',
      description: `Negócio fechado — Projeto ${typeLabels[projectType] || projectType} criado`,
      metadata: {
        project_id: projectId,
        project_type: projectType,
        final_value: finalValue,
      },
      createdBy,
    });
  },

  /**
   * Helper: log deal lost
   */
  async logDealLost(
    tenantId: string,
    leadId: string,
    fromStage: string,
    reasonLabel: string,
    createdBy?: string | null
  ): Promise<LeadActivityDB> {
    return this.log({
      tenantId,
      leadId,
      activityType: 'closed_lost',
      description: `Oportunidade perdida (${reasonLabel}) — estava em ${getStageLabel(fromStage)}`,
      metadata: { from_stage: fromStage, reason: reasonLabel },
      createdBy,
    });
  },
};
