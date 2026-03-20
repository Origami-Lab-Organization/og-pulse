import { supabase } from '@/integrations/supabase/client';

interface ReadinessResult {
  ready: boolean;
  missing: string[];
}

export function useProjectPlanningReadiness() {
  // planning → value_delivery
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

  // value_delivery → results_presentation
  const checkDeliveryToResultsReadiness = async (projectId: string): Promise<ReadinessResult> => {
    const [milestonesRes, okrsRes, projectRes] = await Promise.all([
      supabase
        .from('project_milestones')
        .select('id, status')
        .eq('project_id', projectId),
      supabase
        .from('project_okrs')
        .select('id, key_results:project_key_results(id, current_value)')
        .eq('project_id', projectId),
      supabase
        .from('projects')
        .select('value_book_url')
        .eq('id', projectId)
        .single(),
    ]);

    const missing: string[] = [];

    const milestones = milestonesRes.data || [];
    if (milestones.length === 0 || !milestones.every((m: any) => m.status === 'completed')) {
      missing.push('Todos os marcos do cronograma concluídos');
    }

    const okrs = okrsRes.data || [];
    const hasKrProgress = okrs.some((o: any) =>
      o.key_results?.some((kr: any) => Number(kr.current_value) > 0)
    );
    if (!hasKrProgress) {
      missing.push('Progresso registrado nos OKRs');
    }

    const valueBookUrl = projectRes.data?.value_book_url;
    if (!valueBookUrl) {
      missing.push('Documento do Value Book anexado');
    }

    return { ready: missing.length === 0, missing };
  };

  // results_presentation → learning_case
  const checkResultsToLearningReadiness = async (_projectId: string): Promise<ReadinessResult> => {
    return { ready: true, missing: [] };
  };

  // learning_case → completed — returns pending installment count alongside readiness
  const checkCompletionReadiness = async (
    projectId: string
  ): Promise<ReadinessResult & { pendingCount: number; totalCount: number }> => {
    const { data: installments } = await supabase
      .from('project_installments')
      .select('id, status')
      .eq('project_id', projectId);

    const all = installments || [];
    const pending = all.filter((i: any) => i.status !== 'received');

    if (pending.length === 0) {
      return { ready: true, missing: [], pendingCount: 0, totalCount: all.length };
    }

    return {
      ready: false,
      missing: [`Todas as parcelas recebidas (${pending.length} de ${all.length} pendentes)`],
      pendingCount: pending.length,
      totalCount: all.length,
    };
  };

  return {
    checkReadiness,
    checkDeliveryToResultsReadiness,
    checkResultsToLearningReadiness,
    checkCompletionReadiness,
  };
}
