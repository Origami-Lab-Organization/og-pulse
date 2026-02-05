import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Percent, Users, Package, Truck } from 'lucide-react';
import { useMemo } from 'react';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectSupplierMonths } from '@/hooks/useProjectSupplierMonths';

interface ProjectExpectedResultTabProps {
  project: ProjectWithRelations;
}

export function ProjectExpectedResultTab({ project }: ProjectExpectedResultTabProps) {
  // Get member and supplier IDs for fetching monthly data
  const memberIds = useMemo(() => (project.members || []).map((m) => m.id), [project.members]);
  const supplierIds = useMemo(() => (project.suppliers || []).map((s) => s.id), [project.suppliers]);

  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  const { data: supplierMonths = [] } = useProjectSupplierMonths(supplierIds);

  // Calculate costs from actual planned monthly data
  const costs = useMemo(() => {
    // Labor cost: sum of (real hourly cost × planned hours per month)
    let laborCost = 0;
    project.members?.forEach((member) => {
      const employee = member.employee;
      if (!employee) return;

      const totalMonthlyCost = employee.total_monthly_cost_estimated || 0;
      const workHours = employee.jornada_mensal || 168;
      const realHourlyCost = workHours > 0 ? totalMonthlyCost / workHours : 0;

      // Sum all planned hours for this member from memberMonths
      const totalPlannedHours = memberMonths
        .filter((mm) => mm.project_member_id === member.id)
        .reduce((sum, mm) => sum + Number(mm.hours), 0);

      laborCost += realHourlyCost * totalPlannedHours;
    });

    // Suppliers cost: sum of all monthly values from supplierMonths
    const suppliersCost = supplierMonths.reduce((sum, sm) => sum + Number(sm.value), 0);

    // Materials cost remains the same
    const materialsCost = project.materials?.reduce((total, material) => {
      return total + material.value;
    }, 0) || 0;

    return { laborCost, suppliersCost, materialsCost };
  }, [project.members, project.materials, memberMonths, supplierMonths]);

  const totalValue = project.total_value;
  const laborCost = costs.laborCost;
  const suppliersCost = costs.suppliersCost;
  const materialsCost = costs.materialsCost;
  const totalCost = laborCost + suppliersCost + materialsCost;
  const grossMargin = totalValue - totalCost;
  const marginPercent = totalValue > 0 ? (grossMargin / totalValue) * 100 : 0;
  const isPositiveMargin = grossMargin >= 0;

  // Calculate cost breakdown percentages
  const laborPercent = totalCost > 0 ? (laborCost / totalCost) * 100 : 0;
  const suppliersPercent = totalCost > 0 ? (suppliersCost / totalCost) * 100 : 0;
  const materialsPercent = totalCost > 0 ? (materialsCost / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Resultado Financeiro Esperado</h3>
        <p className="text-sm text-muted-foreground">
          Projeção de receita, custos e margem do projeto
        </p>
      </div>

      {/* Main KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Receita Total
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4" />
              Custo Planejado
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Margem Bruta
            </div>
            <p className={`text-2xl font-bold ${isPositiveMargin ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(grossMargin)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Percent className="h-4 w-4" />
              Margem %
            </div>
            <p className={`text-2xl font-bold ${isPositiveMargin ? 'text-green-600' : 'text-destructive'}`}>
              {marginPercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Composição de Custos Planejados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm">Mão de Obra</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{formatCurrency(laborCost)}</span>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {laborPercent.toFixed(0)}%
                </span>
              </div>
            </div>
            <Progress value={laborPercent} className="h-2" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-sm">Fornecedores</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{formatCurrency(suppliersCost)}</span>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {suppliersPercent.toFixed(0)}%
                </span>
              </div>
            </div>
            <Progress value={suppliersPercent} className="h-2" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm">Materiais</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{formatCurrency(materialsCost)}</span>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {materialsPercent.toFixed(0)}%
                </span>
              </div>
            </div>
            <Progress value={materialsPercent} className="h-2" />
          </div>

          <div className="pt-3 border-t">
            <div className="flex items-center justify-between font-medium">
              <span>Total de Custos</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installments projection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projeção de Recebimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {project.installments && project.installments.length > 0 ? (
            <div className="space-y-2">
              {project.installments.map((installment) => (
                <div key={installment.id} className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-24">
                    Parcela {installment.installment_number}
                  </span>
                  <div className="flex-1">
                    <Progress 
                      value={(installment.value / totalValue) * 100} 
                      className="h-6"
                    />
                  </div>
                  <span className="text-sm font-medium w-32 text-right">
                    {formatCurrency(installment.value)}
                  </span>
                </div>
              ))}
              <div className="pt-3 border-t flex items-center justify-between font-medium">
                <span>Total</span>
                <span>{formatCurrency(totalValue)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma parcela definida. Configure o plano de pagamento no projeto.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
