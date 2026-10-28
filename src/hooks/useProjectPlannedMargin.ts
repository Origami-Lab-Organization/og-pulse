import { useMemo } from 'react';
import { addMonths, parseISO, startOfMonth } from 'date-fns';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectSupplierMonths } from '@/hooks/useProjectSupplierMonths';
import { useProjectPlannedLaborCost } from '@/hooks/useProjectPlannedLaborCost';
import { useHolidays } from '@/hooks/useHolidays';
import { useBudget } from '@/hooks/useBudgets';
import { getFallbackHourlyCost } from '@/lib/employeeCost';
import { Holiday } from '@/types/holiday';
import { ProjectMemberMonthDB, ProjectSupplierMonthDB, ProjectWithRelations } from '@/types/project';

type ProjectMember = NonNullable<ProjectWithRelations['members']>[number];

function memberFallbackHourlyCost(member: ProjectMember, year: number, monthIndex: number, holidays: Holiday[]) {
  if (!member.employee) return Number(member.hourly_rate) || 0;
  return getFallbackHourlyCost(
    member.employee.total_monthly_cost_estimated || 0,
    member.employee.jornada_diaria || 8,
    year,
    monthIndex,
    holidays,
  );
}

/** Mão de obra planejada de um membro sem alocação por papel (modelo legado por membro/mês). */
function legacyMemberLaborPlanned(
  member: ProjectMember,
  entries: ProjectMemberMonthDB[],
  project: ProjectWithRelations,
  holidays: Holiday[],
) {
  const projectStart = startOfMonth(parseISO(project.start_date));
  if (entries.length === 0) {
    const fallback = memberFallbackHourlyCost(member, projectStart.getFullYear(), projectStart.getMonth(), holidays);
    return fallback * Number(member.hours_per_month || 0) * project.duration_months;
  }
  return entries.reduce((sum, mm) => {
    if (mm.cost_per_hour != null) return sum + Number(mm.cost_per_hour) * Number(mm.hours);
    const monthDate = addMonths(projectStart, mm.month_number - 1);
    const fallback = memberFallbackHourlyCost(member, monthDate.getFullYear(), monthDate.getMonth(), holidays);
    return sum + fallback * Number(mm.hours);
  }, 0);
}

function supplierCostPlanned(project: ProjectWithRelations, supplierMonths: ProjectSupplierMonthDB[]) {
  const fromMonths = supplierMonths.reduce((sum, sm) => sum + sm.value, 0);
  if (fromMonths) return fromMonths;
  return (project.suppliers || []).reduce((acc, sup) => {
    const months = sup.end_month ? sup.end_month - sup.start_month + 1 : project.duration_months;
    return acc + Number(sup.monthly_value || 0) * months;
  }, 0);
}

function materialCostPlanned(project: ProjectWithRelations) {
  return (project.materials || []).reduce((sum, m) => sum + Number(m.value || 0), 0);
}

/**
 * Fonte ÚNICA da margem planejada do projeto exibida na Visão Geral e usada pela simulação
 * de alocação: (receita − comissão do orçamento − custo planejado) ÷ receita, sem impostos.
 * Custo planejado = mão de obra (alocações por papel; legado por membro) + fornecedores + materiais.
 */
export function useProjectPlannedMargin(project: ProjectWithRelations) {
  const memberIds = useMemo(() => (project.members || []).map((m) => m.id), [project.members]);
  const supplierIds = useMemo(() => (project.suppliers || []).map((s) => s.id), [project.suppliers]);

  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  const { data: supplierMonths = [] } = useProjectSupplierMonths(supplierIds);
  const { data: holidays = [] } = useHolidays();
  const { data: budget } = useBudget(project.budget_id);
  const plannedLabor = useProjectPlannedLaborCost(project, project.duration_months);

  return useMemo(() => {
    const revenue = Number(project.total_value || 0);

    const laborPlanned = plannedLabor.hasRoleAllocations
      ? plannedLabor.total
      : (project.members || []).reduce((acc, member) => {
          const entries = memberMonths.filter((mm) => mm.project_member_id === member.id);
          return acc + legacyMemberLaborPlanned(member, entries, project, holidays);
        }, 0);

    const commissionPlanned = budget ? (budget.commission_percent / 100) * budget.total_with_fees : 0;
    const costPlanned = laborPlanned + supplierCostPlanned(project, supplierMonths) + materialCostPlanned(project);
    const marginPlanned = revenue > 0 ? ((revenue - commissionPlanned - costPlanned) / revenue) * 100 : 0;

    return { revenue, commissionPlanned, costPlanned, marginPlanned };
  }, [project, plannedLabor.hasRoleAllocations, plannedLabor.total, memberMonths, supplierMonths, holidays, budget]);
}
