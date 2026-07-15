import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { useMaskedCurrency, useHideValues } from '@/contexts/HideValuesContext';
import { useMemo } from 'react';
import { parseISO, startOfMonth, addMonths } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectSupplierMonths } from '@/hooks/useProjectSupplierMonths';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useProjectPlannedLaborCost } from '@/hooks/useProjectPlannedLaborCost';
import { useHolidays } from '@/hooks/useHolidays';
import { getFallbackHourlyCost } from '@/lib/employeeCost';
import { PlanningInstallmentsTable } from './PlanningInstallmentsTable';

interface ProjectExpectedResultTabProps {
  project: ProjectWithRelations;
  canManageInstallments?: boolean;
}

export function ProjectExpectedResultTab({ project, canManageInstallments = false }: ProjectExpectedResultTabProps) {
  const formatCurrency = useMaskedCurrency();
  const hideValues = useHideValues();
  const memberIds = useMemo(() => (project.members || []).map((m) => m.id), [project.members]);
  const supplierIds = useMemo(() => (project.suppliers || []).map((s) => s.id), [project.suppliers]);

  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  const { data: supplierMonths = [] } = useProjectSupplierMonths(supplierIds);
  const { data: financialSettings } = useFinancialSettings();
  const { data: holidays = [] } = useHolidays();
  const plannedLaborFromAllocations = useProjectPlannedLaborCost(
    project,
    project.duration_months,
  );

  const costs = useMemo(() => {
    let laborCost = plannedLaborFromAllocations.hasRoleAllocations
      ? plannedLaborFromAllocations.total
      : 0;

    if (!plannedLaborFromAllocations.hasRoleAllocations) {
      const projStart = startOfMonth(parseISO(project.start_date));
      project.members?.forEach((member) => {
        const memberEntries = memberMonths.filter((mm) => mm.project_member_id === member.id);
        if (memberEntries.length === 0) return;

        laborCost += memberEntries.reduce((sum, mm) => {
          if ((mm as any).cost_per_hour != null) {
            return sum + Number((mm as any).cost_per_hour) * Number(mm.hours);
          }
          const fallbackCost = member.employee
            ? (() => {
                const monthDate = addMonths(projStart, mm.month_number - 1);
                return getFallbackHourlyCost(
                  member.employee.total_monthly_cost_estimated || 0,
                  member.employee.jornada_diaria || 8,
                  monthDate.getFullYear(),
                  monthDate.getMonth(),
                  holidays,
                );
              })()
            : Number((member as any).hourly_rate) || 0;
          return sum + fallbackCost * Number(mm.hours);
        }, 0);
      });
    }

    const suppliersCost = supplierMonths.reduce((sum, sm) => sum + Number(sm.value), 0);

    const materialsCost = project.materials?.reduce((total, material) => {
      return total + material.value;
    }, 0) || 0;

    return { laborCost, suppliersCost, materialsCost };
  }, [
    project.members,
    project.materials,
    project.start_date,
    memberMonths,
    supplierMonths,
    holidays,
    plannedLaborFromAllocations.hasRoleAllocations,
    plannedLaborFromAllocations.total,
  ]);

  const totalValue = project.total_value;
  const laborCost = costs.laborCost;
  const suppliersCost = costs.suppliersCost;
  const materialsCost = costs.materialsCost;
  const totalCost = laborCost + suppliersCost + materialsCost;

  const grossMargin = totalValue - totalCost;
  const marginPercent = totalValue > 0 ? (grossMargin / totalValue) * 100 : 0;
  const isPositiveMargin = grossMargin >= 0;

  // Margin target gap
  const marginTarget = financialSettings?.gross_margin_target_percent || 0;
  const marginGap = marginPercent - marginTarget;




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
              {hideValues ? '•••' : `${marginPercent.toFixed(1)}%`}
            </p>
            {marginTarget > 0 && (
              <p className={`text-xs mt-1 ${marginGap >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {hideValues
                  ? '••• pp vs meta'
                  : `${marginGap >= 0 ? '+' : ''}${marginGap.toFixed(1)}pp vs meta (${marginTarget}%)`}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Installments table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projeção de Recebimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanningInstallmentsTable
            installments={project.installments || []}
            projectId={project.id}
            canManageInstallments={canManageInstallments}
          />
        </CardContent>
      </Card>
    </div>
  );
}
