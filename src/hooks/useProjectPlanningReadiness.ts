import { supabase } from '@/integrations/supabase/client';

interface ReadinessResult {
  ready: boolean;
  missing: string[];
}

export function useProjectPlanningReadiness() {
  const checkReadiness = async (projectId: string): Promise<ReadinessResult> => {
    const [okrs, stakeholders, members, milestones] = await Promise.all([
      supabase
        .from('project_okrs')
        .select('id, key_results:project_key_results(id)')
        .eq('project_id', projectId),
      supabase
        .from('project_stakeholders')
        .select('id')
        .eq('project_id', projectId)
        .limit(1),
      supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .limit(1),
      supabase
        .from('project_milestones')
        .select('id')
        .eq('project_id', projectId)
        .limit(1),
    ]);

    const missing: string[] = [];

    if (!okrs.data?.some((o: any) => o.key_results?.length > 0)) {
      missing.push('OKRs definidos');
    }
    if (!stakeholders.data?.length) {
      missing.push('Stakeholders mapeados');
    }
    if (!members.data?.length) {
      missing.push('Equipe alocada');
    }
    if (!milestones.data?.length) {
      missing.push('Cronograma definido');
    }

    return { ready: missing.length === 0, missing };
  };

  return { checkReadiness };
}
