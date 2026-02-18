import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProjectWithRelations } from '@/types/project';
import { PORTFOLIO_STAGE_LABELS, PortfolioStage } from '@/types/portfolio';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { ProjectMembersTable } from './ProjectMembersTable';
import { ProjectInstallmentsTable } from './ProjectInstallmentsTable';
import {
  Building2,
  User,
  Calendar,
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';

interface ProjectDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithRelations | null;
}

const stageColors: Record<PortfolioStage, string> = {
  planning: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  value_delivery: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  results_presentation: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  value_book: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  learning_case: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

const paymentMethodLabels: Record<string, string> = {
  mensal: 'Mensal',
  por_entrega: 'Por Entrega',
  unico: 'Pagamento Único',
  personalizado: 'Personalizado',
};

const HOURS_PER_MONTH = 176;

interface MemberEmployee {
  salario_mensal?: number;
  beneficios?: number;
  encargos?: number;
}

function calculateHourlyCost(employee?: MemberEmployee): number {
  if (!employee) return 0;
  const totalCost =
    Number(employee.salario_mensal || 0) +
    Number(employee.beneficios || 0) +
    Number(employee.encargos || 0);
  return totalCost / HOURS_PER_MONTH;
}

export function ProjectDetailDialog({
  open,
  onOpenChange,
  project,
}: ProjectDetailDialogProps) {
  if (!project) return null;

  const paidInstallments = project.installments?.filter((i) => i.status === 'received') || [];
  const pendingValue =
    (project.installments?.filter((i) => i.status !== 'received') || []).reduce(
      (acc, i) => acc + Number(i.value),
      0
    );
  const paidValue = paidInstallments.reduce((acc, i) => acc + Number(i.value), 0);

  // Calculate project duration in months
  const projectDurationMonths = useMemo(() => {
    if (project.is_continuous) {
      // For continuous projects, use installments count as reference
      return project.installments_count || 12;
    }
    if (!project.start_date || !project.end_date) return 1;
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    return Math.max(1, months);
  }, [project]);

  // Calculate monthly team cost
  const monthlyTeamCost = useMemo(() => {
    return (project.members || []).reduce((acc, member) => {
      const hourlyCost = calculateHourlyCost(member.employee as MemberEmployee);
      return acc + hourlyCost * Number(member.hours_per_month || 0);
    }, 0);
  }, [project.members]);

  // Calculate total estimated cost for the project
  const totalEstimatedCost = monthlyTeamCost * projectDurationMonths;

  // Calculate margin
  const contractValue = Number(project.total_value || 0);
  const profit = contractValue - totalEstimatedCost;
  const marginPercent = contractValue > 0 ? (profit / contractValue) * 100 : 0;
  const isPositiveMargin = profit >= 0;

  // Cost breakdown percentage
  const costPercent = contractValue > 0 ? Math.min((totalEstimatedCost / contractValue) * 100, 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{project.name}</DialogTitle>
            <Badge className={stageColors[(project.portfolio_stage || 'planning') as PortfolioStage]} variant="outline">
              {PORTFOLIO_STAGE_LABELS[(project.portfolio_stage || 'planning') as PortfolioStage]}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="margin">Margem</TabsTrigger>
            <TabsTrigger value="team">
              Time ({project.members?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="financial">
              Parcelas ({project.installments?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{project.client?.company_name}</p>
                  {project.client?.trading_name && (
                    <p className="text-sm text-muted-foreground">
                      {project.client.trading_name}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Gerente do Projeto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{project.manager?.nome}</p>
                  {project.manager?.cargo && (
                    <p className="text-sm text-muted-foreground">{project.manager.cargo}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">
                    {formatDate(project.start_date)} - {project.is_continuous ? 'Contínuo' : formatDate(project.end_date)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {projectDurationMonths} {projectDurationMonths === 1 ? 'mês' : 'meses'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Valor Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-lg">
                    {formatCurrency(Number(project.total_value))}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Forma de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">
                    {paymentMethodLabels[project.payment_method] || project.payment_method}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {project.installments_count} parcela(s), venc. dia {project.due_day}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600">
                    Valor Recebido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-lg text-green-600">
                    {formatCurrency(paidValue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {paidInstallments.length} parcela(s) paga(s)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-600">
                    Valor Pendente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-lg text-orange-600">
                    {formatCurrency(pendingValue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(project.installments?.length || 0) - paidInstallments.length} parcela(s)
                    pendente(s)
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="margin" className="space-y-4 mt-4">
            {/* Margin Summary Card */}
            <Card className={isPositiveMargin ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  {isPositiveMargin ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  Análise de Margem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor do Contrato</p>
                    <p className="text-2xl font-bold">{formatCurrency(contractValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Custo Estimado</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(totalEstimatedCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isPositiveMargin ? 'Lucro Estimado' : 'Prejuízo Estimado'}
                    </p>
                    <p className={`text-2xl font-bold ${isPositiveMargin ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(profit))}
                    </p>
                  </div>
                </div>

                {/* Progress bar showing cost vs revenue */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Custo / Receita</span>
                    <span className={isPositiveMargin ? 'text-green-600' : 'text-red-600'}>
                      {costPercent.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={costPercent} 
                    className={`h-3 ${costPercent > 100 ? '[&>div]:bg-red-500' : costPercent > 80 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Margin Badge */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Badge 
                    variant="outline" 
                    className={`text-lg px-4 py-2 ${
                      marginPercent >= 30 
                        ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200' 
                        : marginPercent >= 15 
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200'
                          : marginPercent >= 0
                            ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200'
                            : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    Margem: {marginPercent.toFixed(1)}%
                  </Badge>
                </div>

                {!isPositiveMargin && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-md text-red-700 dark:text-red-300">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <p className="text-sm">
                      <strong>Atenção:</strong> O custo estimado da equipe ultrapassa o valor do contrato. 
                      Revise a alocação de horas ou renegocie o valor do projeto.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Custo Mensal da Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(monthlyTeamCost)}</p>
                  <p className="text-sm text-muted-foreground">
                    {project.members?.length || 0} membro(s) alocado(s)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Duração do Projeto</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {projectDurationMonths} {projectDurationMonths === 1 ? 'mês' : 'meses'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {project.is_continuous ? 'Projeto contínuo (estimativa)' : 'Prazo determinado'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Per Member Cost Table */}
            {project.members && project.members.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Custo por Membro</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {project.members.map((member) => {
                      const hourlyCost = calculateHourlyCost(member.employee as MemberEmployee);
                      const memberMonthlyCost = hourlyCost * Number(member.hours_per_month || 0);
                      const memberTotalCost = memberMonthlyCost * projectDurationMonths;
                      const memberCostPercent = totalEstimatedCost > 0 
                        ? (memberTotalCost / totalEstimatedCost) * 100 
                        : 0;

                      return (
                        <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {member.employee?.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '??'}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{member.employee?.nome || 'Desconhecido'}</p>
                              <p className="text-xs text-muted-foreground">
                                {member.hours_per_month || 0}h/mês × {formatCurrency(hourlyCost)}/h
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(memberTotalCost)}</p>
                            <p className="text-xs text-muted-foreground">
                              {memberCostPercent.toFixed(1)}% do custo total
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {(!project.members || project.members.length === 0) && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>Adicione membros ao projeto para calcular os custos.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="team" className="mt-4">
            <ProjectMembersTable
              members={project.members || []}
              projectId={project.id}
            />
          </TabsContent>

          <TabsContent value="financial" className="mt-4">
            <ProjectInstallmentsTable
              installments={project.installments || []}
              projectId={project.id}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
