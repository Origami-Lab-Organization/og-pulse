import { useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectLaborSection } from '@/components/projects/detail/ProjectLaborSection';
import { ProjectSuppliersSection } from '@/components/projects/detail/ProjectSuppliersSection';
import { ProjectMaterialsSection } from '@/components/projects/detail/ProjectMaterialsSection';
import { ProjectReimbursementsSection } from '@/components/projects/detail/ProjectReimbursementsSection';
import { ProjectMonthlyCostChart } from '@/components/projects/detail/ProjectMonthlyCostChart';
import { ProjectWithRelations } from '@/types/project';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectSupplierMonths } from '@/hooks/useProjectSupplierMonths';
import { useTimesheetsByMembers } from '@/hooks/useProjectTimesheets';
import { useProjectSupplierActuals } from '@/hooks/useProjectSupplierActuals';
import { useBudget } from '@/hooks/useBudgets';
import { useSuppliers } from '@/hooks/useSuppliers';

import { addMonths, differenceInMonths, format, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProjectApprovedReimbursements } from '@/hooks/useReimbursements';

interface ProjectCostsTabProps {
  project: ProjectWithRelations;
  isEditable: boolean;
  canEditActuals?: boolean;
}

function MetricItem({
  label,
  value,
  subtitle,
  dotStatus,
}: {
  label: string;
  value: string;
  subtitle?: string;
  dotStatus?: 'ok' | 'alert';
}) {
  return (
    <div className="relative flex-1 min-w-0 px-5 py-4">
      {dotStatus === 'alert' && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-destructive" />
      )}
      {dotStatus === 'ok' && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500" />
      )}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground truncate">
        {label}
      </p>
      <p className="text-2xl font-bold mt-1.5 tabular-nums truncate">
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
      )}
    </div>
  );
}

export function ProjectCostsTab({ project, isEditable, canEditActuals = false }: ProjectCostsTabProps) {
  const formatCurrency = useMaskedCurrency();

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

  // Fetch approved reimbursements for this project
  const { data: approvedReimbursements = [], isLoading: reimbLoading } = useProjectApprovedReimbursements(project.id);

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
          const cost = mm.cost_per_hour != null ? Number(mm.cost_per_hour) : fallbackCost;
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
      const cost = ts.cost_per_hour != null
        ? Number(ts.cost_per_hour)
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

  // Desvio % (com sinal) — "—" quando planejado é zero
  const desvioText = useMemo(() => {
    if (totalPlanned === 0) return '—';
    const pct = ((totalActual - totalPlanned) / totalPlanned) * 100;
    const signal = pct >= 0 ? '+' : '';
    return `${signal}${pct.toFixed(1).replace('.', ',')}%`;
  }, [totalActual, totalPlanned]);

  const costDotStatus = totalActual === 0
    ? undefined
    : totalActual > totalPlanned ? 'alert' : 'ok';
  const devDotStatus = totalPlanned === 0
    ? undefined
    : totalActual > totalPlanned ? 'alert' : 'ok';

  // Categorias ativas: quantas das 4 categorias têm algum custo
  const categoriasAtivas = useMemo(() => {
    let count = 0;
    if (laborCostsActual > 0 || laborCostsPlanned > 0) count++;
    if (supplierCostsActual > 0 || supplierCostsPlanned > 0) count++;
    if (materialCostsActual > 0 || materialCostsPlanned > 0) count++;
    if (reimbursementCostsActual > 0) count++;
    return count;
  }, [laborCostsActual, laborCostsPlanned, supplierCostsActual, supplierCostsPlanned,
      materialCostsActual, materialCostsPlanned, reimbursementCostsActual]);

  const monthlyChartData = useMemo(() => {
    const projectStart = startOfMonth(parseISO(project.start_date));

    const memberCostFallback = new Map<string, number>();
    (project.members || []).forEach(m => memberCostFallback.set(m.id, getMemberHourlyCost(m)));

    const plannedLaborMap = new Map<number, number>();
    memberMonths.forEach(mm => {
      const cost = mm.cost_per_hour != null
        ? Number(mm.cost_per_hour)
        : (memberCostFallback.get(mm.project_member_id) || 0);
      plannedLaborMap.set(mm.month_number,
        (plannedLaborMap.get(mm.month_number) || 0) + cost * Number(mm.hours));
    });

    const plannedSuppMap = new Map<number, number>();
    supplierMonths.forEach(sm =>
      plannedSuppMap.set(sm.month_number,
        (plannedSuppMap.get(sm.month_number) || 0) + Number(sm.value)));

    const plannedMatMap = new Map<number, number>();
    (project.materials || []).forEach(m => {
      const mn = m.month_number || 1;
      plannedMatMap.set(mn, (plannedMatMap.get(mn) || 0) + Number(m.value));
    });

    const actualLaborMap = new Map<number, number>();
    timesheets.forEach(ts => {
      const mn = differenceInMonths(parseISO(ts.work_date), projectStart) + 1;
      if (mn < 1 || mn > durationMonths) return;
      const cost = ts.cost_per_hour != null
        ? Number(ts.cost_per_hour)
        : (memberCostFallback.get(ts.project_member_id) || 0);
      actualLaborMap.set(mn, (actualLaborMap.get(mn) || 0) + cost * Number(ts.hours));
    });

    const actualSuppMap = new Map<number, number>();
    supplierActuals.forEach(sa =>
      actualSuppMap.set(sa.month_number,
        (actualSuppMap.get(sa.month_number) || 0) + Number(sa.value)));

    const actualMatMap = new Map<number, number>();
    (project.materials || []).filter(m => m.is_realized).forEach(m => {
      let mn = m.month_number;
      if (!mn && m.purchase_date)
        mn = differenceInMonths(parseISO(m.purchase_date), projectStart) + 1;
      mn = Math.max(1, Math.min(mn || 1, durationMonths));
      actualMatMap.set(mn, (actualMatMap.get(mn) || 0) + Number(m.value));
    });

    const actualReimbMap = new Map<number, number>();
    approvedReimbursements.forEach(r => {
      const dateStr = r.paid_at || r.reviewed_at;
      if (!dateStr) return;
      const mn = differenceInMonths(parseISO(dateStr), projectStart) + 1;
      if (mn < 1 || mn > durationMonths) return;
      actualReimbMap.set(mn, (actualReimbMap.get(mn) || 0) + Number(r.total_amount));
    });

    return Array.from({ length: durationMonths }, (_, i) => {
      const mn = i + 1;
      const monthDate = addMonths(projectStart, i);
      const pLabor = plannedLaborMap.get(mn) || 0;
      const pSupp  = plannedSuppMap.get(mn) || 0;
      const pMat   = plannedMatMap.get(mn) || 0;
      const aLabor = actualLaborMap.get(mn) || 0;
      const aSupp  = actualSuppMap.get(mn) || 0;
      const aMat   = actualMatMap.get(mn) || 0;
      const aReimb = actualReimbMap.get(mn) || 0;
      return {
        month: format(monthDate, 'MMM yyyy', { locale: ptBR }),
        monthNum: mn,
        planned: pLabor + pSupp + pMat,
        realized: aLabor + aSupp + aMat + aReimb,
        breakdown: {
          planned:  { labor: pLabor, suppliers: pSupp,  materials: pMat  },
          realized: { labor: aLabor, suppliers: aSupp,  materials: aMat, reimbursements: aReimb },
        },
      };
    });
  }, [project, durationMonths, memberMonths, supplierMonths, timesheets,
      supplierActuals, approvedReimbursements, getMemberHourlyCost]);

  return (
    <div className="space-y-6">
      {/* Metrics bar — 5 KPIs */}
      <Card>
        <CardContent className="p-0">
          <div className="flex divide-x overflow-x-auto">
            <MetricItem
              label="Custo Planejado"
              value={formatCurrency(totalPlanned)}
            />
            <MetricItem
              label="Custo Realizado"
              value={formatCurrency(totalActual)}
              subtitle={totalPlanned > 0
                ? `${((totalActual / totalPlanned) * 100).toFixed(0)}% do plano`
                : undefined}
              dotStatus={costDotStatus}
            />
            <MetricItem
              label="Desvio"
              value={desvioText}
              dotStatus={devDotStatus}
            />
            <MetricItem
              label="Lançamentos"
              value={String(approvedReimbursements.length)}
              subtitle={`${approvedReimbursements.length} reembolso${approvedReimbursements.length !== 1 ? 's' : ''}`}
            />
            <MetricItem
              label="Categorias Ativas"
              value={String(categoriasAtivas)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Monthly consolidated chart */}
      <ProjectMonthlyCostChart
        data={monthlyChartData}
        isLoading={reimbLoading}
      />

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

      {/* Reimbursements Section — sempre somente leitura */}
      <ProjectReimbursementsSection reimbursements={approvedReimbursements} />
    </div>
  );
}
