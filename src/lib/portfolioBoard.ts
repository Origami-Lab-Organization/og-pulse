import type { PortfolioProject } from '@/hooks/usePortfolioProjects';
import type { InstallmentStatus } from '@/types/project';
import type { BillingType } from '@/types/service';
import { forecastTone } from '@/lib/projectForecast';
import {
  PORTFOLIO_BOARD_COLUMN,
  PORTFOLIO_STAGE,
  type PortfolioAlert,
  type PortfolioBoardColumnId,
  type PortfolioKpis,
  type PortfolioMargin,
  type PortfolioProjectForecast,
} from '@/types/portfolio';

/**
 * Quadro e indicadores do portfólio (US-0034, US-0035). Datas `yyyy-MM-dd` comparadas como
 * texto, sem `new Date`, que desloca o dia 1º pelo fuso.
 */

/** O projeto entra em Encerramento nos últimos 20 dias corridos antes da data de fim. */
export const CLOSING_WINDOW_DAYS = 20;

const RECEIVED: InstallmentStatus = 'received';

const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Faltam 20 dias ou menos para a data de fim (ou ela já passou). Contínuo nunca encerra. */
function isInClosingWindow(project: Pick<PortfolioProject, 'end_date' | 'is_continuous'>, today: string): boolean {
  if (project.is_continuous || !project.end_date) return false;
  return addDays(today, CLOSING_WINDOW_DAYS) >= project.end_date;
}

/** Coluna do quadro em que o projeto aparece. */
export function boardColumnOf(
  project: Pick<PortfolioProject, 'portfolio_stage' | 'end_date' | 'is_continuous'>,
  today: string,
): PortfolioBoardColumnId {
  switch (project.portfolio_stage) {
    case PORTFOLIO_STAGE.COMPLETED:
      return PORTFOLIO_BOARD_COLUMN.COMPLETED;
    case PORTFOLIO_STAGE.RESULTS_PRESENTATION:
    case PORTFOLIO_STAGE.LEARNING_CASE:
      return PORTFOLIO_BOARD_COLUMN.CLOSING;
    case PORTFOLIO_STAGE.VALUE_DELIVERY:
      return isInClosingWindow(project, today) ? PORTFOLIO_BOARD_COLUMN.CLOSING : PORTFOLIO_BOARD_COLUMN.VALUE_DELIVERY;
    default:
      return PORTFOLIO_BOARD_COLUMN.PLANNING;
  }
}

/** Concluído no ano: pela data real de conclusão; sem ela, pela data de fim. */
export function isCompletedInYear(project: Pick<PortfolioProject, 'completed_date' | 'end_date'>, year: number): boolean {
  const date = project.completed_date || project.end_date || '';
  return date.startsWith(String(year));
}

/** Dias até a data de fim (negativo depois dela). */
export function daysToEnd(endDate: string, today: string): number {
  return Math.round((Date.parse(`${endDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
}

const NO_REVENUE: BillingType = 'no_revenue';

/** Projeto de serviço sem receita (pré-venda, prospecção): o card não mostra recebimento. */
export const isNoRevenueProject = (project: PortfolioProject) => project.service?.billing_type === NO_REVENUE;

/** Soma das parcelas recebidas do projeto. */
export const receivedOf = (project: PortfolioProject) =>
  (project.installments || [])
    .filter((installment) => installment.status === RECEIVED)
    .reduce((sum, installment) => sum + Number(installment.value), 0);

/**
 * Indicadores do portfólio no ano:
 * - carteira ativa: contrato dos projetos em andamento (hoje);
 * - receita esperada: parcelas com vencimento no ano;
 * - recebido: dessas parcelas do ano, as já recebidas — assim "% do esperado" e "ainda a receber
 *   no ano" fecham com a receita esperada.
 */
export function portfolioKpis(projects: PortfolioProject[], year: number): PortfolioKpis {
  const yearText = String(year);
  const active = projects.filter((project) => project.portfolio_stage !== PORTFOLIO_STAGE.COMPLETED);
  const installments = projects.flatMap((project) => project.installments || []);

  return {
    activeCount: active.length,
    activeContract: active.reduce((sum, project) => sum + (project.total_value || 0), 0),
    expectedRevenue: installments
      .filter((installment) => installment.due_date?.startsWith(yearText))
      .reduce((sum, installment) => sum + Number(installment.value), 0),
    receivedRevenue: installments
      .filter((installment) => installment.status === RECEIVED && installment.due_date?.startsWith(yearText))
      .reduce((sum, installment) => sum + Number(installment.value), 0),
  };
}

/** Ordem dentro da coluna: quem termina antes vem primeiro; em Concluído, o mais recente. */
export function sortForColumn(projects: PortfolioProject[], column: PortfolioBoardColumnId): PortfolioProject[] {
  const key = (project: PortfolioProject) =>
    column === PORTFOLIO_BOARD_COLUMN.COMPLETED ? project.completed_date || project.end_date || '' : project.end_date || '9999';
  const sorted = [...projects].sort((a, b) => key(a).localeCompare(key(b)));
  return column === PORTFOLIO_BOARD_COLUMN.COMPLETED ? sorted.reverse() : sorted;
}

/** O mínimo que as pendências leem: serve ao card do portfólio e à Visão Geral do projeto. */
interface AlertProject {
  portfolio_stage?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  installments?: { status: string; due_date: string }[] | null;
}

const PLANNING_STALE_DAYS = 30;

const fmtPercent = (value: number, hide: boolean) => (hide ? '•••' : `${value.toFixed(1).replace('.', ',')}%`);
const fmtShort = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(2, 4)}`;

function overdueInstallmentAlerts(project: AlertProject, today: string): PortfolioAlert[] {
  return (project.installments || [])
    .filter((installment) => installment.status !== RECEIVED && installment.due_date && installment.due_date < today)
    .map((installment) => ({
      level: 'late' as const,
      text: `Parcela de ${fmtShort(installment.due_date)} vencida há ${-daysToEnd(installment.due_date, today)} dias`,
    }));
}

function stageAlerts(project: AlertProject, today: string): PortfolioAlert[] {
  const alerts: PortfolioAlert[] = [];
  if (project.portfolio_stage === PORTFOLIO_STAGE.PLANNING && project.start_date && daysToEnd(project.start_date, today) < -PLANNING_STALE_DAYS) {
    alerts.push({ level: 'late', text: `Em planejamento há mais de ${PLANNING_STALE_DAYS} dias da data de início` });
  }
  if (project.portfolio_stage !== PORTFOLIO_STAGE.COMPLETED && project.end_date && project.end_date < today) {
    alerts.push({ level: 'attention', text: `Terminou em ${fmtShort(project.end_date)} e ainda não foi concluído` });
  }
  return alerts;
}

function marginAlert(forecast: PortfolioProjectForecast | undefined, hide: boolean): PortfolioAlert[] {
  if (!forecast) return [];
  const tone = forecastTone(forecast.forecastMargin, forecast.target, forecast.hasCostPlanned);
  if (tone !== 'warning' && tone !== 'critical') return [];
  return [{
    level: tone === 'critical' ? 'late' : 'attention',
    text: `Margem projetada de ${fmtPercent(forecast.forecastMargin, hide)} contra a meta de ${hide ? '•••' : `${forecast.target}%`}`,
  }];
}

/**
 * Pendências do projeto (US-0037): parcela vencida, planejamento parado, fim passado sem
 * concluir e margem projetada fora da meta. Projeto concluído não tem pendência.
 */
export function alertsOf(
  project: AlertProject,
  today: string,
  forecast?: PortfolioProjectForecast,
  hide = false,
): PortfolioAlert[] {
  if (project.portfolio_stage === PORTFOLIO_STAGE.COMPLETED) return [];
  return [...overdueInstallmentAlerts(project, today), ...stageAlerts(project, today), ...marginAlert(forecast, hide)];
}

/** Margem bruta do portfólio: margens projetadas dos projetos ativos, ponderadas pelo contrato. */
export function portfolioMargin(forecasts: PortfolioProjectForecast[]): PortfolioMargin | null {
  const valid = forecasts.filter((forecast) => forecast.hasCostPlanned && forecast.contract > 0);
  const totalContract = valid.reduce((sum, forecast) => sum + forecast.contract, 0);
  if (!totalContract) return null;
  return {
    percent: valid.reduce((sum, forecast) => sum + forecast.contract * forecast.forecastMargin, 0) / totalContract,
    projectCount: valid.length,
    inTargetCount: valid.filter((forecast) => forecastTone(forecast.forecastMargin, forecast.target, true) === 'ok').length,
  };
}
