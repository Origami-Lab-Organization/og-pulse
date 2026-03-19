import { differenceInMonths, parseISO, isPast } from 'date-fns';
import { PortfolioProject } from '@/hooks/usePortfolioProjects';

type HealthLevel = 'good' | 'warning' | 'critical' | 'neutral';

const healthRank: Record<HealthLevel, number> = { neutral: 0, good: 1, warning: 2, critical: 3 };
const worst = (a: HealthLevel, b: HealthLevel): HealthLevel =>
  healthRank[a] >= healthRank[b] ? a : b;

export interface ProjectHealthResult {
  level: HealthLevel;
  label: string;
  className: string;
  tooltipLines: string[];
}

export function getProjectHealth(project: PortfolioProject): ProjectHealthResult {
  const stage = project.portfolio_stage;

  // Completed projects get a fixed badge — skip all calculations
  if (stage === 'completed') {
    return {
      level: 'good',
      label: 'Concluído',
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-[10px]',
      tooltipLines: ['Projeto concluído'],
    };
  }

  // ── Financial health ──────────────────────────────────────────────
  const installments = project.installments || [];
  const installmentsSum = installments.reduce((s, i) => s + Number(i.value), 0);
  const totalValue = installmentsSum > 0 ? installmentsSum : (project.total_value || 0);
  const receivedValue = installments
    .filter(i => i.status === 'received')
    .reduce((s, i) => s + Number(i.value), 0);

  let financialHealth: HealthLevel = 'neutral';
  let financialTooltip = '';

  if (stage !== 'planning' && !['no_revenue'].includes(project.service?.billing_type ?? '')) {
    const monthsElapsed = project.start_date
      ? Math.max(differenceInMonths(new Date(), parseISO(project.start_date)), 0)
      : 0;
    const totalMonths = project.end_date
      ? Math.max(differenceInMonths(parseISO(project.end_date), parseISO(project.start_date!)), 1)
      : 12;
    const expectedReceived = Math.min((monthsElapsed / totalMonths) * totalValue, totalValue);
    const receiptPct = expectedReceived > 0 ? (receivedValue / expectedReceived) * 100 : 100;
    const overallPct = totalValue > 0 ? Math.round((receivedValue / totalValue) * 100) : 0;

    financialTooltip = `Financeiro: ${overallPct}% recebido do esperado`;

    const laterStages = ['value_delivery', 'results_presentation', 'learning_case'];
    if (receiptPct >= 80) {
      financialHealth = 'good';
    } else if (receiptPct >= 40) {
      financialHealth = 'warning';
    } else if (receiptPct < 40 || (laterStages.includes(stage) && receivedValue === 0)) {
      financialHealth = 'critical';
    }

    // Extra warning: later stage, zero receipts but recently started
    if (laterStages.includes(stage) && receivedValue === 0 && monthsElapsed <= 2) {
      financialHealth = worst(financialHealth, 'warning');
    }
  } else {
    const overallPct = totalValue > 0 ? Math.round((receivedValue / totalValue) * 100) : 0;
    financialTooltip = `Financeiro: ${overallPct}% recebido do esperado`;
  }

  // ── Schedule health ───────────────────────────────────────────────
  const milestones = project.milestones || [];
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const overdueMilestones = milestones.filter(
    m => m.status === 'delayed' || (m.end_date && isPast(parseISO(m.end_date)) && m.status !== 'completed')
  ).length;

  let scheduleHealth: HealthLevel;
  const scheduleLines: string[] = [];

  if (totalMilestones === 0) {
    if (stage === 'planning') {
      scheduleHealth = 'neutral';
      scheduleLines.push('Sem marcos cadastrados');
    } else {
      scheduleHealth = 'critical';
      scheduleLines.push('Sem marcos cadastrados');
    }
  } else {
    scheduleLines.push(`Cronograma: ${completedMilestones} de ${totalMilestones} marcos concluídos`);
    if (overdueMilestones > 0) {
      scheduleLines.push(`${overdueMilestones} marco(s) atrasado(s)`);
    }
    const overdueRatio = overdueMilestones / totalMilestones;
    if (overdueMilestones === 0) {
      scheduleHealth = 'good';
    } else if (overdueRatio > 0.5) {
      scheduleHealth = 'critical';
    } else {
      scheduleHealth = 'warning';
    }
  }

  // ── Combine ───────────────────────────────────────────────────────
  let combined: HealthLevel;
  if (scheduleHealth === 'neutral' && financialHealth === 'neutral') {
    combined = 'neutral';
  } else if (scheduleHealth === 'neutral') {
    combined = financialHealth;
  } else if (financialHealth === 'neutral') {
    combined = scheduleHealth;
  } else {
    combined = worst(scheduleHealth, financialHealth);
  }

  const tooltipLines = scheduleLines.length > 0
    ? [...scheduleLines, financialTooltip].filter(Boolean)
    : [financialTooltip].filter(Boolean);

  const badgeMap: Record<HealthLevel, { label: string; className: string }> = {
    good:     { label: 'Em dia',   className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-[10px]' },
    warning:  { label: 'Atenção',  className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 text-[10px]' },
    critical: { label: 'Atrasado', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-[10px]' },
    neutral:  { label: 'Novo',     className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[10px]' },
  };

  return { level: combined, tooltipLines, ...badgeMap[combined] };
}
