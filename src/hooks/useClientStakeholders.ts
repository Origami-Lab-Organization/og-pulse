import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectStakeholder, InfluenceLevel, InterestLevel, SponsorshipLevel, StakeholderAction } from '@/types/projectStakeholder';

export const useClientStakeholders = (
  clientId: string | undefined,
  currentProjectId: string | undefined,
  currentStakeholders: ProjectStakeholder[]
) => {
  return useQuery({
    queryKey: ['client-stakeholders', clientId, currentProjectId],
    queryFn: async () => {
      // 1. Get all project IDs for this client except current
      const { data: clientProjects, error: projError } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', clientId!)
        .neq('id', currentProjectId!);

      if (projError) throw projError;
      if (!clientProjects?.length) return [];

      const projectIds = clientProjects.map((p) => p.id);

      // 2. Get stakeholders from those projects
      const { data: stakeholders, error: stError } = await supabase
        .from('project_stakeholders')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (stError) throw stError;
      if (!stakeholders?.length) return [];

      // 3. Deduplicate by name+email, keeping most recent
      const seen = new Map<string, ProjectStakeholder>();
      for (const s of stakeholders) {
        const key = `${s.name.toLowerCase().trim()}|${(s.email || '').toLowerCase().trim()}`;
        if (!seen.has(key)) {
          seen.set(key, {
            ...s,
            influence_level: s.influence_level as InfluenceLevel | null,
            interest_level: s.interest_level as InterestLevel | null,
            sponsorship_level: s.sponsorship_level as SponsorshipLevel | null,
            action: s.action as StakeholderAction | null,
          });
        }
      }

      // 4. Filter out stakeholders already in current project
      const currentNames = new Set(
        currentStakeholders.map(
          (s) => `${s.name.toLowerCase().trim()}|${(s.email || '').toLowerCase().trim()}`
        )
      );

      return Array.from(seen.values()).filter(
        (s) => !currentNames.has(`${s.name.toLowerCase().trim()}|${(s.email || '').toLowerCase().trim()}`)
      );
    },
    enabled: !!clientId && !!currentProjectId,
  });
};

