import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Receipt, Wallet, Target, PiggyBank, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectWithRelations, INSTALLMENT_STATUS_LABELS, PAYMENT_METHOD_OPTIONS } from '@/types/project';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProjectCostBreakdownChart } from './ProjectCostBreakdownChart';
import { ProjectPaymentsChart } from './ProjectPaymentsChart';
import { ProjectTeamSection } from './ProjectTeamSection';
import { ProjectTrendChart } from './ProjectTrendChart';
import { useEmployees } from '@/hooks/useEmployees';

interface ProjectOverviewTabProps {
  project: ProjectWithRelations;
}

const installmentStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  invoiced: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  received: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const HOURS_PER_MONTH = 176;

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const { data: employees = [] } = useEmployees();

  const paymentMethodLabel = PAYMENT_METHOD_OPTIONS.find(
    (opt) => opt.value === project.payment_method
  )?.label || project.payment_method;

  // Calculate financial metrics
  const metrics = useMemo(() => {
    // Labor cost
    const laborCost = (project.members || []).reduce((acc, member) => {
      const employee = employees.find((e) => e.id === member.employee_id);
      if (!employee) return acc;
      const totalCost =
        employee.salarioMensal +
        employee.beneficios +
        employee.encargos +
        (employee.totalToolsCost || 0);
      const hourlyCost = totalCost / HOURS_PER_MONTH;
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
  }, [project, employees]);

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

      {/* Payment Info / Installments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parcelas de Pagamento</CardTitle>
          <CardDescription>
            {paymentMethodLabel} • {project.installments_count} parcela(s) • Vencimento dia {project.due_day}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.installments && project.installments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Parcela</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>NF</TableHead>
                    <TableHead>Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.installments.map((installment) => (
                    <TableRow key={installment.id}>
                      <TableCell className="font-medium">
                        {installment.installment_number}/{project.installments_count}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(installment.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{formatCurrency(installment.value)}</TableCell>
                      <TableCell>
                        <Badge className={installmentStatusColors[installment.status]}>
                          {INSTALLMENT_STATUS_LABELS[installment.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {installment.invoice_number || '-'}
                      </TableCell>
                      <TableCell>
                        {installment.payment_date 
                          ? format(parseISO(installment.payment_date), "dd/MM/yyyy", { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground italic">Nenhuma parcela cadastrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
