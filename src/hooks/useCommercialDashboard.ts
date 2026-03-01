import { useMemo } from 'react';
import { useLeads, useArchivedLeads } from '@/hooks/useLeads';
import { useBudgets } from '@/hooks/useBudgets';
import { useClients } from '@/hooks/useClients';
import { LeadWithBudget, CRM_LEAD_COLUMNS, ARCHIVE_REASONS } from '@/types/lead';
import { differenceInDays, parseISO, getMonth, getYear } from 'date-fns';

interface CommercialDashboardData {
  // KPIs
  conversionRate: number;
  avgTicket: number;
  avgSalesCycleDays: number;
  activePipeline: number;
  newLeadsThisYear: number;

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
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const STAGE_COLORS: Record<string, string> = {
  screening: 'hsl(var(--chart-1))',
  qualification: 'hsl(var(--chart-5))',
  proposal: 'hsl(var(--chart-3))',
  negotiation: 'hsl(var(--chart-4))',
  closed: 'hsl(var(--success))',
};

export function useCommercialDashboard(selectedYear: number, selectedServiceLine: string) {
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: archivedLeads = [], isLoading: archivedLoading } = useArchivedLeads();
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets();
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  const isLoading = leadsLoading || archivedLoading || budgetsLoading || clientsLoading;

  const data = useMemo<CommercialDashboardData | null>(() => {
    if (isLoading) return null;

    const allLeads = [...leads, ...archivedLeads] as LeadWithBudget[];

    // Filter by service line
    const filtered = selectedServiceLine === 'all'
      ? allLeads
      : allLeads.filter(l => l.service_line === selectedServiceLine);

    // Filter by year (created_at)
    const yearFiltered = filtered.filter(l => getYear(parseISO(l.created_at)) === selectedYear);

    // Active leads (not archived) in this year
    const activeLeadsYear = yearFiltered.filter(l => !l.archived);
    // Closed leads in this year
    const closedLeads = yearFiltered.filter(l => l.crm_stage === 'closed' && !l.archived);
    // Archived leads in this year
    const archivedYear = yearFiltered.filter(l => l.archived);

    // KPI 1: Conversion rate
    const totalLeadsYear = yearFiltered.length;
    const conversionRate = totalLeadsYear > 0 ? (closedLeads.length / totalLeadsYear) * 100 : 0;

    // KPI 2: Average ticket
    const closedValues = closedLeads.map(l => {
      if (l.budget?.final_total && l.budget.final_total > 0) return l.budget.final_total;
      return l.estimated_value;
    });
    const avgTicket = closedValues.length > 0 ? closedValues.reduce((a, b) => a + b, 0) / closedValues.length : 0;

    // KPI 3: Average sales cycle
    const cyclesInDays = closedLeads
      .filter(l => l.closed_at)
      .map(l => differenceInDays(parseISO(l.closed_at!), parseISO(l.created_at)));
    const avgSalesCycleDays = cyclesInDays.length > 0 ? cyclesInDays.reduce((a, b) => a + b, 0) / cyclesInDays.length : 0;

    // KPI 4: Active pipeline (proposal + negotiation)
    const pipelineLeads = activeLeadsYear.filter(l => l.crm_stage === 'proposal' || l.crm_stage === 'negotiation');
    const activePipeline = pipelineLeads.reduce((sum, l) => sum + l.estimated_value, 0);

    // KPI 5: New leads in the selected year
    const newLeadsThisYear = yearFiltered.length;

    // Funnel data
    const funnelData = CRM_LEAD_COLUMNS.map(col => ({
      stage: col.id,
      label: col.label,
      count: activeLeadsYear.filter(l => l.crm_stage === col.id).length,
      color: STAGE_COLORS[col.id] || 'hsl(var(--muted))',
    }));

    // Revenue by month with accumulated
    let accWon = 0;
    const revenueByMonthData = MONTH_LABELS.map((label, monthIdx) => {
      const wonThisMonth = filtered
        .filter(l => l.crm_stage === 'closed' && !l.archived)
        .filter(l => {
          const dateStr = l.closed_at || l.updated_at;
          const d = parseISO(dateStr);
          return getYear(d) === selectedYear && getMonth(d) === monthIdx;
        })
        .reduce((sum, l) => sum + (l.budget?.final_total || l.estimated_value), 0);

      const lostThisMonth = filtered
        .filter(l => l.archived)
        .filter(l => {
          const dateStr = l.archived_at || l.updated_at;
          const d = parseISO(dateStr);
          return getYear(d) === selectedYear && getMonth(d) === monthIdx;
        })
        .reduce((sum, l) => sum + (l.budget?.final_total || l.estimated_value), 0);

      accWon += wonThisMonth;
      return { month: label, wonMonth: wonThisMonth, lostMonth: lostThisMonth, wonAccumulated: accWon };
    });

    // Pipeline by stage (donut)
    const pipelineStages = ['screening', 'qualification', 'proposal', 'negotiation'] as const;
    const pipelineByStage = pipelineStages.map(stage => {
      const stageLeads = activeLeadsYear.filter(l => l.crm_stage === stage);
      const col = CRM_LEAD_COLUMNS.find(c => c.id === stage);
      return {
        name: col?.label || stage,
        value: stageLeads.reduce((sum, l) => sum + l.estimated_value, 0),
        count: stageLeads.length,
      };
    }).filter(s => s.value > 0);

    const totalPipeline = pipelineByStage.reduce((s, p) => s + p.value, 0);

    // Top 5 clients by revenue (closed leads)
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
    archivedYear.forEach(l => {
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
      conversionRate,
      avgTicket,
      avgSalesCycleDays,
      activePipeline,
      newLeadsThisYear: newLeadsThisYear,
      funnelData,
      revenueByMonth: revenueByMonthData,
      pipelineByStage,
      totalPipeline,
      topClients,
      lossReasons,
      recentLeads,
    };
  }, [leads, archivedLeads, budgets, clients, isLoading, selectedYear, selectedServiceLine]);

  return { data, isLoading };
}
