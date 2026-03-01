import { useMemo } from 'react';
import { useLeads, useArchivedLeads } from '@/hooks/useLeads';
import { useBudgets } from '@/hooks/useBudgets';
import { useClients } from '@/hooks/useClients';
import { LeadWithBudget, CRM_LEAD_COLUMNS, ARCHIVE_REASONS } from '@/types/lead';
import { differenceInDays, parseISO, getMonth, getYear, format, eachMonthOfInterval, startOfMonth, endOfMonth, differenceInMilliseconds } from 'date-fns';

interface ResponsibleOption {
  id: string;
  name: string;
}

interface CommercialDashboardData {
  // KPIs
  conversionRate: number;
  avgTicket: number;
  avgSalesCycleDays: number | null;
  activePipeline: number;
  pipelineLeadsWithBudgetCount: number;
  pipelineHasNoProposals: boolean;
  forecast: number;
  newLeadsThisYear: number;

  // Previous period KPIs
  prevConversionRate: number;
  prevAvgTicket: number;
  prevAvgSalesCycleDays: number | null;
  prevActivePipeline: number;
  prevForecast: number;
  prevNewLeadsThisYear: number;

  // Funnel
  funnelData: { stage: string; label: string; count: number; color: string }[];

  // Revenue by month
  revenueByMonth: { month: string; wonMonth: number; lostMonth: number; wonAccumulated: number }[];

  // Pipeline donut
  pipelineByStage: { name: string; value: number; count: number }[];
  totalPipeline: number;

  // Top clients
  topClients: { name: string; value: number }[];

  // Loss reasons
  lossReasons: { reason: string; count: number }[];

  // Recent leads
  recentLeads: LeadWithBudget[];

  // Responsible options
  responsibleOptions: ResponsibleOption[];
}

const STAGE_COLORS: Record<string, string> = {
  screening: 'hsl(var(--chart-1))',
  qualification: 'hsl(var(--chart-5))',
  proposal: 'hsl(var(--chart-3))',
  negotiation: 'hsl(var(--chart-4))',
  closed: 'hsl(var(--success))',
};

function isInRange(dateStr: string, from: Date, to: Date): boolean {
  const d = parseISO(dateStr);
  return d >= from && d <= to;
}

const STAGE_PROBABILITY: Record<string, number> = {
  screening: 0.10,
  qualification: 0.25,
  proposal: 0.50,
  negotiation: 0.75,
  closed: 1.0,
};

function computeKPIs(leads: LeadWithBudget[]) {
  const activeLeads = leads.filter(l => !l.archived);
  const closedLeads = leads.filter(l => l.crm_stage === 'closed' && !l.archived);
  const totalLeads = leads.length;

  const conversionRate = totalLeads > 0 ? (closedLeads.length / totalLeads) * 100 : 0;

  const closedValues = closedLeads.map(l => {
    if (l.budget?.final_total && l.budget.final_total > 0) return l.budget.final_total;
    return l.estimated_value;
  });
  const avgTicket = closedValues.length > 0 ? closedValues.reduce((a, b) => a + b, 0) / closedValues.length : 0;

  const cyclesInDays = closedLeads
    .filter(l => l.closed_at)
    .map(l => differenceInDays(parseISO(l.closed_at!), parseISO(l.created_at)));
  const avgSalesCycleDays = cyclesInDays.length > 0 ? cyclesInDays.reduce((a, b) => a + b, 0) / cyclesInDays.length : null;

  const getLeadValue = (l: LeadWithBudget) =>
    (l.budget?.final_total && l.budget.final_total > 0) ? l.budget.final_total : l.estimated_value;

  const pipelineLeads = activeLeads.filter(l => l.crm_stage !== 'closed');
  const pipelineLeadsWithBudget = pipelineLeads.filter(l => getLeadValue(l) > 0);
  const activePipeline = pipelineLeadsWithBudget.reduce((sum, l) => sum + getLeadValue(l), 0);
  const pipelineLeadsWithBudgetCount = pipelineLeadsWithBudget.length;
  const pipelineHasNoProposals = pipelineLeadsWithBudgetCount === 0 && pipelineLeads.length > 0;

  // Forecast: sum of (lead value × stage probability) for all active leads
  const forecast = activeLeads.reduce((sum, l) => {
    const prob = STAGE_PROBABILITY[l.crm_stage] ?? 0;
    return sum + getLeadValue(l) * prob;
  }, 0);

  const newLeadsThisYear = leads.length;

  return { conversionRate, avgTicket, avgSalesCycleDays, activePipeline, pipelineLeadsWithBudgetCount, pipelineHasNoProposals, forecast, newLeadsThisYear };
}

export function useCommercialDashboard(dateFrom: Date, dateTo: Date, selectedServiceLine: string, selectedResponsible: string) {
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: archivedLeads = [], isLoading: archivedLoading } = useArchivedLeads();
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets();
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  const isLoading = leadsLoading || archivedLoading || budgetsLoading || clientsLoading;

  const data = useMemo<CommercialDashboardData | null>(() => {
    if (isLoading) return null;

    const allLeads = [...leads, ...archivedLeads] as LeadWithBudget[];

    // Extract responsible options from ALL leads (before filtering)
    const responsibleMap = new Map<string, string>();
    allLeads.forEach(l => {
      if (l.responsible_id && l.responsible?.nome) {
        responsibleMap.set(l.responsible_id, l.responsible.nome);
      }
    });
    const responsibleOptions: ResponsibleOption[] = Array.from(responsibleMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Filter by service line
    let filtered = selectedServiceLine === 'all'
      ? allLeads
      : allLeads.filter(l => l.service_line === selectedServiceLine);

    // Filter by responsible
    if (selectedResponsible !== 'all') {
      filtered = filtered.filter(l => l.responsible_id === selectedResponsible);
    }

    // Filter by date range (created_at)
    const periodFiltered = filtered.filter(l => isInRange(l.created_at, dateFrom, dateTo));

    // Active leads in period
    const activeLeadsPeriod = periodFiltered.filter(l => !l.archived);
    const archivedPeriod = periodFiltered.filter(l => l.archived);

    // Current period KPIs
    const currentKPIs = computeKPIs(periodFiltered);

    // Previous period KPIs (same duration shifted back)
    const durationMs = differenceInMilliseconds(dateTo, dateFrom);
    const prevTo = new Date(dateFrom.getTime() - 1); // day before dateFrom
    const prevFrom = new Date(prevTo.getTime() - durationMs);
    const prevPeriodFiltered = filtered.filter(l => isInRange(l.created_at, prevFrom, prevTo));
    const prevKPIs = computeKPIs(prevPeriodFiltered);

    // Funnel data
    const funnelData = CRM_LEAD_COLUMNS.map(col => ({
      stage: col.id,
      label: col.label,
      count: activeLeadsPeriod.filter(l => l.crm_stage === col.id).length,
      color: STAGE_COLORS[col.id] || 'hsl(var(--muted))',
    }));

    // Revenue by month — dynamic labels based on date range
    const months = eachMonthOfInterval({ start: dateFrom, end: dateTo });
    let accWon = 0;
    const revenueByMonthData = months.map(monthDate => {
      const label = format(monthDate, 'MMM/yy');
      const monthIdx = getMonth(monthDate);
      const yearVal = getYear(monthDate);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);

      const wonThisMonth = filtered
        .filter(l => l.crm_stage === 'closed' && !l.archived)
        .filter(l => {
          const dateStr = l.closed_at || l.updated_at;
          const d = parseISO(dateStr);
          return d >= mStart && d <= mEnd;
        })
        .reduce((sum, l) => sum + (l.budget?.final_total || l.estimated_value), 0);

      const lostThisMonth = filtered
        .filter(l => l.archived)
        .filter(l => {
          const dateStr = l.archived_at || l.updated_at;
          const d = parseISO(dateStr);
          return d >= mStart && d <= mEnd;
        })
        .reduce((sum, l) => sum + (l.budget?.final_total || l.estimated_value), 0);

      accWon += wonThisMonth;
      return { month: label, wonMonth: wonThisMonth, lostMonth: lostThisMonth, wonAccumulated: accWon };
    });

    // Pipeline by stage (donut)
    const pipelineStages = ['screening', 'qualification', 'proposal', 'negotiation'] as const;
    const pipelineByStage = pipelineStages.map(stage => {
      const stageLeads = activeLeadsPeriod.filter(l => l.crm_stage === stage);
      const col = CRM_LEAD_COLUMNS.find(c => c.id === stage);
      return {
        name: col?.label || stage,
        value: stageLeads.reduce((sum, l) => sum + l.estimated_value, 0),
        count: stageLeads.length,
      };
    }).filter(s => s.count > 0);

    const totalPipeline = pipelineByStage.reduce((s, p) => s + p.value, 0);

    // Top 5 clients by revenue (closed leads in period)
    const closedLeads = periodFiltered.filter(l => l.crm_stage === 'closed' && !l.archived);
    const clientRevenue: Record<string, number> = {};
    closedLeads.forEach(l => {
      const name = l.company_name || 'Sem empresa';
      const val = l.budget?.final_total || l.estimated_value;
      clientRevenue[name] = (clientRevenue[name] || 0) + val;
    });
    const topClients = Object.entries(clientRevenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Loss reasons
    const reasonCounts: Record<string, number> = {};
    archivedPeriod.forEach(l => {
      const reason = l.archive_reason || 'other';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    const lossReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => {
        const label = ARCHIVE_REASONS.find(r => r.value === reason)?.label || reason;
        return { reason: label, count };
      })
      .sort((a, b) => b.count - a.count);

    // Recent leads (5 most recent from all, no filter)
    const recentLeads = [...allLeads]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    return {
      ...currentKPIs,
      prevConversionRate: prevKPIs.conversionRate,
      prevAvgTicket: prevKPIs.avgTicket,
      prevAvgSalesCycleDays: prevKPIs.avgSalesCycleDays,
      prevActivePipeline: prevKPIs.activePipeline,
      prevForecast: prevKPIs.forecast,
      prevNewLeadsThisYear: prevKPIs.newLeadsThisYear,
      funnelData,
      revenueByMonth: revenueByMonthData,
      pipelineByStage,
      totalPipeline,
      topClients,
      lossReasons,
      recentLeads,
      responsibleOptions,
    };
  }, [leads, archivedLeads, budgets, clients, isLoading, dateFrom, dateTo, selectedServiceLine, selectedResponsible]);

  return { data, isLoading };
}
