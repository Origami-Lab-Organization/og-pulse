import { supabase } from "@/integrations/supabase/client";

interface ReadinessResult {
  ready: boolean;
  missing: string[];
}

export function useProjectPlanningReadiness() {
  // planning → value_delivery
  const checkReadiness = async (
    projectId: string,
    isVentures = false
  ): Promise<ReadinessResult> => {
    const [okrs, stakeholders, members, milestones] = await Promise.all([
      supabase
        .from("project_okrs")
        .select("id, key_results:project_key_results(id)")
        .eq("project_id", projectId),
      supabase
        .from("project_stakeholders")
        .select("id")
        .eq("project_id", projectId)
        .limit(1),
      supabase
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .limit(1),
      supabase
        .from("project_milestones")
        .select("id")
        .eq("project_id", projectId)
        .limit(1)
    ]);

    const missing: string[] = [];

    if (!okrs.data?.some((o: any) => o.key_results?.length > 0)) {
      missing.push("OKRs definidos");
    }
    if (!isVentures && !stakeholders.data?.length) {
      missing.push("Stakeholders mapeados");
    }
    if (!members.data?.length) {
      missing.push("Equipe alocada");
    }
    if (!milestones.data?.length) {
      missing.push("Cronograma definido");
    }

    return { ready: missing.length === 0, missing };
  };

  // value_delivery → results_presentation
  const checkDeliveryToResultsReadiness = async (
    projectId: string
  ): Promise<ReadinessResult> => {
    const [milestonesRes, okrsRes, projectRes] = await Promise.all([
      supabase
        .from("project_milestones")
        .select("id, status")
        .eq("project_id", projectId),
      supabase
        .from("project_okrs")
        .select("id, key_results:project_key_results(id, current_value)")
        .eq("project_id", projectId),
      supabase
        .from("projects")
        .select("value_book_url")
        .eq("id", projectId)
        .single()
    ]);

    const missing: string[] = [];

    const milestones = milestonesRes.data || [];
    if (
      milestones.length === 0 ||
      !milestones.every((m: any) => m.status === "completed")
    ) {
      missing.push("Todos os marcos do cronograma concluídos");
    }

    const okrs = okrsRes.data || [];
    const hasKrProgress = okrs.some((o: any) =>
      o.key_results?.some((kr: any) => Number(kr.current_value) > 0)
    );
    if (!hasKrProgress) {
      missing.push("Progresso registrado nos OKRs");
    }

    const valueBookUrl = (projectRes.data as any)?.value_book_url;
    if (!valueBookUrl) {
      missing.push("Documento do Value Book anexado");
    }

    return { ready: missing.length === 0, missing };
  };

  // results_presentation → learning_case
  const checkResultsToLearningReadiness = async (
    _projectId: string
  ): Promise<ReadinessResult> => {
    return { ready: true, missing: [] };
  };

  // any stage → completed
  const checkCompletionReadiness = async (
    projectId: string
  ): Promise<
    ReadinessResult & {
      pendingInstallmentsCount: number;
      totalInstallmentsCount: number;
      pendingMilestonesCount: number;
      totalMilestonesCount: number;
    }
  > => {
    const [milestonesRes, installmentsRes] = await Promise.all([
      supabase
        .from("project_milestones")
        .select("id, status")
        .eq("project_id", projectId),
      supabase
        .from("project_installments")
        .select("id, status")
        .eq("project_id", projectId)
    ]);

    const milestones = milestonesRes.data || [];
    const pendingMilestones = milestones.filter((m: any) => m.status !== "completed");
    const installments = installmentsRes.data || [];
    const pendingInstallments = installments.filter((i: any) => i.status !== "received");
    const missing: string[] = [];

    if (milestones.length === 0) {
      missing.push("Cronograma cadastrado");
    } else if (pendingMilestones.length > 0) {
      missing.push(
        `Todas as etapas do cronograma concluídas (${pendingMilestones.length} de ${milestones.length} pendentes)`
      );
    }

    if (pendingInstallments.length > 0) {
      missing.push(
        `Todos os pagamentos recebidos (${pendingInstallments.length} de ${installments.length} pendentes)`
      );
    }

    return {
      ready: missing.length === 0,
      missing,
      pendingInstallmentsCount: pendingInstallments.length,
      totalInstallmentsCount: installments.length,
      pendingMilestonesCount: pendingMilestones.length,
      totalMilestonesCount: milestones.length
    };
  };

  return {
    checkReadiness,
    checkDeliveryToResultsReadiness,
    checkResultsToLearningReadiness,
    checkCompletionReadiness
  };
}
