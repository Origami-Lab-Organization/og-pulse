import { TrendingUp, TrendingDown, Target, AlertTriangle, Receipt, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { useMemo } from 'react';
import { ProjectFinancialChart } from './ProjectFinancialChart';
import { ProjectTrendChart } from './ProjectTrendChart';
import { ProjectInstallmentsTable } from '@/components/projects/ProjectInstallmentsTable';

interface ProjectFinancialTabProps {
  project: ProjectWithRelations;
}

export function ProjectFinancialTab({ project }: ProjectFinancialTabProps) {
  // Calculate planned costs
  const plannedCosts = useMemo(() => {
    let laborCost = 0;
    let supplierCost = 0;
    let materialCost = 0;

    // Labor costs using real employee cost (total_monthly_cost_estimated / jornada_mensal)
    if (project.members && project.members.length > 0) {
      laborCost = project.members.reduce((total, member) => {
        const employee = member.employee;
        if (!employee) return total;
        const totalMonthlyCost = employee.total_monthly_cost_estimated || 0;
        const workHours = employee.jornada_mensal || 168;
        const realHourlyCost = workHours > 0 ? totalMonthlyCost / workHours : 0;
        return total + realHourlyCost * Number(member.hours_per_month);
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

  // Calculate project duration for total cost estimation
  const projectDuration = useMemo(() => {
    if (project.is_continuous) return 12;
    if (!project.end_date) return 6;
    
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    return Math.max(1, months);
  }, [project]);

  // Total planned cost over project duration
  const totalPlannedCost = plannedCosts.monthlyRecurring * projectDuration + plannedCosts.oneTimeCosts;
  
  // Revenue & margin
  const contractValue = Number(project.total_value);
  const plannedMargin = contractValue - totalPlannedCost;
  const plannedMarginPercent = contractValue > 0 ? (plannedMargin / contractValue) * 100 : 0;

  // Received & pending
  const receivedValue = (project.installments || [])
    .filter((i) => i.status === 'received')
    .reduce((sum, i) => sum + Number(i.value), 0);
  const pendingValue = contractValue - receivedValue;

  const isPositiveMargin = plannedMargin >= 0;

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita (Contrato)</p>
                <p className="text-lg font-semibold">{formatCurrency(contractValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Target className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Planejado</p>
                <p className="text-lg font-semibold">{formatCurrency(totalPlannedCost)}</p>
                <p className="text-xs text-muted-foreground">total do projeto</p>
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
                <p className="text-sm text-muted-foreground">Margem Bruta</p>
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

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recebido</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(receivedValue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pendente: {formatCurrency(pendingValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Editable Installments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Parcelas / Faturamento</CardTitle>
          <CardDescription>
            Gerencie a emissão de NF e registre os recebimentos do projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectInstallmentsTable
            installments={project.installments || []}
            projectId={project.id}
          />
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
