import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  CreateReleaseInput,
  ProjectReleaseWithSprints,
  UpdateReleaseInput,
} from '@/types/projectRelease';

// ── Fetch ──────────────────────────────────────────────────────────────────────

export const useProjectReleases = (projectId: string | undefined) =>
  useQuery({
    queryKey: ['project-releases', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_activity_releases')
        .select('*, release_sprints:project_activity_release_sprints(id, sprint_id)')
        .eq('project_id', projectId!)
        .order('target_date');
      if (error) throw error;
      return (data || []) as ProjectReleaseWithSprints[];
    },
    enabled: !!projectId,
  });

// ── Create ─────────────────────────────────────────────────────────────────────

export const useCreateRelease = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateReleaseInput) => {
      const { data, error } = await supabase
        .from('project_activity_releases')
        .insert({
          project_id:  input.projectId,
          tenant_id:   employee!.tenant_id,
          name:        input.name,
          version:     input.version ?? null,
          description: input.description ?? null,
          target_date: input.targetDate,
          status:      'planned',
        })
        .select()
        .single();
      if (error) throw error;
      return { data, projectId: input.projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-releases', projectId] });
      toast({ title: 'Release criada' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar release', variant: 'destructive' });
    },
  });
};

// ── Update ─────────────────────────────────────────────────────────────────────

export const useUpdateRelease = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      updates,
    }: {
      id: string;
      projectId: string;
      updates: UpdateReleaseInput;
    }) => {
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.name        !== undefined) payload.name        = updates.name;
      if (updates.version     !== undefined) payload.version     = updates.version;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.targetDate  !== undefined) payload.target_date = updates.targetDate;
      if (updates.releasedAt  !== undefined) payload.released_at = updates.releasedAt;
      if (updates.status      !== undefined) payload.status      = updates.status;

      const { error } = await supabase
        .from('project_activity_releases')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-releases', projectId] });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar release', variant: 'destructive' });
    },
  });
};

// ── Delete ─────────────────────────────────────────────────────────────────────

export const useDeleteRelease = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_activity_releases')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-releases', projectId] });
      toast({ title: 'Release excluída' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir release', variant: 'destructive' });
    },
  });
};

// ── Sprint associations ────────────────────────────────────────────────────────

export const useSetReleaseSprints = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      releaseId,
      projectId,
      sprintIds,
    }: {
      releaseId: string;
      projectId: string;
      sprintIds: string[];
    }) => {
      // Replace all associations atomically: delete then insert
      const { error: delErr } = await supabase
        .from('project_activity_release_sprints')
        .delete()
        .eq('release_id', releaseId);
      if (delErr) throw delErr;

      if (sprintIds.length > 0) {
        const { error: insErr } = await supabase
          .from('project_activity_release_sprints')
          .insert(sprintIds.map((sid) => ({ release_id: releaseId, sprint_id: sid })));
        if (insErr) throw insErr;
      }
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-releases', projectId] });
    },
  });
};
