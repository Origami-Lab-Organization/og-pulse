import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLeads, useArchivedLeads } from '@/hooks/useLeads';
import { useBudgets } from '@/hooks/useBudgets';
import { useClients } from '@/hooks/useClients';
import { useServiceAvgTicketsMap } from '@/hooks/useServiceAvgTicketsMap';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  LeadWithBudget, ARCHIVE_REASONS, LEAD_SOURCE_LABELS, CRM_FUNNEL_STAGES,
  getStageChartColor, getStageForecastWeight, getStageLabel, isClosedOutcome, isInFollowUpStage,
} from '@/types/lead';
import { resolveLeadEstimatedValue, ServiceAvgTicketLookup, EMPTY_AVG_TICKET_LOOKUP } from '@/lib/leadValue';
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
  forecastLeadsCount: number;
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

  // Leads by source (origem)
  leadsBySource: { source: string; label: string; count: number; wonCount: number; conversionRate: number }[];

  // Recent leads
  recentLeads: LeadWithBudget[];

  // All active leads in period (for PDF export)
  activeLeadsPeriod: LeadWithBudget[];

  // Responsible options
  responsibleOptions: ResponsibleOption[];
}

function isInRange(dateStr: string, from: Date, to: Date): boolean {
  const d = parseISO(dateStr);
  return d >= from && d <= to;
}

function computeKPIs(leads: LeadWithBudget[], avgTickets: ServiceAvgTicketLookup) {
  const activeLeads = leads.filter(l => !l.archived);
  const closedLeads = leads.filter(l => l.crm_stage === 'closed' && !l.archived);
  const totalLeads = leads.length;

  const conversionRate = totalLeads > 0 ? (closedLeads.length / totalLeads) * 100 : 0;

  const getLeadValue = (l: LeadWithBudget) => resolveLeadEstimatedValue(l, avgTickets);

  const closedValues = closedLeads.map(getLeadValue);
  const avgTicket = closedValues.length > 0 ? closedValues.reduce((a, b) => a + b, 0) / closedValues.length : 0;

  const cyclesInDays = closedLeads
    .filter(l => l.closed_at)
    .map(l => differenceInDays(parseISO(l.closed_at!), parseISO(l.created_at)));
  const avgSalesCycleDays = cyclesInDays.length > 0 ? cyclesInDays.reduce((a, b) => a + b, 0) / cyclesInDays.length : null;

  // Pipeline ativo exclui o Follow Up: negócio esfriado com data de retorno não é
  // pipeline em aberto, e contá-lo infla o valor projetado.
  const pipelineLeads = activeLeads.filter(
    l => !isClosedOutcome(l.crm_stage) && !isInFollowUpStage(l.crm_stage)
  );
  const pipelineLeadsWithBudget = pipelineLeads.filter(l => getLeadValue(l) > 0);
  const activePipeline = pipelineLeadsWithBudget.reduce((sum, l) => sum + getLeadValue(l), 0);
  const pipelineLeadsWithBudgetCount = pipelineLeadsWithBudget.length;
  const pipelineHasNoProposals = pipelineLeadsWithBudgetCount === 0 && pipelineLeads.length > 0;

  // Forecast: sum of (lead value × stage probability) only for leads with value > 0
  const forecastLeads = activeLeads.filter(l => getLeadValue(l) > 0);
  const forecast = forecastLeads.reduce((sum, l) => {
    return sum + getLeadValue(l) * getStageForecastWeight(l.crm_stage);
  }, 0);
  const forecastLeadsCount = forecastLeads.length;

  const newLeadsThisYear = leads.length;

  return { conversionRate, avgTicket, avgSalesCycleDays, activePipeline, pipelineLeadsWithBudgetCount, pipelineHasNoProposals, forecast, forecastLeadsCount, newLeadsThisYear };
}

export function useCommercialDashboard(dateFrom: Date, dateTo: Date, selectedServiceLine: string, selectedResponsible: string) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: archivedLeads = [], isLoading: archivedLoading } = useArchivedLeads();
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: avgTickets = EMPTY_AVG_TICKET_LOOKUP, isLoading: avgTicketsLoading } = useServiceAvgTicketsMap();

  // Fetch budget_ids of cancelled projects to exclude their leads
  const { data: cancelledBudgetIds = [], isLoading: cancelledLoading } = useQuery({
    queryKey: ['cancelled-project-budget-ids', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('projects')
        .select('budget_id, lead_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'cancelled');
      return (data || []).map((p: any) => ({
        budgetId: p.budget_id,
        leadId: p.lead_id,
      }));
    },
    enabled: !!tenantId,
  });

  const isLoading = leadsLoading || archivedLoading || budgetsLoading || clientsLoading || cancelledLoading || avgTicketsLoading;

  const data = useMemo<CommercialDashboardData | null>(() => {
    if (isLoading) return null;

    // Exclude leads linked to cancelled projects
    const cancelledLeadIds = new Set(cancelledBudgetIds.filter((c: any) => c.leadId).map((c: any) => c.leadId));
    const filterCancelled = (leadsList: any[]) => leadsList.filter((l: any) => !cancelledLeadIds.has(l.id));
    
    const allLeads = [...filterCancelled(leads), ...filterCancelled(archivedLeads)] as LeadWithBudget[];

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

    // Current period KPIs
    const currentKPIs = computeKPIs(periodFiltered, avgTickets);

    // Previous period KPIs (same duration shifted back)
    const durationMs = differenceInMilliseconds(dateTo, dateFrom);
    const prevTo = new Date(dateFrom.getTime() - 1); // day before dateFrom
    const prevFrom = new Date(prevTo.getTime() - durationMs);
    const prevPeriodFiltered = filtered.filter(l => isInRange(l.created_at, prevFrom, prevTo));
    const prevKPIs = computeKPIs(prevPeriodFiltered, avgTickets);

    // Funnel data
    // Funil de conversão usa apenas as etapas sequenciais — Follow Up é estado
    // lateral e apareceria como um degrau falso na taxa de conversão.
    const funnelData = CRM_FUNNEL_STAGES.map(stage => ({
      stage,
      label: getStageLabel(stage),
      count: activeLeadsPeriod.filter(l => l.crm_stage === stage).length,
      color: getStageChartColor(stage),
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
        .reduce((sum, l) => sum + resolveLeadEstimatedValue(l, avgTickets), 0);

      const lostThisMonth = filtered
        .filter(l => l.archived || l.crm_stage === 'closed_lost')
        .filter(l => {
          const dateStr = l.archived ? (l.archived_at || l.updated_at) : (l.lost_at || l.updated_at);
          const d = parseISO(dateStr);
          return d >= mStart && d <= mEnd;
        })
        .reduce((sum, l) => sum + resolveLeadEstimatedValue(l, avgTickets), 0);

      accWon += wonThisMonth;
      return { month: label, wonMonth: wonThisMonth, lostMonth: lostThisMonth, wonAccumulated: accWon };
    });

    // Pipeline by stage (donut)
    const pipelineStages = CRM_FUNNEL_STAGES.filter(s => s !== 'closed');
    const pipelineByStage = pipelineStages.map(stage => {
      const stageLeads = activeLeadsPeriod.filter(l => l.crm_stage === stage);
      return {
        name: getStageLabel(stage),
        value: stageLeads.reduce((sum, l) => sum + resolveLeadEstimatedValue(l, avgTickets), 0),
        count: stageLeads.length,
      };
    }).filter(s => s.count > 0);

    const totalPipeline = pipelineByStage.reduce((s, p) => s + p.value, 0);

    // Top 5 clients by revenue (closed leads in period)
    const closedLeads = periodFiltered.filter(l => l.crm_stage === 'closed' && !l.archived);
    const clientRevenue: Record<string, number> = {};
    closedLeads.forEach(l => {
      const name = l.company_name || 'Sem empresa';
      const val = resolveLeadEstimatedValue(l, avgTickets);
      clientRevenue[name] = (clientRevenue[name] || 0) + val;
    });
    const topClients = Object.entries(clientRevenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Loss reasons — arquivadas OU movidas para "Fechado - Perda" (ambas reaproveitam archive_reason)
    const lostPeriod = periodFiltered.filter(l => l.archived || l.crm_stage === 'closed_lost');
    const reasonCounts: Record<string, number> = {};
    lostPeriod.forEach(l => {
      const reason = l.archive_reason || 'other';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    const lossReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => {
        const label = ARCHIVE_REASONS.find(r => r.value === reason)?.label || reason;
        return { reason: label, count };
      })
      .sort((a, b) => b.count - a.count);

    // Leads by source (origem) — todos os leads criados no período, independente
    // de etapa/arquivamento, com taxa de conversão (ganhos / total daquela origem).
    const sourceGroups: Record<string, { count: number; wonCount: number }> = {};
    periodFiltered.forEach(l => {
      const source = l.source || 'not_informed';
      const g = sourceGroups[source] ?? { count: 0, wonCount: 0 };
      g.count += 1;
      if (l.crm_stage === 'closed' && !l.archived) g.wonCount += 1;
      sourceGroups[source] = g;
    });
    const leadsBySource = Object.entries(sourceGroups)
      .map(([source, g]) => ({
        source,
        label: source === 'not_informed' ? 'Não informado' : (LEAD_SOURCE_LABELS[source] || source),
        count: g.count,
        wonCount: g.wonCount,
        conversionRate: g.count > 0 ? (g.wonCount / g.count) * 100 : 0,
      }))
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
      leadsBySource,
      recentLeads,
      activeLeadsPeriod,
      responsibleOptions,
    };
  }, [leads, archivedLeads, budgets, clients, avgTickets, cancelledBudgetIds, isLoading, dateFrom, dateTo, selectedServiceLine, selectedResponsible]);

  return { data, isLoading };
}
