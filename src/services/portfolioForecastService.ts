import { projectService } from '@/services/projectService';
import { equipeService } from '@/services/equipeService';
import { budgetService } from '@/services/budgetService';
import { groupAllocations } from '@/hooks/useProjectRoles';
import { fetchProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { fetchProjectTimesheets } from '@/hooks/useProjectTimesheets';
import { fetchProjectCostItems } from '@/hooks/useProjectCostItems';
import { computeProjectCosts } from '@/lib/projectCostMonths';
import { buildProjectForecast } from '@/lib/projectForecast';
import { versaoVigenteEm } from '@/lib/financialSettingsVigencia';
import type { Holiday } from '@/types/holiday';
import type { FinancialSettings } from '@/types/financialSettings';
import type { PortfolioProjectForecast } from '@/types/portfolio';

interface FetchForecastParams {
  projectId: string;
  tenantId: string;
  holidays: Holiday[];
  settingsVersions: FinancialSettings[];
  today: Date;
}

/**
 * Forecast de um projeto para o portfólio, com as mesmas fontes e regras da aba Financeiro
 * (US-0025, US-0026, US-0031): o número do portfólio é o mesmo do projeto.
 *
 * Custo conhecido: carrega projeto, alocações, horas, custos e orçamento de cada projeto. Uma
 * agregação no banco evitaria isso — dívida registrada na US-0036 (sugestão de ADR).
 */
export async function fetchPortfolioProjectForecast(params: FetchForecastParams): Promise<PortfolioProjectForecast | null> {
  const { projectId, tenantId, holidays, settingsVersions, today } = params;
  const project = await projectService.getById(projectId, tenantId);
  if (!project) return null;

  const [rawAllocations, memberMonths, timesheets, costs, budget] = await Promise.all([
    equipeService.getProjectAllocations(projectId, true),
    fetchProjectMemberMonths((project.members || []).map((member) => member.id)),
    fetchProjectTimesheets(projectId),
    fetchProjectCostItems(projectId),
    project.budget_id ? budgetService.getById(project.budget_id, tenantId) : Promise.resolve(null),
  ]);

  const costSummary = computeProjectCosts({
    project,
    allocations: groupAllocations(rawAllocations),
    memberMonths,
    timesheets,
    costs,
    holidays,
  });
  const contract = Number(project.total_value || 0);
  const commissionPlanned = budget ? (budget.commission_percent / 100) * budget.total_with_fees : 0;
  const forecast = buildProjectForecast({ months: costSummary.months, project, contract, commissionPlanned, today });

  return {
    projectId,
    contract,
    forecastCost: forecast.forecastCost,
    forecastMargin: forecast.forecastMargin,
    hasCostPlanned: costSummary.totalPlanned > 0,
    target: versaoVigenteEm(settingsVersions, project.start_date)?.gross_margin_target_percent ?? 0,
  };
}
