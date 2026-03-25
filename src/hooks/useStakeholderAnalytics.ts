import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AnalyticsFilters } from './useAnalyticsData';

export interface StakeholderAnalyticsData {
  totals: {
    total: number;
    promoters: number;
    neutrals: number;
    detractors: number;
  };
  byProject: Array<{
    projectId: string;
    projectName: string;
    total: number;
    promoters: number;
    neutrals: number;
    detractors: number;
    promoterPercent: number;
    detractorPercent: number;
  }>;
  highInfluenceDetractors: Array<{
    name: string;
    projectName: string;
    jobTitle: string | null;
    action: string | null;
  }>;
}

export function useStakeholderAnalytics(filters: Pick<AnalyticsFilters, 'clientId' | 'managerId' | 'projectId'>, options?: { enabled?: boolean }) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin ?? false;
  const currentEmployeeId = employee?.id;

  return useQuery({
    queryKey: [
      'stakeholder-analytics', tenantId,
      filters.clientId, filters.managerId, filters.projectId,
      isAdmin, currentEmployeeId,
    ],
    queryFn: async (): Promise<StakeholderAnalyticsData> => {
      if (!tenantId) throw new Error('No tenant');

      // 1. Fetch projects respecting visibility and filters
      let projectsQuery = supabase
        .from('projects')
        .select('id, name')
        .eq('tenant_id', tenantId);

      if (!isAdmin && currentEmployeeId) {
        projectsQuery = projectsQuery.eq('manager_id', currentEmployeeId);
      }
      if (filters.clientId)  projectsQuery = projectsQuery.eq('client_id',  filters.clientId);
      if (filters.managerId) projectsQuery = projectsQuery.eq('manager_id', filters.managerId);
      if (filters.projectId) projectsQuery = projectsQuery.eq('id',         filters.projectId);

      const { data: projects, error: projErr } = await projectsQuery;
      if (projErr) throw projErr;
      if (!projects?.length) {
        return { totals: { total: 0, promoters: 0, neutrals: 0, detractors: 0 }, byProject: [], highInfluenceDetractors: [] };
      }

      const projectIds = projects.map(p => p.id);
      const projectNameMap = new Map(projects.map(p => [p.id, p.name]));

      // 2. Fetch stakeholders for those projects
      const { data: stakeholders, error: stErr } = await supabase
        .from('project_stakeholders')
        .select('project_id, name, job_title, sponsorship_level, influence_level, action')
        .in('project_id', projectIds);

      if (stErr) throw stErr;
      const rows = stakeholders || [];

      // 3. Group by project
      const projectMap = new Map<string, {
        projectId: string; projectName: string;
        promoters: number; neutrals: number; detractors: number;
      }>();

      for (const p of projects) {
        projectMap.set(p.id, { projectId: p.id, projectName: p.name, promoters: 0, neutrals: 0, detractors: 0 });
      }

      let totalPromoters = 0;
      let totalNeutrals  = 0;
      let totalDetractors = 0;
      const highInfluenceDetractors: StakeholderAnalyticsData['highInfluenceDetractors'] = [];

      for (const s of rows) {
        const entry = projectMap.get(s.project_id);
        if (!entry) continue;

        if (s.sponsorship_level === 'promoter') {
          entry.promoters++;
          totalPromoters++;
        } else if (s.sponsorship_level === 'detractor') {
          entry.detractors++;
          totalDetractors++;
          if (s.influence_level === 'high') {
            highInfluenceDetractors.push({
              name: s.name,
              projectName: projectNameMap.get(s.project_id) ?? '—',
              jobTitle: s.job_title,
              action: s.action,
            });
          }
        } else {
          // null or 'neutral'
          entry.neutrals++;
          totalNeutrals++;
        }
      }

      const totalGlobal = totalPromoters + totalNeutrals + totalDetractors;

      // 4. Build byProject array (only projects with at least one stakeholder),
      //    sorted by detractor % desc
      const byProject = [...projectMap.values()]
        .filter(p => p.promoters + p.neutrals + p.detractors > 0)
        .map(p => {
          const total = p.promoters + p.neutrals + p.detractors;
          return {
            ...p,
            total,
            promoterPercent: total > 0 ? (p.promoters  / total) * 100 : 0,
            detractorPercent: total > 0 ? (p.detractors / total) * 100 : 0,
          };
        })
        .sort((a, b) => b.detractorPercent - a.detractorPercent);

      return {
        totals: { total: totalGlobal, promoters: totalPromoters, neutrals: totalNeutrals, detractors: totalDetractors },
        byProject,
        highInfluenceDetractors,
      };
    },
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}
