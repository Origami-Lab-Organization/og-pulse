import { supabase } from '@/integrations/supabase/client';
import { planningChecklist, planningCountsFrom } from '@/lib/projectPlanning';
import { fetchOpenPlanningApprovals } from '@/services/projectPlanningService';
import type { MonthlyHours } from '@/types/equipe.types';
import type { PlanningReadiness, PlanningReadinessProject } from '@/types/projectPlanning';

/**
 * "N de M obrigatórios" dos projetos em planejamento do portfólio (US-0039, cenário 17), com a
 * mesma regra do checklist da página (`planningChecklist`). Quatro leituras para o quadro todo,
 * não quatro por projeto.
 */

const groupBy = <T extends { project_id: string }>(rows: T[]) => {
  const map = new Map<string, T[]>();
  rows.forEach((row) => map.set(row.project_id, [...(map.get(row.project_id) ?? []), row]));
  return map;
};

/** Linhas da consulta, ou o erro dela. */
function rowsOf<T>(response: { data: T[] | null; error: unknown }): T[] {
  if (response.error) throw response.error;
  return response.data ?? [];
}

async function loadSources(ids: string[]) {
  const [okrs, milestones, allocations, stakeholders] = await Promise.all([
    supabase.from('project_okrs').select('project_id, key_results:project_key_results(id)').in('project_id', ids),
    supabase.from('project_milestones').select('project_id, start_date, end_date').in('project_id', ids),
    supabase.from('project_role_allocations').select('project_id, employee_id, year, month, planned_hours').in('project_id', ids),
    supabase.from('project_stakeholders').select('project_id').in('project_id', ids),
  ]);
  return {
    okrs: groupBy(rowsOf(okrs)),
    milestones: groupBy(rowsOf(milestones)),
    allocations: groupBy(rowsOf(allocations)),
    stakeholders: groupBy(rowsOf(stakeholders)),
  };
}

type AllocationRow = { employee_id: string; year: number; month: number; planned_hours: number };

/** Linhas de mês da alocação no formato que a regra lê (uma "alocação" por linha basta). */
const toAllocations = (rows: AllocationRow[]) =>
  rows.map((row) => ({
    employeeId: row.employee_id,
    monthlyHours: [{ id: '', year: row.year, month: row.month, plannedHours: Number(row.planned_hours || 0), costPerHour: null }] as MonthlyHours[],
  }));

const noMoney = () => '';

export async function fetchPlanningReadiness(projects: PlanningReadinessProject[]): Promise<Map<string, PlanningReadiness>> {
  const result = new Map<string, PlanningReadiness>();
  if (!projects.length) return result;
  const ids = projects.map((project) => project.id);
  const [sources, awaiting] = await Promise.all([loadSources(ids), fetchOpenPlanningApprovals(ids).catch(() => new Set<string>())]);

  projects.forEach((project) => {
    const counts = planningCountsFrom({
      period: { start: project.start_date, end: project.is_continuous ? null : project.end_date },
      keyResultsPerObjective: (sources.okrs.get(project.id) ?? []).map((okr) => okr.key_results?.length ?? 0),
      milestones: sources.milestones.get(project.id) ?? [],
      allocations: toAllocations(sources.allocations.get(project.id) ?? []),
      stakeholderCount: (sources.stakeholders.get(project.id) ?? []).length,
      costs: [],
      hasClient: project.hasClient,
      clientName: '',
    });
    const checklist = planningChecklist(counts, noMoney);
    result.set(project.id, {
      requiredDone: checklist.requiredDone,
      requiredTotal: checklist.requiredTotal,
      awaitingApproval: awaiting.has(project.id),
    });
  });
  return result;
}
