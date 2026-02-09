import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Wallet, Target, PiggyBank, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { ProjectCostBreakdownChart } from './ProjectCostBreakdownChart';
import { ProjectPaymentsChart } from './ProjectPaymentsChart';
import { ProjectTeamSection } from './ProjectTeamSection';
import { ProjectTrendChart } from './ProjectTrendChart';

interface ProjectOverviewTabProps {
  project: ProjectWithRelations;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  // Calculate financial metrics
  const metrics = useMemo(() => {
    // Labor cost using real employee cost
    const laborCost = (project.members || []).reduce((acc, member) => {
      const employee = member.employee;
      if (!employee) return acc;
      const totalCost = employee.total_monthly_cost_estimated || 0;
      const workHours = employee.jornada_mensal || 168;
      const hourlyCost = workHours > 0 ? totalCost / workHours : 0;
      return acc + hourlyCost * Number(member.hours_per_month || 0);
    }, 0);

    // Supplier cost
    const supplierCost = (project.suppliers || []).reduce((acc, supplier) => {
      const months = supplier.end_month 
        ? supplier.end_month - supplier.start_month + 1 
        : 12;
      return acc + Number(supplier.monthly_value || 0) * months;
    }, 0);

    // Materials cost
    const materialCost = (project.materials || []).reduce(
      (acc, material) => acc + Number(material.value || 0),
      0
    );

    const plannedCost = laborCost + supplierCost + materialCost;
    const contractValue = Number(project.total_value || 0);
    const margin = contractValue > 0 ? ((contractValue - plannedCost) / contractValue) * 100 : 0;

    const receivedValue = (project.installments || [])
      .filter((i) => i.status === 'received')
      .reduce((sum, i) => sum + Number(i.value), 0);

    const pendingValue = contractValue - receivedValue;

    return {
      contractValue,
      plannedCost,
      margin,
      receivedValue,
      pendingValue,
    };
  }, [project]);

  const marginTrend = metrics.margin >= 30 ? 'up' : metrics.margin >= 15 ? 'neutral' : 'down';

  return (
    <div className="space-y-4">
      {/* Key Metrics - 5 cards in a row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Contrato</p>
                <p className="text-lg font-bold truncate">{formatCurrency(metrics.contractValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Custo Planejado</p>
                <p className="text-lg font-bold truncate">{formatCurrency(metrics.plannedCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                marginTrend === 'up' ? 'bg-green-100 dark:bg-green-900/30' :
                marginTrend === 'down' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'
              }`}>
                {marginTrend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : marginTrend === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Margem</p>
                <p className={`text-lg font-bold ${
                  marginTrend === 'up' ? 'text-green-600 dark:text-green-400' :
                  marginTrend === 'down' ? 'text-red-600 dark:text-red-400' : ''
                }`}>
                  {formatPercent(metrics.margin)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Recebido</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400 truncate">
                  {formatCurrency(metrics.receivedValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <PiggyBank className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400 truncate">
                  {formatCurrency(metrics.pendingValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row - Cost Breakdown + Payments */}
      <div className="grid gap-4 md:grid-cols-2">
        <ProjectCostBreakdownChart project={project} />
        <ProjectPaymentsChart project={project} />
      </div>

      {/* Trend Chart - Full Width */}
      <ProjectTrendChart project={project} />

      {/* Team Section - Full Width */}
      <ProjectTeamSection 
        members={project.members || []} 
        projectId={project.id} 
      />
    </div>
  );
}
