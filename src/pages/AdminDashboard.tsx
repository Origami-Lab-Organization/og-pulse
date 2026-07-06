import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  startOfYear, endOfYear,
} from 'date-fns';
import {
  DollarSign, Percent, Wallet, TrendingUp, Receipt,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminDashboardFilters, type Granularity } from '@/components/admin-dashboard/AdminDashboardFilters';
import { AdminMetricCard } from '@/components/admin-dashboard/AdminMetricCard';
import { AdminBirthdaysCard } from '@/components/admin-dashboard/AdminBirthdaysCard';
import { AdminOperationalHealthCard } from '@/components/admin-dashboard/AdminOperationalHealthCard';
import { AdminPipelineCard } from '@/components/admin-dashboard/AdminPipelineCard';
import { AdminPayrollEvolutionChart } from '@/components/admin-dashboard/AdminPayrollEvolutionChart';
import { AdminHeadcountFlowCard } from '@/components/admin-dashboard/AdminHeadcountFlowCard';
import { useFinancialEvolution } from '@/hooks/useFinancialEvolution';
import { useTurnoverStats } from '@/hooks/useTurnoverStats';
import { useProjects } from '@/hooks/useProjects';
import { useEmployees } from '@/hooks/useEmployees';
import { useProjectHealthData } from '@/hooks/useProjectHealthData';
import { useCommercialDashboard } from '@/hooks/useCommercialDashboard';
import { calculatePayrollCost, calculateLoadedPersonnelCost } from '@/lib/payrollCalculator';
import { calculateAdminDashboardRevenue } from '@/lib/adminDashboardRevenueCalculator';
import { formatCurrency, formatPercent } from '@/lib/formatters';

export default function AdminDashboard() {
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
  const { data: projects = [] } = useProjects();
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
    // Faturamento total = todos os recebimentos do período.
    const faturamentoTotal = highlighted.reduce((s, m) => s + m.revenueReal, 0);
    // Custos de projeto = fornecedores + materiais (realizados), SEM mão de obra:
    // o pessoal entra só pelo custo cheio de pessoal, para não contar o labor duas
    // vezes (laborCost de timesheet). Comissões não compõem o custo de projeto do
    // dashboard (decisão de negócio). Ver calculateAdminDashboardRevenue.
    const projectCostsExLabor = highlighted.reduce(
      (s, m) => s + m.supplierCost + m.materialCost,
      0,
    );
    return {
      faturamentoTotal,
      projectCostsExLabor,
      monthsInPeriod: highlighted.length,
    };
  }, [financialEvolution, filters]);

  const hasProjects = projects.length > 0;

  // Custo da folha = soma do salário BASE dos funcionários ativos (definição do
  // glossário). Valor MENSAL vigente — exibido no card "Custo da folha".
  const payroll = useMemo(() => calculatePayrollCost(employees), [employees]);

  // Custo CHEIO de pessoal = salário + encargos + provisões + benefícios +
  // ferramentas (total_monthly_cost_estimated). É o que a Receita abate — por
  // isso a Receita fica menor que "Faturamento − folha base".
  const personnel = useMemo(() => calculateLoadedPersonnelCost(employees), [employees]);

  // ── Faturamento, Receita e Margem real (regra de negócio em helper testado) ──
  const faturamentoTotal = financial?.faturamentoTotal ?? 0;
  const hasFaturamento = faturamentoTotal > 0;
  const monthsInPeriod = financial?.monthsInPeriod ?? 1;
  // Custos de projeto realizados (fornecedores + materiais + comissões).
  const projectCosts = financial?.projectCostsExLabor ?? 0;
  const revenue = useMemo(
    () =>
      calculateAdminDashboardRevenue({
        faturamentoTotal,
        projectCostsExLabor: financial?.projectCostsExLabor ?? 0,
        personnelCostMonthly: personnel.totalMonthlyCost,
        monthsInPeriod,
      }),
    [faturamentoTotal, financial?.projectCostsExLabor, personnel.totalMonthlyCost, monthsInPeriod],
  );

  // Folha base do período = folha mensal × meses (para o card "Custo da folha").
  const payrollForPeriod = payroll.totalMonthlyCost * monthsInPeriod;

  return (
    <AppLayout
      title="Dashboard Executivo"
      description="A saúde financeira, operacional e de pessoas da empresa em um só lugar"
      breadcrumbs={[{ label: 'Dashboard' }]}
    >
      <div className="space-y-6">
        {/* Filtro de período GLOBAL */}
        <AdminDashboardFilters
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

        {/* ── Linha 1: Faturamento total + Custo da folha ──────────────────── */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <AdminMetricCard
            label="Faturamento total"
            icon={DollarSign}
            accentColor="bg-emerald-500"
            valueColor="text-emerald-600 dark:text-emerald-400"
            loading={isFinancialLoading}
            empty={!hasFaturamento}
            emptyMessage={
              hasProjects
                ? 'Sem recebimentos no período selecionado.'
                : 'Cadastre projetos para acompanhar o faturamento.'
            }
            value={formatCurrency(faturamentoTotal)}
            subtitle="Todos os recebimentos da empresa no período"
          />
          <AdminMetricCard
            label="Custo da folha"
            icon={Wallet}
            accentColor="bg-rose-500"
            valueColor="text-rose-600 dark:text-rose-400"
            loading={isEmployeesLoading}
            empty={payroll.headcount === 0 || payroll.totalMonthlyCost === 0}
            emptyMessage="Cadastre funcionários (com custo) para ver o custo da folha."
            value={formatCurrency(payrollForPeriod)}
            subtitle={
              monthsInPeriod > 1
                ? `${payroll.headcount} ativo(s) · ${formatCurrency(payroll.totalMonthlyCost)}/mês × ${monthsInPeriod} meses`
                : `Soma dos salários base · ${payroll.headcount} ativo(s)`
            }
          />
        </div>

        {/* ── Linha 2: Receita + Custo total + Margem real ─────────────────── */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <AdminMetricCard
            label="Receita"
            icon={TrendingUp}
            accentColor="bg-sky-500"
            valueColor={
              revenue.receita >= 0
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-rose-600 dark:text-rose-400'
            }
            loading={isFinancialLoading || isEmployeesLoading}
            empty={!hasFaturamento}
            emptyMessage={
              hasProjects
                ? 'Sem recebimentos no período para calcular a receita.'
                : 'Cadastre projetos para calcular a receita.'
            }
            value={formatCurrency(revenue.receita)}
            subtitle="Faturamento − todos os custos do período"
          />
          <AdminMetricCard
            label="Custo total"
            icon={Receipt}
            accentColor="bg-rose-500"
            valueColor="text-rose-600 dark:text-rose-400"
            loading={isFinancialLoading || isEmployeesLoading}
            empty={revenue.totalCosts === 0}
            emptyMessage="Sem custos de pessoal ou de projeto no período."
            value={formatCurrency(revenue.totalCosts)}
            subtitle={`Pessoal ${formatCurrency(revenue.personnelCostForPeriod)} · fornecedores/materiais ${formatCurrency(projectCosts)}`}
          />
          <AdminMetricCard
            label="Margem real"
            icon={Percent}
            accentColor="bg-violet-500"
            valueColor={
              (revenue.margemReal ?? 0) >= 0
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-rose-600 dark:text-rose-400'
            }
            loading={isFinancialLoading || isEmployeesLoading}
            empty={revenue.margemReal == null}
            emptyMessage={
              hasProjects
                ? 'Sem faturamento no período para calcular a margem.'
                : 'Cadastre projetos para ver a margem real.'
            }
            value={formatPercent(revenue.margemReal ?? 0)}
            subtitle="Receita ÷ faturamento total"
          />
        </div>

        {/* ── Linha 3: cards maiores — Saúde Operacional + Aniversariantes ──── */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-1">
          <AdminOperationalHealthCard rows={healthRows} loading={isHealthLoading} />
          {/*<AdminHeadcountFlowCard data={turnover} loading={isTurnoverLoading} />*/}
        </div>

        {/* ── Linha 4: cards maiores — Pipeline + Evolução da Folha ────────── */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <AdminBirthdaysCard
            employees={employees}
            startDate={filters.startDate}
            endDate={filters.endDate}
            loading={isEmployeesLoading}
          />
          <AdminPayrollEvolutionChart
            employees={employees}
            loading={isEmployeesLoading}
          />
        </div>

        {/* ── Linha 5: Fluxo de pessoal — admissões vs. desligamentos ──────── */}
        <div>
          <AdminPipelineCard
            activePipeline={commercial?.activePipeline ?? 0}
            avgSalesCycleDays={commercial?.avgSalesCycleDays ?? null}
            pipelineLeadsWithBudgetCount={commercial?.pipelineLeadsWithBudgetCount ?? 0}
            pipelineByStage={commercial?.pipelineByStage ?? []}
            loading={isCommercialLoading}
          />
        </div>



      </div>
    </AppLayout>
  );
}
