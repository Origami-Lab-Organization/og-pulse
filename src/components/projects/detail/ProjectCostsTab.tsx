import { useMemo, useCallback } from 'react';
import { Users, Truck, Package, DollarSign, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectLaborSection } from '@/components/projects/detail/ProjectLaborSection';
import { ProjectSuppliersSection } from '@/components/projects/detail/ProjectSuppliersSection';
import { ProjectMaterialsSection } from '@/components/projects/detail/ProjectMaterialsSection';
import { ProjectReimbursementsSection } from '@/components/projects/detail/ProjectReimbursementsSection';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectSupplierMonths } from '@/hooks/useProjectSupplierMonths';
import { useTimesheetsByMembers } from '@/hooks/useProjectTimesheets';
import { useProjectSupplierActuals } from '@/hooks/useProjectSupplierActuals';
import { useBudget } from '@/hooks/useBudgets';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { differenceInMonths, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useProjectApprovedReimbursements } from '@/hooks/useReimbursements';

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
  isPlanningMode?: boolean;
  budgetedValue?: number;
}

function CostCard({ 
  icon, 
  iconBg, 
  label, 
  plannedValue, 
  actualValue, 
  isPlanningMode = false,
  budgetedValue = 0
}: CostCardProps) {
  // In planning mode: show planned vs budgeted
  // In execution mode: show actual vs planned
  const baseValue = isPlanningMode ? budgetedValue : plannedValue;
  const compareValue = isPlanningMode ? plannedValue : actualValue;
  
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconBg)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {/* Valor principal (planejado ou realizado) */}
            <p className="text-lg font-semibold">
              {formatCurrency(compareValue)}
            </p>
            {/* Valor de referência (orçado ou planejado) */}
            <p className="text-xs text-muted-foreground">
              {isPlanningMode ? 'Orçado' : 'Planejado'}: {formatCurrency(baseValue)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Financial Summary Card - combines Total Cost and Gross Margin
interface FinancialSummaryCardProps {
  totalPlannedCost: number;
  totalBudgetedCost: number;
  contractValue: number;
  grossMarginTarget: number;
  isPlanningMode: boolean;
  totalActualCost: number;
}

function FinancialSummaryCard({ 
  totalPlannedCost, 
  totalBudgetedCost, 
  contractValue, 
  grossMarginTarget,
  isPlanningMode,
  totalActualCost,
}: FinancialSummaryCardProps) {
  // Determine which cost value to show based on mode
  const displayCost = isPlanningMode ? totalPlannedCost : totalActualCost;
  const baseDisplayCost = isPlanningMode ? totalBudgetedCost : totalPlannedCost;
  
  // Calculate gross margin: Revenue - Costs
  const grossMargin = contractValue - displayCost;
  const marginPercent = contractValue > 0 
    ? (grossMargin / contractValue) * 100 
    : 0;
  
  const gap = marginPercent - grossMarginTarget;
  const isPositive = gap >= 0;
  
  return (
    <Card className="bg-primary/5">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">Custo Total</p>
            <p className="text-lg font-semibold">
              {formatCurrency(displayCost)}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPlanningMode ? 'Orçado' : 'Planejado'}: {formatCurrency(baseDisplayCost)}
            </p>
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

  // Fetch financial settings for gross margin target
  const { data: financialSettings } = useFinancialSettings();

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

  // Fetch approved reimbursements for this project
  const { data: approvedReimbursements = [] } = useProjectApprovedReimbursements(project.id);




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

  // Calculate PLANNED labor costs using stored cost_per_hour per month when available
  const laborCostsPlanned = useMemo(() => {
    if (!project.members || project.members.length === 0) return 0;

    let total = 0;
    project.members.forEach((member) => {
      const fallbackCost = getMemberHourlyCost(member);
      memberMonths
        .filter((mm) => mm.project_member_id === member.id)
        .forEach((mm) => {
          const cost = (mm as any).cost_per_hour != null ? Number((mm as any).cost_per_hour) : fallbackCost;
          total += cost * Number(mm.hours);
        });
    });

    return total;
  }, [project.members, memberMonths, getMemberHourlyCost]);

  // Calculate ACTUAL labor costs using stored cost_per_hour per timesheet when available
  const laborCostsActual = useMemo(() => {
    if (!project.members || project.members.length === 0) return 0;

    // Build a map of member fallback costs
    const memberCostMap = new Map<string, number>();
    project.members.forEach((member) => {
      memberCostMap.set(member.id, getMemberHourlyCost(member));
    });

    return timesheets.reduce((total, ts) => {
      const cost = (ts as any).cost_per_hour != null
        ? Number((ts as any).cost_per_hour)
        : (memberCostMap.get(ts.project_member_id) || 0);
      return total + cost * Number(ts.hours);
    }, 0);
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

  // Calculate ACTUAL reimbursement costs (approved only, no planned value)
  const reimbursementCostsActual = useMemo(() => {
    return approvedReimbursements.reduce((sum, r) => sum + Number(r.total_amount), 0);
  }, [approvedReimbursements]);

  const totalPlanned = laborCostsPlanned + supplierCostsPlanned + materialCostsPlanned;
  const totalActual = laborCostsActual + supplierCostsActual + materialCostsActual + reimbursementCostsActual;

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
      {/* Costs Summary - 5 cards grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
          icon={<Receipt className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
          iconBg="bg-rose-100 dark:bg-rose-900/30"
          label="Reembolsos"
          plannedValue={0}
          actualValue={reimbursementCostsActual}
          isPlanningMode={false}
          budgetedValue={0}
        />

        <FinancialSummaryCard
          totalPlannedCost={totalPlanned}
          totalBudgetedCost={budgetedCosts.total}
          totalActualCost={totalActual}
          contractValue={project.total_value}
          grossMarginTarget={financialSettings?.gross_margin_target_percent || 0}
          isPlanningMode={isEditable}
        />
      </div>

      {/* Labor Section */}
      <ProjectLaborSection
        projectId={project.id}
        members={project.members || []}
        durationMonths={durationMonths}
        isEditable={isEditable || canEditActuals}
        budgetRoles={budget?.roles || []}
        timesheets={timesheets}
        projectStartDate={project.start_date}
        serviceLine={project.service_line}
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
        projectStartDate={project.start_date}
      />

      {/* Materials Section */}
      <ProjectMaterialsSection
        projectId={project.id}
        materials={project.materials || []}
        durationMonths={durationMonths}
        isEditable={isEditable}
        canEditActuals={canEditActuals || isEditable}
        projectStartDate={project.start_date}
      />

      {/* Reimbursements Section */}
      <ProjectReimbursementsSection reimbursements={approvedReimbursements} isEditable={canEditActuals || isEditable} />
    </div>
  );
}
