import { useMemo, useCallback } from 'react';
import { Users, Truck, Package, TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
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
import { useSuppliers } from '@/hooks/useSuppliers';
import { differenceInMonths, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjectCostsTabProps {
  project: ProjectWithRelations;
  isEditable: boolean;
  canEditActuals?: boolean;
}

interface CostCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  plannedValue: number;
  actualValue: number;
  isTotal?: boolean;
  isPlanningMode?: boolean;
  budgetedValue?: number;
}

function CostCard({ 
  icon, 
  iconBg, 
  label, 
  plannedValue, 
  actualValue, 
  isTotal = false,
  isPlanningMode = false,
  budgetedValue = 0
}: CostCardProps) {
  // In planning mode: compare planned vs budgeted
  // In execution mode: compare actual vs planned
  const baseValue = isPlanningMode ? budgetedValue : plannedValue;
  const compareValue = isPlanningMode ? plannedValue : actualValue;
  
  const percentage = baseValue > 0 ? (compareValue / baseValue) * 100 : 0;
  const diff = compareValue - baseValue;
  
  // Determine trend: over budget (bad), under budget (good), or on track
  const isOverBudget = diff > 0 && baseValue > 0;
  const isUnderBudget = diff < 0 && compareValue > 0;
  
  return (
    <Card className={cn(isTotal && 'bg-primary/5')}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-2">
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconBg)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="mt-1">
              {/* Main value - highlighted */}
              <p className="text-lg font-bold leading-tight">
                {formatCurrency(compareValue)}
              </p>
              {/* Base value - smaller */}
              <p className="text-xs text-muted-foreground mt-0.5">
                de {formatCurrency(baseValue)}
              </p>
              {/* Trend indicator */}
              {baseValue > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {isOverBudget ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-destructive shrink-0" />
                      <span className="text-xs font-medium text-destructive">
                        {percentage.toFixed(0)}%
                      </span>
                    </>
                  ) : isUnderBudget ? (
                    <>
                      <TrendingDown className="h-3 w-3 text-green-600 shrink-0" />
                      <span className="text-xs font-medium text-green-600">
                        {percentage.toFixed(0)}%
                      </span>
                    </>
                  ) : compareValue === 0 ? (
                    <>
                      <Minus className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">0%</span>
                    </>
                  ) : (
                    <>
                      <Minus className="h-3 w-3 text-muted-foreground shrink-0" />
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

// Gross Margin Card Component for planning mode (Budgeted vs Planned)
// Gross Margin = Revenue - Taxes - Project Costs (no admin expenses)
interface MarginCardProps {
  contractValue: number;
  totalPlannedCost: number;
  totalBudgetedCost: number;
  taxesPercent: number;
}

function MarginCard({ 
  contractValue, 
  totalPlannedCost, 
  totalBudgetedCost,
  taxesPercent,
}: MarginCardProps) {
  // Calculate gross margin: Revenue - Taxes - Costs
  const taxes = contractValue * (taxesPercent / 100);
  const revenueAfterTaxes = contractValue - taxes;
  
  // Calculate gross margins
  const grossMarginPlanned = revenueAfterTaxes - totalPlannedCost;
  const grossMarginBudgeted = revenueAfterTaxes - totalBudgetedCost;
  
  // Calculate percentages based on contract value
  const plannedPercent = contractValue > 0 ? (grossMarginPlanned / contractValue) * 100 : 0;
  
  const isPlannedPositive = grossMarginPlanned >= 0;
  const isVariationPositive = grossMarginPlanned >= grossMarginBudgeted;
  
  return (
    <Card className="bg-primary/5">
      <CardContent className="pt-4">
        <div className="flex items-start gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">Margem Bruta</p>
            <div className="mt-1">
              {/* Planned margin - highlighted */}
              <p className={cn(
                "text-lg font-bold leading-tight",
                isPlannedPositive ? "text-green-600" : "text-destructive"
              )}>
                {formatCurrency(grossMarginPlanned)}
              </p>
              {/* Budgeted margin - smaller */}
              <p className="text-xs text-muted-foreground mt-0.5">
                de {formatCurrency(grossMarginBudgeted)} (orçado)
              </p>
              {/* Variation indicator */}
              <div className="flex items-center gap-1 mt-1">
                {isVariationPositive ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600 shrink-0" />
                    <span className="text-xs font-medium text-green-600">
                      {plannedPercent.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-destructive shrink-0" />
                    <span className="text-xs font-medium text-destructive">
                      {plannedPercent.toFixed(1)}%
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectCostsTab({ project, isEditable, canEditActuals = false }: ProjectCostsTabProps) {
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

  // Fetch available suppliers from registry
  const { data: availableSuppliers = [] } = useSuppliers();
  const memberIds = useMemo(() => (project.members || []).map((m) => m.id), [project.members]);
  const supplierIds = useMemo(() => (project.suppliers || []).map((s) => s.id), [project.suppliers]);

  // Fetch planned data
  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  const { data: supplierMonths = [] } = useProjectSupplierMonths(supplierIds);

  // Fetch actual data (timesheets and supplier actuals)
  const { data: timesheets = [] } = useTimesheetsByMembers(memberIds);
  const { data: supplierActuals = [] } = useProjectSupplierActuals(supplierIds);

  // Helper to get hourly cost for a member (real employee cost or budget hourly rate as fallback)
  const getMemberHourlyCost = useCallback((member: typeof project.members[0]) => {
    if (member.employee) {
      const totalMonthlyCost = member.employee.total_monthly_cost_estimated || 0;
      const workHours = member.employee.jornada_mensal || 168;
      return workHours > 0 ? totalMonthlyCost / workHours : 0;
    }
    // No employee: use the member's hourly_rate (from budget) as cost
    return Number((member as any).hourly_rate) || 0;
  }, []);

  // Calculate PLANNED labor costs using real employee cost or budget hourly rate
  const laborCostsPlanned = useMemo(() => {
    if (!project.members || project.members.length === 0) return 0;

    let total = 0;
    project.members.forEach((member) => {
      const hourlyCost = getMemberHourlyCost(member);

      // Sum PLANNED hours across all months
      const memberHours = memberMonths
        .filter((mm) => mm.project_member_id === member.id)
        .reduce((sum, mm) => sum + Number(mm.hours), 0);

      total += hourlyCost * memberHours;
    });

    return total;
  }, [project.members, memberMonths, getMemberHourlyCost]);

  // Calculate ACTUAL labor costs from timesheets
  const laborCostsActual = useMemo(() => {
    if (!project.members || project.members.length === 0) return 0;

    let total = 0;
    project.members.forEach((member) => {
      const hourlyCost = getMemberHourlyCost(member);

      // Sum ACTUAL hours from timesheets
      const actualHours = timesheets
        .filter((ts) => ts.project_member_id === member.id)
        .reduce((sum, ts) => sum + Number(ts.hours), 0);

      total += hourlyCost * actualHours;
    });

    return total;
  }, [project.members, timesheets, getMemberHourlyCost]);

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

  // Calculate BUDGETED costs from linked budget (for planning mode comparison)
  const budgetedCosts = useMemo(() => {
    if (!budget) return { labor: 0, suppliers: 0, materials: 0, total: 0 };
    
    // Labor: sum of (hours × hourly_rate) for each role
    const labor = (budget.roles || []).reduce((acc, role) => {
      const roleHours = (role.months || []).reduce((h, m) => h + Number(m.hours), 0);
      return acc + roleHours * Number(role.hourly_rate);
    }, 0);
    
    // Suppliers: monthly_value × duration_months
    const suppliers = (budget.suppliers || []).reduce((acc, s) => 
      acc + Number(s.monthly_value) * budget.duration_months, 0);
    
    // Materials: simple sum
    const materials = (budget.materials || []).reduce((acc, m) => 
      acc + Number(m.value), 0);
    
    return { labor, suppliers, materials, total: labor + suppliers + materials };
  }, [budget]);

  return (
    <div className="space-y-6">
      {/* Costs Summary */}
      <div className={cn("grid gap-3", isEditable ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
        <CostCard
          icon={<Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          label="Mão de Obra"
          plannedValue={laborCostsPlanned}
          actualValue={laborCostsActual}
          isPlanningMode={isEditable}
          budgetedValue={budgetedCosts.labor}
        />

        <CostCard
          icon={<Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          label="Fornecedores"
          plannedValue={supplierCostsPlanned}
          actualValue={supplierCostsActual}
          isPlanningMode={isEditable}
          budgetedValue={budgetedCosts.suppliers}
        />

        <CostCard
          icon={<Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          label="Materiais"
          plannedValue={materialCostsPlanned}
          actualValue={materialCostsActual}
          isPlanningMode={isEditable}
          budgetedValue={budgetedCosts.materials}
        />

        <CostCard
          icon={<Package className="h-5 w-5 text-primary" />}
          iconBg="bg-primary/20"
          label="Custo Total"
          plannedValue={totalPlanned}
          actualValue={totalActual}
          isTotal
          isPlanningMode={isEditable}
          budgetedValue={budgetedCosts.total}
        />

        {/* Margin Card - only shown in planning mode */}
        {isEditable && (
          <MarginCard
            contractValue={project.total_value}
            totalPlannedCost={totalPlanned}
            totalBudgetedCost={budgetedCosts.total}
            taxesPercent={budget?.taxes_percent || 0}
          />
        )}
      </div>

      {/* Labor Section */}
      <ProjectLaborSection
        projectId={project.id}
        members={project.members || []}
        durationMonths={durationMonths}
        isEditable={isEditable}
        budgetRoles={budget?.roles || []}
        timesheets={timesheets}
        projectStartDate={project.start_date}
      />

      {/* Suppliers Section */}
      <ProjectSuppliersSection
        projectId={project.id}
        suppliers={project.suppliers || []}
        durationMonths={durationMonths}
        isEditable={isEditable}
        canEditActuals={canEditActuals || isEditable}
        supplierActuals={supplierActuals}
        budgetSuppliers={budget?.suppliers || []}
        availableSuppliers={availableSuppliers}
      />

      {/* Materials Section */}
      <ProjectMaterialsSection
        projectId={project.id}
        materials={project.materials || []}
        durationMonths={durationMonths}
        isEditable={isEditable}
        canEditActuals={canEditActuals || isEditable}
      />
    </div>
  );
}
