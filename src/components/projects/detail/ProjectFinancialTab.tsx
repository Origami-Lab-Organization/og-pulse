import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { useMemo } from 'react';
import { ProjectFinancialChart } from './ProjectFinancialChart';
import { ProjectTrendChart } from './ProjectTrendChart';

interface ProjectFinancialTabProps {
  project: ProjectWithRelations;
}

export function ProjectFinancialTab({ project }: ProjectFinancialTabProps) {
  // Calculate planned costs
  const plannedCosts = useMemo(() => {
    let laborCost = 0;
    let supplierCost = 0;
    let materialCost = 0;

    // Labor costs (monthly)
    if (project.members && project.members.length > 0) {
      laborCost = project.members.reduce((total, member) => {
        const employee = member.employee;
        if (!employee) return total;
        const monthlyCost = Number(employee.salario_mensal) + Number(employee.beneficios) + Number(employee.encargos);
        const hourlyRate = monthlyCost / 176;
        return total + hourlyRate * Number(member.hours_per_month);
      }, 0);
    }

    // Supplier costs (monthly)
    if (project.suppliers && project.suppliers.length > 0) {
      supplierCost = project.suppliers.reduce((total, s) => total + Number(s.monthly_value), 0);
    }

    // Material costs (total)
    if (project.materials && project.materials.length > 0) {
      materialCost = project.materials.reduce((total, m) => total + Number(m.value), 0);
    }

    const monthlyRecurring = laborCost + supplierCost;
    const oneTimeCosts = materialCost;

    return { laborCost, supplierCost, materialCost, monthlyRecurring, oneTimeCosts };
  }, [project]);

  // Calculate realized costs (for now, materials marked as realized)
  const realizedCosts = useMemo(() => {
    let materialCostRealized = 0;

    if (project.materials && project.materials.length > 0) {
      materialCostRealized = project.materials
        .filter((m) => m.is_realized)
        .reduce((total, m) => total + Number(m.value), 0);
    }

    // For a more complete implementation, we'd need project_costs_actual table
    return { laborCost: 0, supplierCost: 0, materialCost: materialCostRealized };
  }, [project]);

  // Calculate project duration for total cost estimation
  const projectDuration = useMemo(() => {
    if (project.is_continuous) return 12; // Assume 12 months for continuous
    if (!project.end_date) return 6; // Default to 6 months if no end date
    
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    return Math.max(1, months);
  }, [project]);

  // Total planned cost over project duration
  const totalPlannedCost = plannedCosts.monthlyRecurring * projectDuration + plannedCosts.oneTimeCosts;
  
  // Margin calculation
  const contractValue = Number(project.total_value);
  const plannedMargin = contractValue - totalPlannedCost;
  const plannedMarginPercent = contractValue > 0 ? (plannedMargin / contractValue) * 100 : 0;

  // Variance (realized vs planned)
  const totalRealizedCost = realizedCosts.laborCost + realizedCosts.supplierCost + realizedCosts.materialCost;
  const variance = totalRealizedCost - (totalPlannedCost > 0 ? totalPlannedCost * (totalRealizedCost / totalPlannedCost) : 0);

  const isPositiveMargin = plannedMargin >= 0;
  const isNegativeVariance = variance > 0;

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Planejado</p>
                <p className="text-lg font-semibold">{formatCurrency(totalPlannedCost)}</p>
                <p className="text-xs text-muted-foreground">total do projeto</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Realizado</p>
                <p className="text-lg font-semibold">{formatCurrency(totalRealizedCost)}</p>
                <p className="text-xs text-muted-foreground">até o momento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isNegativeVariance 
                  ? 'bg-red-100 dark:bg-red-900/30' 
                  : 'bg-green-100 dark:bg-green-900/30'
              }`}>
                {isNegativeVariance ? (
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Variação</p>
                <p className={`text-lg font-semibold ${
                  isNegativeVariance ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  {isNegativeVariance ? '+' : ''}{formatCurrency(variance)}
                </p>
                <p className="text-xs text-muted-foreground">realizado vs planejado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={isPositiveMargin ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isPositiveMargin 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {isPositiveMargin ? (
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Margem Planejada</p>
                <p className={`text-lg font-semibold ${
                  isPositiveMargin ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatPercent(plannedMarginPercent)}
                </p>
                <p className="text-xs text-muted-foreground">{formatCurrency(plannedMargin)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Composição de Custos</CardTitle>
          <CardDescription>
            Detalhamento mensal dos custos planejados por categoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Mão de Obra</p>
              <p className="text-xl font-semibold">{formatCurrency(plannedCosts.laborCost)}</p>
              <p className="text-xs text-muted-foreground">/mês</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Fornecedores</p>
              <p className="text-xl font-semibold">{formatCurrency(plannedCosts.supplierCost)}</p>
              <p className="text-xs text-muted-foreground">/mês</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Materiais</p>
              <p className="text-xl font-semibold">{formatCurrency(plannedCosts.materialCost)}</p>
              <p className="text-xs text-muted-foreground">total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProjectFinancialChart 
          project={project}
          plannedCosts={plannedCosts}
          projectDuration={projectDuration}
        />
        <ProjectTrendChart project={project} />
      </div>
    </div>
  );
}
