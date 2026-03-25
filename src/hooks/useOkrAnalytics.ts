import { useQuery } from '@tanstack/react-query';
import { differenceInDays, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AnalyticsFilters } from './useAnalyticsData';
import type { KeyResultConfidenceLevel, OKRStatus } from '@/types/projectOkr';

export interface OkrAnalyticsData {
  totals: {
    activeOkrs: number;
    avgProgress: number;
    onTrack: number;
    atRisk: number;
    completed: number;
  };
  byProject: Array<{
    projectId: string;
    projectName: string;
    okrs: Array<{
      id: string;
      objective: string;
      progress: number;
      keyResultsTotal: number;
      keyResultsCompleted: number;
      confidence: KeyResultConfidenceLevel;
      status: OKRStatus;
      isOnTrack: boolean;
    }>;
    avgProgress: number;
    dominantConfidence: KeyResultConfidenceLevel;
  }>;
  confidenceDistribution: Record<KeyResultConfidenceLevel, number>;
}

const VALID_CONFIDENCE: KeyResultConfidenceLevel[] = ['very_high', 'high', 'medium', 'low', 'very_low'];

function modeConfidence(levels: (string | null)[]): KeyResultConfidenceLevel {
  const valid = levels.filter((l): l is KeyResultConfidenceLevel =>
    VALID_CONFIDENCE.includes(l as KeyResultConfidenceLevel)
  );
  if (!valid.length) return 'medium';

  const counts = valid.reduce<Partial<Record<KeyResultConfidenceLevel, number>>>((acc, l) => {
    acc[l] = (acc[l] ?? 0) + 1;
    return acc;
  }, {});

  return (Object.entries(counts) as [KeyResultConfidenceLevel, number][])
    .sort((a, b) => b[1] - a[1])[0][0];
}

function calcIsOnTrack(
  progress: number,
  status: OKRStatus,
  createdAt: string,
  targetDate: string | null,
): boolean {
  if (status === 'completed') return true;
  if (status === 'pending' || status === 'cancelled') return true;

  if (!targetDate) return progress >= 50;

  const today = new Date();
  const start = parseISO(createdAt);
  const end   = parseISO(targetDate);

  const daysTotal   = Math.max(1, differenceInDays(end, start));
  const daysElapsed = Math.max(0, differenceInDays(today, start));
  const expectedProgress = Math.min(100, (daysElapsed / daysTotal) * 100);

  return progress >= expectedProgress * 0.8;
}

export function useOkrAnalytics(
  filters: Pick<AnalyticsFilters, 'clientId' | 'managerId' | 'projectId'>,
  options?: { enabled?: boolean },
) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin ?? false;
  const currentEmployeeId = employee?.id;

  return useQuery({
    queryKey: [
      'okr-analytics', tenantId,
      filters.clientId, filters.managerId, filters.projectId,
      isAdmin, currentEmployeeId,
    ],
    queryFn: async (): Promise<OkrAnalyticsData> => {
      if (!tenantId) throw new Error('No tenant');

      // 1. Projects (with visibility + filter rules)
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

      const empty: OkrAnalyticsData = {
        totals: { activeOkrs: 0, avgProgress: 0, onTrack: 0, atRisk: 0, completed: 0 },
        byProject: [],
        confidenceDistribution: { very_high: 0, high: 0, medium: 0, low: 0, very_low: 0 },
      };
      if (!projects?.length) return empty;

      const projectIds = projects.map(p => p.id);
      const projectNameMap = new Map(projects.map(p => [p.id, p.name]));

      // 2. OKRs with key results
      const { data: okrRows, error: okrErr } = await supabase
        .from('project_okrs')
        .select(`
          id, project_id, objective, progress_percent, status, created_at, target_date,
          project_key_results(id, current_value, target_value, confidence_level)
        `)
        .in('project_id', projectIds);

      if (okrErr) throw okrErr;
      const okrs = (okrRows || []) as any[];
      if (!okrs.length) return empty;

      // 3. Build per-project grouping
      const projectOkrsMap = new Map<string, typeof okrs>();
      for (const okr of okrs) {
        if (!projectOkrsMap.has(okr.project_id)) projectOkrsMap.set(okr.project_id, []);
        projectOkrsMap.get(okr.project_id)!.push(okr);
      }

      // 4. Global confidence distribution (counts of KRs)
      const confDist: Record<KeyResultConfidenceLevel, number> = {
        very_high: 0, high: 0, medium: 0, low: 0, very_low: 0,
      };

      let totalActive = 0;
      let totalActiveProgress = 0;
      let totalOnTrack = 0;
      let totalAtRisk = 0;
      let totalCompleted = 0;

      const byProject: OkrAnalyticsData['byProject'] = [];

      for (const project of projects) {
        const projectOkrs = projectOkrsMap.get(project.id) ?? [];
        if (!projectOkrs.length) continue;

        const okrItems: OkrAnalyticsData['byProject'][0]['okrs'] = [];
        const allProjectConfidences: (string | null)[] = [];

        for (const okr of projectOkrs) {
          const krs: any[] = okr.project_key_results || [];
          const keyResultsTotal = krs.length;
          const keyResultsCompleted = krs.filter(
            (kr: any) => kr.target_value != null && Number(kr.current_value) >= Number(kr.target_value)
          ).length;

          const krConfidences = krs.map((kr: any) => kr.confidence_level);
          allProjectConfidences.push(...krConfidences);

          // Accumulate global distribution
          for (const c of krConfidences) {
            if (c && (c in confDist)) confDist[c as KeyResultConfidenceLevel]++;
          }

          const confidence = modeConfidence(krConfidences);
          const progress = Number(okr.progress_percent) || 0;
          const status = okr.status as OKRStatus;
          const isOnTrack = calcIsOnTrack(progress, status, okr.created_at, okr.target_date);

          okrItems.push({
            id: okr.id,
            objective: okr.objective,
            progress,
            keyResultsTotal,
            keyResultsCompleted,
            confidence,
            status,
            isOnTrack,
          });

          // Accumulate totals
          if (status === 'completed') {
            totalCompleted++;
          } else if (status === 'in_progress') {
            totalActive++;
            totalActiveProgress += progress;
            if (isOnTrack) totalOnTrack++; else totalAtRisk++;
          }
        }

        const avgProgress = okrItems.length
          ? okrItems.reduce((s, o) => s + o.progress, 0) / okrItems.length
          : 0;

        byProject.push({
          projectId: project.id,
          projectName: project.name,
          okrs: okrItems,
          avgProgress,
          dominantConfidence: modeConfidence(allProjectConfidences),
        });
      }

      // Sort projects by avgProgress ascending (most at-risk first)
      byProject.sort((a, b) => a.avgProgress - b.avgProgress);

      return {
        totals: {
          activeOkrs: totalActive,
          avgProgress: totalActive > 0 ? totalActiveProgress / totalActive : 0,
          onTrack: totalOnTrack,
          atRisk: totalAtRisk,
          completed: totalCompleted,
        },
        byProject,
        confidenceDistribution: confDist,
      };
    },
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}
