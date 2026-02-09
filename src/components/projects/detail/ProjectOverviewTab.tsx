import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Wallet,
  Target,
  PiggyBank,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  DollarSign,
  Users,
  Clock,
  Milestone,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';
import { ProjectTeamSection } from './ProjectTeamSection';
import { useProjectOKRs } from '@/hooks/useProjectOKRs';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectSupplierMonths } from '@/hooks/useProjectSupplierMonths';
import { useTimesheetsByMembers } from '@/hooks/useProjectTimesheets';
import { useProjectSupplierActuals } from '@/hooks/useProjectSupplierActuals';
import { OKR_STATUS_LABELS, CONFIDENCE_LEVEL_LABELS, CONFIDENCE_LEVEL_COLORS } from '@/types/projectOkr';
import { MILESTONE_STATUS_LABELS } from '@/types/projectMilestone';

interface ProjectOverviewTabProps {
  project: ProjectWithRelations;
}

type HealthStatus = 'green' | 'yellow' | 'red' | 'gray';

function HealthIcon({ status, size = 'sm' }: { status: HealthStatus; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
  switch (status) {
    case 'green':
      return <CheckCircle2 className={`${sizeClass} text-green-500`} />;
    case 'yellow':
      return <AlertTriangle className={`${sizeClass} text-amber-500`} />;
    case 'red':
      return <XCircle className={`${sizeClass} text-red-500`} />;
    default:
      return <Minus className={`${sizeClass} text-muted-foreground`} />;
  }
}

function HealthBadge({ status, label }: { status: HealthStatus; label: string }) {
  const colorMap: Record<HealthStatus, string> = {
    green: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    yellow: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    gray: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorMap[status]}`}>
      <HealthIcon status={status} />
      {label}
    </span>
  );
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  // Fetch additional data
  const { data: okrs = [] } = useProjectOKRs(project.id);
  const { data: milestones = [] } = useProjectMilestones(project.id);

  const memberIds = useMemo(
    () => (project.members || []).map((m) => m.id),
    [project.members]
  );
  const supplierIds = useMemo(
    () => (project.suppliers || []).map((s) => s.id),
    [project.suppliers]
  );

  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  const { data: timesheets = [] } = useTimesheetsByMembers(memberIds);
  const { data: supplierMonths = [] } = useProjectSupplierMonths(supplierIds);
  const { data: supplierActuals = [] } = useProjectSupplierActuals(supplierIds);

  // === Financial KPIs ===
  const metrics = useMemo(() => {
    const laborCost = (project.members || []).reduce((acc, member) => {
      const employee = member.employee;
      if (!employee) return acc;
      const totalCost = employee.total_monthly_cost_estimated || 0;
      const workHours = employee.jornada_mensal || 168;
      const hourlyCost = workHours > 0 ? totalCost / workHours : 0;
      return acc + hourlyCost * Number(member.hours_per_month || 0);
    }, 0);

    const supplierCost = (project.suppliers || []).reduce((acc, supplier) => {
      const months = supplier.end_month
        ? supplier.end_month - supplier.start_month + 1
        : 12;
      return acc + Number(supplier.monthly_value || 0) * months;
    }, 0);

    const materialCost = (project.materials || []).reduce(
      (acc, material) => acc + Number(material.value || 0),
      0
    );

    const plannedCost = laborCost + supplierCost + materialCost;
    const contractValue = Number(project.total_value || 0);
    const margin =
      contractValue > 0 ? ((contractValue - plannedCost) / contractValue) * 100 : 0;

    const receivedValue = (project.installments || [])
      .filter((i) => i.status === 'received')
      .reduce((sum, i) => sum + Number(i.value), 0);

    const pendingValue = contractValue - receivedValue;

    // Revenue variation
    const revenueVar = contractValue > 0 ? ((receivedValue - contractValue) / contractValue) * 100 : 0;

    return { contractValue, plannedCost, margin, receivedValue, pendingValue, laborCost, supplierCost, materialCost, revenueVar };
  }, [project]);

  // === Cost actuals ===
  const costData = useMemo(() => {
    // Labor planned (sum of member months hours * hourly cost)
    const laborPlanned = (project.members || []).reduce((acc, member) => {
      const employee = member.employee;
      if (!employee) return acc;
      const totalCost = employee.total_monthly_cost_estimated || 0;
      const workHours = employee.jornada_mensal || 168;
      const hourlyCost = workHours > 0 ? totalCost / workHours : 0;
      const memberHoursPlanned = memberMonths
        .filter((mm) => mm.project_member_id === member.id)
        .reduce((s, mm) => s + mm.hours, 0);
      // If no monthly breakdown, use hours_per_month * duration
      const totalHours = memberHoursPlanned > 0 ? memberHoursPlanned : Number(member.hours_per_month || 0) * project.duration_months;
      return acc + hourlyCost * totalHours;
    }, 0);

    // Labor actual (timesheets hours * hourly cost)
    const laborActual = (project.members || []).reduce((acc, member) => {
      const employee = member.employee;
      if (!employee) return acc;
      const totalCost = employee.total_monthly_cost_estimated || 0;
      const workHours = employee.jornada_mensal || 168;
      const hourlyCost = workHours > 0 ? totalCost / workHours : 0;
      const actualHours = timesheets
        .filter((t) => t.project_member_id === member.id)
        .reduce((s, t) => s + t.hours, 0);
      return acc + hourlyCost * actualHours;
    }, 0);

    // Supplier planned
    const supplierPlanned = supplierMonths.reduce((s, sm) => s + sm.value, 0) ||
      (project.suppliers || []).reduce((acc, sup) => {
        const months = sup.end_month ? sup.end_month - sup.start_month + 1 : project.duration_months;
        return acc + Number(sup.monthly_value || 0) * months;
      }, 0);

    // Supplier actual
    const supplierActualTotal = supplierActuals.reduce((s, sa) => s + sa.value, 0);

    // Material planned vs realized
    const materialPlanned = (project.materials || []).reduce((s, m) => s + Number(m.value || 0), 0);
    const materialActual = (project.materials || [])
      .filter((m) => m.is_realized)
      .reduce((s, m) => s + Number(m.value || 0), 0);

    const totalPlanned = laborPlanned + supplierPlanned + materialPlanned;
    const totalActual = laborActual + supplierActualTotal + materialActual;

    return {
      laborPlanned, laborActual,
      supplierPlanned, supplierActualTotal,
      materialPlanned, materialActual,
      totalPlanned, totalActual,
    };
  }, [project, memberMonths, timesheets, supplierMonths, supplierActuals]);

  // === Health calculations ===
  const health = useMemo(() => {
    // OKRs
    let okrHealth: HealthStatus = 'gray';
    if (okrs.length > 0) {
      const avgProgress = okrs.reduce((sum, o) => sum + (o.progress_percent || 0), 0) / okrs.length;
      okrHealth = avgProgress >= 70 ? 'green' : avgProgress >= 40 ? 'yellow' : 'red';
    }

    // Schedule
    let scheduleHealth: HealthStatus = 'gray';
    if (milestones.length > 0) {
      const delayedCount = milestones.filter((m) => m.status === 'delayed').length;
      scheduleHealth = delayedCount === 0 ? 'green' : delayedCount === 1 ? 'yellow' : 'red';
    }

    // Costs
    let costHealth: HealthStatus = 'gray';
    if (costData.totalPlanned > 0 && costData.totalActual > 0) {
      const costRatio = costData.totalActual / costData.totalPlanned;
      costHealth = costRatio <= 1.0 ? 'green' : costRatio <= 1.1 ? 'yellow' : 'red';
    }

    // Financial
    const overdueCount = (project.installments || []).filter((i) => i.status === 'overdue').length;
    let finHealth: HealthStatus = 'gray';
    if ((project.installments || []).length > 0) {
      finHealth = overdueCount === 0 ? 'green' : overdueCount === 1 ? 'yellow' : 'red';
    }

    // Overall
    const statuses = [okrHealth, scheduleHealth, costHealth, finHealth].filter((s) => s !== 'gray');
    let overall: HealthStatus = 'gray';
    if (statuses.length > 0) {
      if (statuses.some((s) => s === 'red')) overall = 'red';
      else if (statuses.some((s) => s === 'yellow')) overall = 'yellow';
      else overall = 'green';
    }

    return { okrHealth, scheduleHealth, costHealth, finHealth, overall };
  }, [okrs, milestones, costData, project.installments]);

  // === Schedule summary ===
  const scheduleSummary = useMemo(() => {
    const completed = milestones.filter((m) => m.status === 'completed').length;
    const delayed = milestones.filter((m) => m.status === 'delayed');
    const nextPending = milestones.find((m) => m.status === 'pending' || m.status === 'in_progress');
    return { total: milestones.length, completed, delayed, nextPending };
  }, [milestones]);

  // === OKR summary ===
  const okrSummary = useMemo(() => {
    const avgProgress = okrs.length > 0
      ? okrs.reduce((sum, o) => sum + (o.progress_percent || 0), 0) / okrs.length
      : 0;

    // Dominant confidence from all key results
    const allKRs = okrs.flatMap((o) => o.key_results || []);
    const confidenceCounts: Record<string, number> = {};
    allKRs.forEach((kr) => {
      const level = kr.confidence_level || 'medium';
      confidenceCounts[level] = (confidenceCounts[level] || 0) + 1;
    });
    const dominantConfidence = Object.entries(confidenceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'medium';

    return { avgProgress, dominantConfidence, top: okrs.slice(0, 5) };
  }, [okrs]);

  // === Financial summary ===
  const financialSummary = useMemo(() => {
    const installments = project.installments || [];
    const overdue = installments.filter((i) => i.status === 'overdue');
    const overdueValue = overdue.reduce((s, i) => s + Number(i.value), 0);
    const nextPending = installments.find((i) => i.status === 'pending' || i.status === 'invoiced');
    const revenueProgress = metrics.contractValue > 0 ? (metrics.receivedValue / metrics.contractValue) * 100 : 0;
    return { overdue, overdueValue, nextPending, revenueProgress };
  }, [project.installments, metrics]);

  // === KPI comparativos ===
  const kpiData = useMemo(() => {
    const revenuePlanned = metrics.contractValue;
    const revenueActual = metrics.receivedValue;
    const revenueVar = revenuePlanned > 0 ? ((revenueActual - revenuePlanned) / revenuePlanned) * 100 : 0;

    const costPlanned = costData.totalPlanned;
    const costActual = costData.totalActual;
    const costVar = costPlanned > 0 ? ((costActual - costPlanned) / costPlanned) * 100 : 0;

    const marginPlanned = revenuePlanned > 0 ? ((revenuePlanned - costPlanned) / revenuePlanned) * 100 : 0;
    const marginActualBase = revenueActual > 0 ? revenueActual : revenuePlanned;
    const marginActual = marginActualBase > 0 ? ((marginActualBase - costActual) / marginActualBase) * 100 : 0;
    const marginVar = marginActual - marginPlanned; // em pp

    return { revenuePlanned, revenueActual, revenueVar, costPlanned, costActual, costVar, marginPlanned, marginActual, marginVar };
  }, [metrics, costData]);

  const marginTrend = metrics.margin >= 30 ? 'up' : metrics.margin >= 15 ? 'neutral' : 'down';

  const healthLabels: Record<HealthStatus, string> = {
    green: 'Saudável',
    yellow: 'Atenção',
    red: 'Crítico',
    gray: 'Sem dados',
  };

  return (
    <div className="space-y-4">
      {/* Row 1: KPI Cards - Planejado vs Realizado */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {/* Receita */}
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Receita</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <p className="text-xl font-bold">{formatCurrency(kpiData.revenueActual)}</p>
                <span className="text-xs text-muted-foreground">Realizado</span>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">{formatCurrency(kpiData.revenuePlanned)}</p>
                <span className="text-xs text-muted-foreground">Planejado</span>
              </div>
              <div className="pt-1">
                <span className={`text-xs font-semibold ${kpiData.revenueVar >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {kpiData.revenueVar >= 0 ? '+' : ''}{kpiData.revenueVar.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">variação</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custos */}
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Custos</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <p className="text-xl font-bold">{formatCurrency(kpiData.costActual)}</p>
                <span className="text-xs text-muted-foreground">Realizado</span>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">{formatCurrency(kpiData.costPlanned)}</p>
                <span className="text-xs text-muted-foreground">Planejado</span>
              </div>
              <div className="pt-1">
                <span className={`text-xs font-semibold ${kpiData.costVar <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {kpiData.costVar >= 0 ? '+' : ''}{kpiData.costVar.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">variação</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Margem */}
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                kpiData.marginActual >= 30 ? 'bg-green-100 dark:bg-green-900/30' :
                kpiData.marginActual >= 15 ? 'bg-muted' : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {kpiData.marginActual >= 30 ? (
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : kpiData.marginActual < 15 ? (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Margem</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <p className={`text-xl font-bold ${
                  kpiData.marginActual >= 30 ? 'text-green-600 dark:text-green-400' :
                  kpiData.marginActual < 15 ? 'text-red-600 dark:text-red-400' : ''
                }`}>
                  {formatPercent(kpiData.marginActual)}
                </p>
                <span className="text-xs text-muted-foreground">Realizado</span>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">{formatPercent(kpiData.marginPlanned)}</p>
                <span className="text-xs text-muted-foreground">Planejado</span>
              </div>
              <div className="pt-1">
                <span className={`text-xs font-semibold ${kpiData.marginVar >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {kpiData.marginVar >= 0 ? '+' : ''}{kpiData.marginVar.toFixed(1)}pp
                </span>
                <span className="text-xs text-muted-foreground ml-1">variação</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Health + OKRs */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Project Health */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Saúde do Projeto</CardTitle>
              <HealthBadge status={health.overall} label={healthLabels[health.overall]} />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <HealthIcon status={health.okrHealth} />
                <div>
                  <p className="text-xs text-muted-foreground">OKRs</p>
                  <p className="text-xs font-medium">
                    {okrs.length > 0 ? `${formatPercent(okrSummary.avgProgress, 0)} progresso` : 'Sem OKRs'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <HealthIcon status={health.scheduleHealth} />
                <div>
                  <p className="text-xs text-muted-foreground">Cronograma</p>
                  <p className="text-xs font-medium">
                    {milestones.length > 0
                      ? `${scheduleSummary.completed}/${scheduleSummary.total} concluídos`
                      : 'Sem marcos'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <HealthIcon status={health.costHealth} />
                <div>
                  <p className="text-xs text-muted-foreground">Custos</p>
                  <p className="text-xs font-medium">
                    {costData.totalPlanned > 0 && costData.totalActual > 0
                      ? `${formatPercent((costData.totalActual / costData.totalPlanned) * 100, 0)} do planejado`
                      : 'Sem dados'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <HealthIcon status={health.finHealth} />
                <div>
                  <p className="text-xs text-muted-foreground">Financeiro</p>
                  <p className="text-xs font-medium">
                    {(project.installments || []).length > 0
                      ? financialSummary.overdue.length > 0
                        ? `${financialSummary.overdue.length} atrasada(s)`
                        : 'Em dia'
                      : 'Sem parcelas'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OKRs Summary */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                OKRs
              </CardTitle>
              {okrs.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${CONFIDENCE_LEVEL_COLORS[okrSummary.dominantConfidence as keyof typeof CONFIDENCE_LEVEL_COLORS] || ''}`}>
                  {CONFIDENCE_LEVEL_LABELS[okrSummary.dominantConfidence as keyof typeof CONFIDENCE_LEVEL_LABELS] || okrSummary.dominantConfidence}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {okrs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum OKR cadastrado</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Progresso Médio</span>
                    <span className="text-xs font-semibold">{formatPercent(okrSummary.avgProgress, 0)}</span>
                  </div>
                  <Progress value={okrSummary.avgProgress} className="h-2" />
                </div>
                <div className="space-y-2">
                  {okrSummary.top.map((okr) => (
                    <div key={okr.id} className="flex items-center justify-between gap-2">
                      <p className="text-xs truncate flex-1">{okr.objective}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-medium">{formatPercent(okr.progress_percent || 0, 0)}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {OKR_STATUS_LABELS[okr.status]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Schedule + Costs */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Schedule Summary */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Cronograma
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum marco cadastrado</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Progresso</span>
                    <span className="text-xs font-semibold">
                      {scheduleSummary.completed}/{scheduleSummary.total} concluídos
                    </span>
                  </div>
                  <Progress
                    value={scheduleSummary.total > 0 ? (scheduleSummary.completed / scheduleSummary.total) * 100 : 0}
                    className="h-2"
                  />
                </div>

                {scheduleSummary.delayed.length > 0 && (
                  <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-xs font-medium text-red-700 dark:text-red-400">
                        {scheduleSummary.delayed.length} marco(s) atrasado(s)
                      </span>
                    </div>
                    {scheduleSummary.delayed.slice(0, 2).map((m) => (
                      <p key={m.id} className="text-xs text-red-600 dark:text-red-400 ml-5 truncate">
                        {m.title} — até {formatDate(m.end_date)}
                      </p>
                    ))}
                  </div>
                )}

                {scheduleSummary.nextPending && (
                  <div className="rounded-lg border p-2.5">
                    <p className="text-xs text-muted-foreground mb-0.5">Próximo Marco</p>
                    <p className="text-xs font-medium">{scheduleSummary.nextPending.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(scheduleSummary.nextPending.start_date)} — {formatDate(scheduleSummary.nextPending.end_date)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Costs Summary */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Custos — Planejado vs Realizado
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-2">
              <CostRow label="Mão de Obra" planned={costData.laborPlanned} actual={costData.laborActual} />
              <CostRow label="Fornecedores" planned={costData.supplierPlanned} actual={costData.supplierActualTotal} />
              <CostRow label="Materiais" planned={costData.materialPlanned} actual={costData.materialActual} />
              <div className="border-t pt-2 mt-2">
                <CostRow label="Total" planned={costData.totalPlanned} actual={costData.totalActual} bold />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Financial + Team */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Financial Summary */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Receita Recebida</span>
                  <span className="text-xs font-semibold">
                    {formatCurrency(metrics.receivedValue)} / {formatCurrency(metrics.contractValue)}
                  </span>
                </div>
                <Progress value={financialSummary.revenueProgress} className="h-2" />
              </div>

              {financialSummary.overdue.length > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-xs font-medium text-red-700 dark:text-red-400">
                      {financialSummary.overdue.length} parcela(s) atrasada(s) — {formatCurrency(financialSummary.overdueValue)}
                    </span>
                  </div>
                </div>
              )}

              {financialSummary.nextPending && (
                <div className="rounded-lg border p-2.5">
                  <p className="text-xs text-muted-foreground mb-0.5">Próxima Parcela</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{formatCurrency(Number(financialSummary.nextPending.value))}</p>
                    <p className="text-xs text-muted-foreground">Vence: {formatDate(financialSummary.nextPending.due_date)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team placeholder card that spans to balance the grid */}
        <div /> {/* Empty to push team section to full width below */}
      </div>

      {/* Team Section - Full Width */}
      <ProjectTeamSection members={project.members || []} projectId={project.id} />
    </div>
  );
}

// Helper component for cost rows
function CostRow({
  label,
  planned,
  actual,
  bold = false,
}: {
  label: string;
  planned: number;
  actual: number;
  bold?: boolean;
}) {
  const pct = planned > 0 ? (actual / planned) * 100 : 0;
  const isOver = actual > planned && planned > 0;
  const hasData = actual > 0;

  return (
    <div className={`flex items-center justify-between gap-2 ${bold ? 'font-semibold' : ''}`}>
      <span className={`text-xs ${bold ? 'font-semibold' : 'text-muted-foreground'} w-24 shrink-0`}>{label}</span>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted-foreground w-24 text-right">{formatCurrency(planned)}</span>
        <span className={`w-24 text-right ${isOver ? 'text-red-600 dark:text-red-400' : hasData ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
          {hasData ? formatCurrency(actual) : '—'}
        </span>
        <span className={`w-12 text-right text-[10px] ${isOver ? 'text-red-600 dark:text-red-400' : hasData ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
          {hasData ? formatPercent(pct, 0) : ''}
        </span>
      </div>
    </div>
  );
}
