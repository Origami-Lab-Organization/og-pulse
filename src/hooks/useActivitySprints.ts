import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  ActivitySettingsDB,
  ActivitySprintDB,
  SprintStatus,
} from '@/types/projectActivity';

// ── Sprints ──────────────────────────────────────────────────────────────────

export const useActivitySprints = (projectId: string | undefined) =>
  useQuery({
    queryKey: ['activity-sprints', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_activity_sprints')
        .select('*')
        .eq('project_id', projectId!)
        .order('number');
      if (error) throw error;
      return (data || []) as ActivitySprintDB[];
    },
    enabled: !!projectId,
  });

export interface SprintInsert {
  name: string;
  number: number;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  goal?: string;
}

export const useCreateSprints = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      projectId,
      sprints,
      replaceStatuses = ['planned'],
    }: {
      projectId: string;
      sprints: SprintInsert[];
      /** Which statuses to delete before inserting (default: planned) */
      replaceStatuses?: SprintStatus[];
    }) => {
      // Delete existing sprints of the given statuses first
      for (const status of replaceStatuses) {
        await supabase
          .from('project_activity_sprints')
          .delete()
          .eq('project_id', projectId)
          .eq('status', status);
      }

      if (sprints.length === 0) return { projectId };

      const { error } = await supabase.from('project_activity_sprints').insert(
        sprints.map((s) => ({
          project_id:  projectId,
          tenant_id:   employee!.tenant_id,
          name:        s.name,
          number:      s.number,
          start_date:  s.start_date,
          end_date:    s.end_date,
          status:      s.status,
          goal:        s.goal ?? null,
        }))
      );
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['activity-sprints', projectId] });
      toast({ title: 'Sprints salvas' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar sprints', variant: 'destructive' });
    },
  });
};

// ── Update sprint goal ───────────────────────────────────────────────────────

export const useUpdateSprintGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      goal,
    }: {
      id: string;
      projectId: string;
      goal: string | null;
    }) => {
      const { error } = await supabase
        .from('project_activity_sprints')
        .update({ goal, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['activity-sprints', projectId] });
    },
  });
};

// ── Close sprint ─────────────────────────────────────────────────────────────

export const useCloseSprint = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      activeSprint: ActivitySprintDB;
      nextSprint: ActivitySprintDB | null;
      completedCount: number;
      pendingCards: { id: string; tenant_id: string }[];
      pendingAction: 'product_backlog' | 'next_sprint';
    }) => {
      const { projectId, activeSprint, nextSprint, pendingCards, pendingAction } = input;

      // 1. Mark active sprint as completed
      const { error: e1 } = await supabase
        .from('project_activity_sprints')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', activeSprint.id);
      if (e1) throw e1;

      // 2. Activate next sprint
      if (nextSprint) {
        const { error: e2 } = await supabase
          .from('project_activity_sprints')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', nextSprint.id);
        if (e2) throw e2;
      }

      // 3. Handle pending cards
      if (pendingCards.length > 0) {
        const cardIds = pendingCards.map((c) => c.id);

        if (pendingAction === 'product_backlog') {
          // Move to Product Backlog — DB trigger handles column_name history
          const { error: e3 } = await supabase
            .from('project_activity_cards')
            .update({ column_name: 'product_backlog', sprint_id: null, updated_at: new Date().toISOString() })
            .in('id', cardIds);
          if (e3) throw e3;
        } else if (pendingAction === 'next_sprint' && nextSprint) {
          // Keep column, assign to next sprint
          const { error: e4 } = await supabase
            .from('project_activity_cards')
            .update({ sprint_id: nextSprint.id, updated_at: new Date().toISOString() })
            .in('id', cardIds);
          if (e4) throw e4;

          // Manual history — sprint_id change isn't captured by the column_name trigger
          if (employee) {
            await supabase.from('project_activity_card_history').insert(
              pendingCards.map((c) => ({
                card_id:    c.id,
                tenant_id:  c.tenant_id,
                changed_by: employee.id,
                field:      'sprint_id',
                old_value:  activeSprint.id,
                new_value:  nextSprint.id,
              }))
            );
          }
        }
      }

      return input;
    },
    onSuccess: (input) => {
      queryClient.invalidateQueries({ queryKey: ['activity-sprints', input.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-activities', input.projectId] });
      toast({
        title: `${input.activeSprint.name} encerrada`,
        description: `${input.completedCount} cards concluídos. ${input.pendingCards.length} cards movidos.`,
      });
    },
    onError: () => {
      toast({ title: 'Erro ao encerrar sprint', variant: 'destructive' });
    },
  });
};

// ── Settings ─────────────────────────────────────────────────────────────────

export const useActivitySettings = (projectId: string | undefined) =>
  useQuery({
    queryKey: ['activity-settings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_activity_settings')
        .select('*')
        .eq('project_id', projectId!)
        .maybeSingle();
      if (error) throw error;
      return data as ActivitySettingsDB | null;
    },
    enabled: !!projectId,
  });

export const useSaveActivitySettings = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      sprintDurationWeeks: number;
      sprintNamingMode: 'auto' | 'manual';
      wipInDev: number | null;
      wipInTest: number | null;
      wipInDeploy: number | null;
    }) => {
      const { error } = await supabase.from('project_activity_settings').upsert(
        {
          project_id:            input.projectId,
          tenant_id:             employee!.tenant_id,
          sprint_duration_weeks: input.sprintDurationWeeks,
          sprint_naming_mode:    input.sprintNamingMode,
          wip_in_dev:            input.wipInDev,
          wip_in_test:           input.wipInTest,
          wip_in_deploy:         input.wipInDeploy,
        },
        { onConflict: 'project_id' }
      );
      if (error) throw error;
      return input.projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['activity-settings', projectId] });
      toast({ title: 'Configurações salvas' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' });
    },
  });
};
