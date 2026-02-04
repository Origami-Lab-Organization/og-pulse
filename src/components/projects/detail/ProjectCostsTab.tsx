import { useMemo } from 'react';
import { Users, Truck, Package, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectLaborSection } from '@/components/projects/detail/ProjectLaborSection';
import { ProjectSuppliersSection } from '@/components/projects/detail/ProjectSuppliersSection';
import { ProjectMaterialsSection } from '@/components/projects/detail/ProjectMaterialsSection';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectSupplierMonths } from '@/hooks/useProjectSupplierMonths';
import { useTimesheetsByMembers } from '@/hooks/useProjectTimesheets';
import { useProjectSupplierActuals } from '@/hooks/useProjectSupplierActuals';
import { useBudget } from '@/hooks/useBudgets';
import { differenceInMonths, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjectCostsTabProps {
  project: ProjectWithRelations;
  isEditable: boolean;
}

interface CostCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  plannedValue: number;
  actualValue: number;
  isTotal?: boolean;
}

function CostCard({ icon, iconBg, label, plannedValue, actualValue, isTotal = false }: CostCardProps) {
  const percentage = plannedValue > 0 ? (actualValue / plannedValue) * 100 : 0;
  const diff = actualValue - plannedValue;
  
  // Determine trend: over budget (bad), under budget (good), or on track
  const isOverBudget = diff > 0 && plannedValue > 0;
  const isUnderBudget = diff < 0 && actualValue > 0;
  
  return (
    <Card className={cn(isTotal && 'bg-primary/5')}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconBg)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Planejado:</span>
                <span className="text-sm font-medium">{formatCurrency(plannedValue)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Realizado:</span>
                <span className="text-sm font-semibold">{formatCurrency(actualValue)}</span>
              </div>
              {plannedValue > 0 && (
                <div className="flex items-center gap-1 pt-1">
                  {isOverBudget ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-destructive" />
                      <span className="text-xs font-medium text-destructive">
                        {percentage.toFixed(0)}% (+{formatCurrency(diff)})
                      </span>
                    </>
                  ) : isUnderBudget ? (
                    <>
                      <TrendingDown className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium text-green-600">
                        {percentage.toFixed(0)}% ({formatCurrency(diff)})
                      </span>
                    </>
                  ) : actualValue === 0 ? (
                    <>
                      <Minus className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">0%</span>
                    </>
                  ) : (
                    <>
                      <Minus className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {percentage.toFixed(0)}%
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectCostsTab({ project, isEditable }: ProjectCostsTabProps) {
  // Calculate duration from project dates
  const durationMonths = useMemo(() => {
    const startDate = parseISO(project.start_date);
    if (project.is_continuous) {
      return 12; // Continuous projects show 12 months
    }
    if (project.end_date) {
      const endDate = parseISO(project.end_date);
      return Math.max(1, differenceInMonths(endDate, startDate) + 1);
    }
    return 1;
  }, [project.start_date, project.end_date, project.is_continuous]);

  // Fetch linked budget if exists
  const { data: budget } = useBudget(project.budget_id);

  // Get member and supplier IDs for fetching monthly data
  const memberIds = useMemo(() => (project.members || []).map((m) => m.id), [project.members]);
  const supplierIds = useMemo(() => (project.suppliers || []).map((s) => s.id), [project.suppliers]);

  // Fetch planned data
  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  const { data: supplierMonths = [] } = useProjectSupplierMonths(supplierIds);

  // Fetch actual data (timesheets and supplier actuals)
  const { data: timesheets = [] } = useTimesheetsByMembers(memberIds);
  const { data: supplierActuals = [] } = useProjectSupplierActuals(supplierIds);

  // Calculate PLANNED labor costs using real employee cost (total_monthly_cost_estimated / jornada_mensal)
  const laborCostsPlanned = useMemo(() => {
    if (!project.members || project.members.length === 0) return 0;

    let total = 0;
    project.members.forEach((member) => {
      const employee = member.employee;
      if (!employee) return;
      
      const totalMonthlyCost = employee.total_monthly_cost_estimated || 0;
      const workHours = employee.jornada_mensal || 168;
      const realHourlyCost = workHours > 0 ? totalMonthlyCost / workHours : 0;

      // Sum PLANNED hours across all months
      const memberHours = memberMonths
        .filter((mm) => mm.project_member_id === member.id)
        .reduce((sum, mm) => sum + Number(mm.hours), 0);

      total += realHourlyCost * memberHours;
    });

    return total;
  }, [project.members, memberMonths]);

  // Calculate ACTUAL labor costs from timesheets
  const laborCostsActual = useMemo(() => {
    if (!project.members || project.members.length === 0) return 0;

    let total = 0;
    project.members.forEach((member) => {
      const employee = member.employee;
      if (!employee) return;
      
      const totalMonthlyCost = employee.total_monthly_cost_estimated || 0;
      const workHours = employee.jornada_mensal || 168;
      const realHourlyCost = workHours > 0 ? totalMonthlyCost / workHours : 0;

      // Sum ACTUAL hours from timesheets
      const actualHours = timesheets
        .filter((ts) => ts.project_member_id === member.id)
        .reduce((sum, ts) => sum + Number(ts.hours), 0);

      total += realHourlyCost * actualHours;
    });

    return total;
  }, [project.members, timesheets]);

  // Calculate PLANNED supplier costs from monthly values
  const supplierCostsPlanned = useMemo(() => {
    return supplierMonths.reduce((sum, sm) => sum + Number(sm.value), 0);
  }, [supplierMonths]);

  // Calculate ACTUAL supplier costs from actuals
  const supplierCostsActual = useMemo(() => {
    return supplierActuals.reduce((sum, sa) => sum + Number(sa.value), 0);
  }, [supplierActuals]);

  // Calculate PLANNED material costs (all materials)
  const materialCostsPlanned = useMemo(() => {
    if (!project.materials || project.materials.length === 0) return 0;
    return project.materials.reduce((total, m) => total + Number(m.value), 0);
  }, [project.materials]);

  // Calculate ACTUAL material costs (only realized materials)
  const materialCostsActual = useMemo(() => {
    if (!project.materials || project.materials.length === 0) return 0;
    return project.materials
      .filter((m) => m.is_realized)
      .reduce((total, m) => total + Number(m.value), 0);
  }, [project.materials]);

  const totalPlanned = laborCostsPlanned + supplierCostsPlanned + materialCostsPlanned;
  const totalActual = laborCostsActual + supplierCostsActual + materialCostsActual;

  return (
    <div className="space-y-6">
      {/* Costs Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <CostCard
          icon={<Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          label="Mão de Obra"
          plannedValue={laborCostsPlanned}
          actualValue={laborCostsActual}
        />

        <CostCard
          icon={<Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          label="Fornecedores"
          plannedValue={supplierCostsPlanned}
          actualValue={supplierCostsActual}
        />

        <CostCard
          icon={<Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          label="Materiais"
          plannedValue={materialCostsPlanned}
          actualValue={materialCostsActual}
        />

        <CostCard
          icon={<Package className="h-5 w-5 text-primary" />}
          iconBg="bg-primary/20"
          label="Custo Total"
          plannedValue={totalPlanned}
          actualValue={totalActual}
          isTotal
        />
      </div>

      {/* Labor Section */}
      <ProjectLaborSection
        projectId={project.id}
        members={project.members || []}
        durationMonths={durationMonths}
        isEditable={isEditable}
        budgetRoles={budget?.roles || []}
        timesheets={timesheets}
      />

      {/* Suppliers Section */}
      <ProjectSuppliersSection
        projectId={project.id}
        suppliers={project.suppliers || []}
        durationMonths={durationMonths}
        isEditable={isEditable}
        supplierActuals={supplierActuals}
      />

      {/* Materials Section */}
      <ProjectMaterialsSection
        projectId={project.id}
        materials={project.materials || []}
        durationMonths={durationMonths}
        isEditable={isEditable}
      />
    </div>
  );
}
