import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  startOfYear, endOfYear,
} from 'date-fns';
import {
  DollarSign, Percent, UserCircle, FolderKanban,
  Wallet, CalendarRange, PiggyBank, UserMinus,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardFilters, type Granularity } from '@/components/dashboard/DashboardFilters';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { BirthdaysCard } from '@/components/dashboard/BirthdaysCard';
import { OperationalHealthCard } from '@/components/dashboard/OperationalHealthCard';
import { PipelineCard } from '@/components/dashboard/PipelineCard';
import { PayrollEvolutionChart } from '@/components/dashboard/PayrollEvolutionChart';
import { HeadcountFlowCard } from '@/components/dashboard/HeadcountFlowCard';
import { useFinancialEvolution } from '@/hooks/useFinancialEvolution';
import { useTurnoverStats } from '@/hooks/useTurnoverStats';
import { useProjects } from '@/hooks/useProjects';
import { useEmployees } from '@/hooks/useEmployees';
import { useProjectHealthData } from '@/hooks/useProjectHealthData';
import { useCommercialDashboard } from '@/hooks/useCommercialDashboard';
import { calculatePayrollCost } from '@/lib/payrollCalculator';
import { formatCurrency, formatPercent } from '@/lib/formatters';

export default function Dashboard() {
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [currentPeriodDate, setCurrentPeriodDate] = useState(() => new Date());
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  // ── Filtro de período GLOBAL — alimenta TODOS os blocos (Cenário 3) ──────────
  const filters = useMemo(() => {
    let startDate: Date;
    let endDate: Date;
    switch (granularity) {
      case 'quarter':
        startDate = startOfQuarter(currentPeriodDate);
        endDate = endOfQuarter(currentPeriodDate);
        break;
      case 'year':
        startDate = startOfYear(currentPeriodDate);
        endDate = endOfYear(currentPeriodDate);
        break;
      case 'custom':
        startDate = customStart || startOfMonth(new Date());
        endDate = customEnd || endOfMonth(new Date());
        break;
      default:
        startDate = startOfMonth(currentPeriodDate);
        endDate = endOfMonth(currentPeriodDate);
    }
    return { startDate, endDate };
  }, [granularity, currentPeriodDate, customStart, customEnd]);

  // ── Dados (todos filtram tenant_id internamente via useAuth) ─────────────────
  const { data: financialEvolution, isLoading: isFinancialLoading } =
    useFinancialEvolution(filters, { enabled: true });
  const { data: projects = [], isLoading: isProjectsLoading } = useProjects();
  const { data: employees = [], isLoading: isEmployeesLoading } = useEmployees();
  const { data: healthRows = [], isLoading: isHealthLoading } =
    useProjectHealthData(filters, { enabled: true });
  const { data: commercial, isLoading: isCommercialLoading } =
    useCommercialDashboard(filters.startDate, filters.endDate, 'all', 'all');
  const { data: turnover, isLoading: isTurnoverLoading } = useTurnoverStats(filters);

  // ── KPIs financeiros: agrega os meses dentro do período selecionado ──────────
  const financial = useMemo(() => {
    if (!financialEvolution) return null;
    const { startDate, endDate } = filters;
    const highlighted = financialEvolution.months.filter((m) => {
      const monthStart = startOfMonth(new Date(financialEvolution.year, m.monthIndex, 1));
      const monthEnd = endOfMonth(monthStart);
      return monthStart <= endDate && monthEnd >= startDate;
    });
    const revenueActual = highlighted.reduce((s, m) => s + m.revenueReal, 0);
    const totalCosts = highlighted.reduce((s, m) => s + m.totalCosts, 0);
    const grossMargin = revenueActual > 0
      ? ((revenueActual - totalCosts) / revenueActual) * 100
      : null;
    return {
      revenueActual,
      totalCosts,
      grossMargin,
      grossMarginTarget: financialEvolution.grossMarginTarget,
    };
  }, [financialEvolution, filters]);

  const hasProjects = projects.length > 0;
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active'),
    [projects],
  );
  const headcount = useMemo(
    () => employees.filter((e) => e.status === 'ativo').length,
    [employees],
  );

  // Custo de folha = soma do custo mensal dos funcionários ativos.
  // É um valor MENSAL vigente (snapshot atual), não agregado pelo período.
  const payroll = useMemo(() => calculatePayrollCost(employees), [employees]);

  const revenueActual = financial?.revenueActual ?? 0;
  const hasRevenue = revenueActual > 0;
  const revenuePerPerson = hasRevenue && headcount > 0 ? revenueActual / headcount : null;

  return (
    <AppLayout
      title="Dashboard Executivo"
      description="A saúde financeira, operacional e de pessoas da empresa em um só lugar"
      breadcrumbs={[{ label: 'Dashboard' }]}
    >
      <div className="space-y-6">
        {/* Filtro de período GLOBAL */}
        <DashboardFilters
          granularity={granularity}
          onGranularityChange={(g) => {
            setGranularity(g);
            setCurrentPeriodDate(new Date());
          }}
          currentPeriodDate={currentPeriodDate}
          onPeriodDateChange={setCurrentPeriodDate}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />

        {/* ── Linha 1: 3 KPIs ──────────────────────────────────────────────── */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <MetricCard
            label="Receita da empresa"
            icon={DollarSign}
            accentColor="bg-emerald-500"
            valueColor="text-emerald-600 dark:text-emerald-400"
            loading={isFinancialLoading}
            empty={!hasRevenue}
            emptyMessage={
              hasProjects
                ? 'Sem receita recebida no período selecionado.'
                : 'Cadastre projetos para acompanhar a receita.'
            }
            value={formatCurrency(revenueActual)}
            subtitle="Receita recebida no período"
          />
          <MetricCard
            label="Margem"
            icon={Percent}
            accentColor="bg-sky-500"
            loading={isFinancialLoading}
            empty={financial?.grossMargin == null}
            emptyMessage={
              hasProjects
                ? 'Sem receita no período para calcular a margem.'
                : 'Cadastre projetos para ver a margem.'
            }
            value={formatPercent(financial?.grossMargin ?? 0)}
            subtitle={
              financial?.grossMarginTarget != null
                ? `Meta: ${formatPercent(financial.grossMarginTarget)}`
                : 'Margem bruta no período'
            }
          />
          <MetricCard
            label="Receita por pessoa"
            icon={UserCircle}
            accentColor="bg-violet-500"
            loading={isFinancialLoading || isEmployeesLoading}
            empty={revenuePerPerson == null}
            emptyMessage={
              headcount === 0
                ? 'Cadastre funcionários para calcular a receita por pessoa.'
                : 'Sem receita no período para calcular.'
            }
            value={revenuePerPerson != null ? formatCurrency(revenuePerPerson) : ''}
            subtitle={`Receita ÷ ${headcount} pessoa(s) ativa(s)`}
          />
        </div>

        {/* ── Linha 2: 3 KPIs ──────────────────────────────────────────────── */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <MetricCard
            label="Projetos ativos"
            icon={FolderKanban}
            accentColor="bg-amber-500"
            loading={isProjectsLoading}
            empty={activeProjects.length === 0}
            emptyMessage={
              hasProjects
                ? 'Nenhum projeto ativo no momento.'
                : 'Cadastre projetos para começar.'
            }
            value={String(activeProjects.length)}
            subtitle={hasProjects ? `de ${projects.length} projeto(s)` : undefined}
          />
          <MetricCard
            label="Custo de folha"
            icon={Wallet}
            accentColor="bg-rose-500"
            valueColor="text-rose-600 dark:text-rose-400"
            loading={isEmployeesLoading}
            empty={payroll.headcount === 0 || payroll.totalMonthlyCost === 0}
            emptyMessage="Cadastre funcionários (com custo) para ver o custo de folha."
            value={formatCurrency(payroll.totalMonthlyCost)}
            subtitle={`Soma dos salários base · ${payroll.headcount} ativo(s)`}
          />
          <MetricCard
            label="Turnover"
            icon={UserMinus}
            accentColor="bg-rose-500"
            valueColor="text-rose-600 dark:text-rose-400"
            loading={isTurnoverLoading}
            empty={!turnover || turnover.turnoverRate == null}
            emptyMessage="Sem quadro de pessoal suficiente no período para calcular a rotatividade."
            value={turnover?.turnoverRate != null ? formatPercent(turnover.turnoverRate) : ''}
            subtitle={
              turnover?.turnoverRate != null
                ? `Headcount médio: ${turnover.avgHeadcount.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} · SHRM`
                : undefined
            }
          />
        </div>

        {/* ── Linha 3: cards maiores — Saúde Operacional + Aniversariantes ──── */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <OperationalHealthCard rows={healthRows} loading={isHealthLoading} />
          <PipelineCard
            activePipeline={commercial?.activePipeline ?? 0}
            avgSalesCycleDays={commercial?.avgSalesCycleDays ?? null}
            pipelineLeadsWithBudgetCount={commercial?.pipelineLeadsWithBudgetCount ?? 0}
            pipelineByStage={commercial?.pipelineByStage ?? []}
            loading={isCommercialLoading}
          />
        </div>

        {/* ── Linha 4: cards maiores — Pipeline + Evolução da Folha ────────── */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <BirthdaysCard
            employees={employees}
            startDate={filters.startDate}
            endDate={filters.endDate}
            loading={isEmployeesLoading}
          />
          <PayrollEvolutionChart
            employees={employees}
            loading={isEmployeesLoading}
          />
        </div>

        {/* ── Linha 5: Fluxo de pessoal — admissões vs. desligamentos ──────── */}
        <HeadcountFlowCard data={turnover} loading={isTurnoverLoading} />

        {/* ── Blocos que dependem de módulos ainda incompletos — "em breve" ──── */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Próximos blocos (dependem de módulos em desenvolvimento)
          </h2>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Alocação por mês"
              icon={CalendarRange}
              comingSoon
              subtitle="Produção vs. administrativo (volume e R$)."
            />
            <MetricCard
              label="Cálculo de provisão"
              icon={PiggyBank}
              comingSoon
              subtitle="Aguardando definição da regra e histórico."
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
