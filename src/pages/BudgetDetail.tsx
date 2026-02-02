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
  Edit, 
  Calendar, 
  Building2, 
  User, 
  Clock, 
  DollarSign,
  TrendingUp,
  Users,
  Loader2,
  Package,
  Truck
} from 'lucide-react';
import { useBudget } from '@/hooks/useBudgets';
import { BudgetStatusBadge } from '@/components/budgets/BudgetStatusBadge';
import { BudgetHoursChart } from '@/components/budgets/BudgetHoursChart';
import { BudgetCostBreakdownChart } from '@/components/budgets/BudgetCostBreakdownChart';
import { BudgetVersionsSection } from '@/components/budgets/BudgetVersionsSection';
import { formatCurrency, parseDateString } from '@/lib/formatters';
import { calculateBudgetTotals } from '@/types/budget';

export default function BudgetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: budget, isLoading } = useBudget(id || null);

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
    const materials = (budget.materials || []).map((m) => ({
      tempId: m.id,
      description: m.description,
      value: m.value,
    }));
    const suppliers = (budget.suppliers || []).map((s) => ({
      tempId: s.id,
      name: s.name,
      description: s.description || '',
      monthlyValue: s.monthly_value,
    }));
    return calculateBudgetTotals(
      roles,
      materials,
      suppliers,
      budget.duration_months,
      budget.admin_expenses_percent,
      budget.taxes_percent,
      budget.commission_percent,
      (budget as any).net_margin_percent ?? 0, // Use stored net_margin_percent from budget
      (budget as any).discount_value ?? 0
    );
  }, [budget]);

  const totalHours = useMemo(() => {
    if (!budget) return 0;
    return budget.roles.reduce((acc, role) => 
      acc + role.months.reduce((h, m) => h + m.hours, 0), 0
    );
  }, [budget]);


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
        budget.status === 'active' ? (
          <Badge variant="secondary" className="text-sm">
            Orçamento fechado - não pode ser editado
          </Badge>
        ) : (
          <Button onClick={() => navigate(`/budgets/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        )
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
                Validade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Criação do Orçamento</p>
                  <p className="font-medium">
                    {format(parseDateString(budget.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                {budget.valid_until && (
                  <div>
                    <p className="text-sm text-muted-foreground">Válido até</p>
                    <p className="font-medium">
                      {format(parseDateString(budget.valid_until), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
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

        {/* Suppliers table */}
        {budget.suppliers && budget.suppliers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Fornecedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Fornecedor</th>
                      <th className="text-left p-2 font-medium">Descrição</th>
                      <th className="text-right p-2 font-medium">Valor Mensal</th>
                      <th className="text-right p-2 font-medium">Total ({budget.duration_months} meses)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budget.suppliers.map((supplier) => (
                      <tr key={supplier.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{supplier.name}</td>
                        <td className="p-2 text-muted-foreground">{supplier.description || '-'}</td>
                        <td className="p-2 text-right">{formatCurrency(supplier.monthly_value)}</td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(supplier.monthly_value * budget.duration_months)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50">
                      <td className="p-2 font-semibold" colSpan={3}>Total Fornecedores</td>
                      <td className="p-2 text-right font-semibold">
                        {formatCurrency(calculation?.suppliersTotal || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Materials table */}
        {budget.materials && budget.materials.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Materiais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Descrição</th>
                      <th className="text-right p-2 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budget.materials.map((material) => (
                      <tr key={material.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{material.description}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(material.value)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50">
                      <td className="p-2 font-semibold">Total Materiais</td>
                      <td className="p-2 text-right font-semibold">
                        {formatCurrency(calculation?.materialsTotal || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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
                <span className="text-muted-foreground">Mão de Obra</span>
                <span className="font-medium">{formatCurrency(calculation?.laborCost || 0)}</span>
              </div>
              {(calculation?.suppliersTotal || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fornecedores</span>
                  <span className="font-medium">{formatCurrency(calculation?.suppliersTotal || 0)}</span>
                </div>
              )}
              {(calculation?.materialsTotal || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Materiais</span>
                  <span className="font-medium">{formatCurrency(calculation?.materialsTotal || 0)}</span>
                </div>
              )}
              <div className="flex justify-between bg-muted/50 rounded-md p-2 -mx-2">
                <span className="font-medium">Custo Total</span>
                <span className="font-semibold">{formatCurrency(calculation?.totalCost || 0)}</span>
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
              {(calculation?.netMargin || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margem Líquida ({(budget as any).net_margin_percent ?? 0}%)</span>
                  <span>{formatCurrency(calculation?.netMargin || 0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Preço de Venda</span>
                <span className="font-medium">{formatCurrency(calculation?.sellingPrice || 0)}</span>
              </div>
              {(calculation?.discount ?? 0) > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Desconto</span>
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

        {/* Version history */}
        <BudgetVersionsSection budgetId={budget.id} />

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
