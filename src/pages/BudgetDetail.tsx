import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Edit, 
  Copy, 
  Calendar, 
  Building2, 
  User, 
  Clock, 
  DollarSign,
  TrendingUp,
  Users,
  Loader2
} from 'lucide-react';
import { useBudget, useDuplicateBudget } from '@/hooks/useBudgets';
import { BudgetStatusBadge } from '@/components/budgets/BudgetStatusBadge';
import { BudgetHoursChart } from '@/components/budgets/BudgetHoursChart';
import { BudgetCostBreakdownChart } from '@/components/budgets/BudgetCostBreakdownChart';
import { formatCurrency } from '@/lib/formatters';
import { calculateBudgetTotals } from '@/types/budget';

export default function BudgetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: budget, isLoading } = useBudget(id || null);
  const duplicateMutation = useDuplicateBudget();

  const calculation = useMemo(() => {
    if (!budget) return null;
    const roles = budget.roles.map((r) => ({
      tempId: r.id,
      roleRateId: r.role_rate_id || '',
      roleName: r.role_name,
      seniority: r.seniority,
      hourlyRate: r.hourly_rate,
      months: r.months.map((m) => ({ monthNumber: m.month_number, hours: m.hours })),
    }));
    return calculateBudgetTotals(
      roles,
      budget.admin_expenses_percent,
      budget.taxes_percent,
      budget.commission_percent,
      budget.discount_percent
    );
  }, [budget]);

  const totalHours = useMemo(() => {
    if (!budget) return 0;
    return budget.roles.reduce((acc, role) => 
      acc + role.months.reduce((h, m) => h + m.hours, 0), 0
    );
  }, [budget]);

  const handleDuplicate = () => {
    if (id) {
      duplicateMutation.mutate(id, { onSuccess: () => navigate('/budgets') });
    }
  };

  if (isLoading || !budget) {
    return (
      <AppLayout
        title="Carregando..."
        breadcrumbs={[{ label: 'Orçamentos', href: '/budgets' }, { label: 'Detalhes' }]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={budget.title}
      description={`Orçamento ${budget.budget_number}`}
      breadcrumbs={[
        { label: 'Orçamentos', href: '/budgets' },
        { label: budget.budget_number },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/budgets')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button variant="outline" onClick={handleDuplicate} disabled={duplicateMutation.isPending}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicar
          </Button>
          <Button onClick={() => navigate(`/budgets/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status and basic info cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1"><BudgetStatusBadge status={budget.status} /></div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Duração</p>
                  <p className="font-semibold">{budget.duration_months} {budget.duration_months === 1 ? 'mês' : 'meses'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Horas</p>
                  <p className="font-semibold">{totalHours}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor Final</p>
                  <p className="font-semibold text-primary">{formatCurrency(budget.final_total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client/Lead and dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {budget.client_id ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                {budget.client_id ? 'Cliente' : 'Lead'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">
                  {budget.client?.company_name || budget.lead_name}
                </p>
                {budget.client?.trading_name && (
                  <p className="text-sm text-muted-foreground">{budget.client.trading_name}</p>
                )}
                {budget.lead_contact && (
                  <p className="text-sm text-muted-foreground">{budget.lead_contact}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Datas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Início do Projeto</p>
                  <p className="font-medium">
                    {format(new Date(budget.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                {budget.valid_until && (
                  <div>
                    <p className="text-sm text-muted-foreground">Válido até</p>
                    <p className="font-medium">
                      {format(new Date(budget.valid_until), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BudgetHoursChart budget={budget} />
          <BudgetCostBreakdownChart budget={budget} calculation={calculation!} />
        </div>

        {/* Roles table */}
        <Card>
          <CardHeader>
            <CardTitle>Alocação de Papéis</CardTitle>
            <CardDescription>Horas alocadas por papel e mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Papel</th>
                    <th className="text-left p-2 font-medium">Senioridade</th>
                    <th className="text-right p-2 font-medium">Valor/Hora</th>
                    {Array.from({ length: budget.duration_months }, (_, i) => (
                      <th key={i} className="text-center p-2 font-medium">Mês {i + 1}</th>
                    ))}
                    <th className="text-right p-2 font-medium">Total Horas</th>
                    <th className="text-right p-2 font-medium">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.roles.map((role) => {
                    const totalRoleHours = role.months.reduce((sum, m) => sum + m.hours, 0);
                    const totalRoleValue = totalRoleHours * role.hourly_rate;
                    return (
                      <tr key={role.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{role.role_name}</td>
                        <td className="p-2">
                          <Badge variant="outline">{role.seniority}</Badge>
                        </td>
                        <td className="p-2 text-right">{formatCurrency(role.hourly_rate)}</td>
                        {Array.from({ length: budget.duration_months }, (_, i) => {
                          const month = role.months.find((m) => m.month_number === i + 1);
                          return (
                            <td key={i} className="p-2 text-center">
                              {month?.hours || 0}h
                            </td>
                          );
                        })}
                        <td className="p-2 text-right font-medium">{totalRoleHours}h</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(totalRoleValue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Financial breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resumo Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (horas × valor)</span>
                <span className="font-medium">{formatCurrency(calculation?.subtotal || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Despesas Administrativas ({budget.admin_expenses_percent}%)</span>
                <span>{formatCurrency(calculation?.adminExpenses || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Impostos ({budget.taxes_percent}%)</span>
                <span>{formatCurrency(calculation?.taxes || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comissão ({budget.commission_percent}%)</span>
                <span>{formatCurrency(calculation?.commission || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Total com Taxas</span>
                <span className="font-medium">{formatCurrency(calculation?.totalWithFees || 0)}</span>
              </div>
              {budget.discount_percent > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Desconto ({budget.discount_percent}%)</span>
                  <span>-{formatCurrency(calculation?.discount || 0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-bold">Valor Final</span>
                <span className="font-bold text-primary">{formatCurrency(calculation?.finalTotal || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {budget.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{budget.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
