import { useMemo, useCallback } from "react";
import { addMonths, differenceInMonths, format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectLaborSection } from "@/components/projects/detail/ProjectLaborSection";
import { ProjectReimbursementsSection } from "@/components/projects/detail/ProjectReimbursementsSection";
import { ProjectMonthlyCostChart } from "@/components/projects/detail/ProjectMonthlyCostChart";
import { ProjectCostsLedger } from "@/components/projects/detail/ProjectCostsLedger";
import { useAuth } from "@/contexts/AuthContext";
import { useMaskedCurrency } from "@/contexts/HideValuesContext";
import { useBudget } from "@/hooks/useBudgets";
import { useProjectMemberMonths } from "@/hooks/useProjectMemberMonths";
import { useProjectCostItems } from "@/hooks/useProjectCostItems";
import { useTimesheetsByMembers } from "@/hooks/useProjectTimesheets";
import { useProjectApprovedReimbursements } from "@/hooks/useReimbursements";
import { ProjectWithRelations } from "@/types/project";

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
  dotStatus?: "ok" | "alert";
}) {
  return (
    <div className="relative flex-1 min-w-0 px-5 py-4">
      {dotStatus === "alert" && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-destructive" />
      )}
      {dotStatus === "ok" && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary-deep" />
      )}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground truncate">
        {label}
      </p>
      <p className="text-2xl font-bold mt-1.5 tabular-nums truncate">
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function ProjectCostsTab({
  project,
  isEditable,
  canEditActuals = false,
}: ProjectCostsTabProps) {
  const formatCurrency = useMaskedCurrency();

  const durationMonths = useMemo(() => {
    const startDate = parseISO(project.start_date);
    if (project.is_continuous) return 12;
    if (project.end_date) {
      const endDate = parseISO(project.end_date);
      return Math.max(1, differenceInMonths(endDate, startDate) + 1);
    }
    return 1;
  }, [project.start_date, project.end_date, project.is_continuous]);

  const { data: budget } = useBudget(project.budget_id);
  const { employee } = useAuth();
  const isAdmin = employee?.isAdmin ?? false;

  const memberIds = useMemo(
    () => (project.members || []).map((member) => member.id),
    [project.members],
  );

  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  const { data: timesheets = [] } = useTimesheetsByMembers(memberIds);
  const { data: approvedReimbursements = [], isLoading: reimbursementsLoading } =
    useProjectApprovedReimbursements(project.id);
  const { data: projectCosts = [], isLoading: projectCostsLoading } =
    useProjectCostItems(project.id);

  const getMemberHourlyCost = useCallback(
    (member: (typeof project.members)[0]) => {
      if (member.employee) {
        const totalMonthlyCost =
          member.employee.total_monthly_cost_estimated || 0;
        const workHours = member.employee.jornada_mensal || 168;
        return workHours > 0 ? totalMonthlyCost / workHours : 0;
      }

      return Number((member as any).hourly_rate) || 0;
    },
    [],
  );

  const laborCostsPlanned = useMemo(() => {
    if (!project.members || project.members.length === 0) return 0;

    let total = 0;
    project.members.forEach((member) => {
      const fallbackCost = getMemberHourlyCost(member);
      memberMonths
        .filter((month) => month.project_member_id === member.id)
        .forEach((month) => {
          const cost =
            (month as any).cost_per_hour != null
              ? Number((month as any).cost_per_hour)
              : fallbackCost;
          total += cost * Number(month.hours);
        });
    });

    return total;
  }, [project.members, memberMonths, getMemberHourlyCost]);

  const laborCostsActual = useMemo(() => {
    if (!project.members || project.members.length === 0) return 0;

    const memberCostMap = new Map<string, number>();
    project.members.forEach((member) => {
      memberCostMap.set(member.id, getMemberHourlyCost(member));
    });

    return timesheets.reduce((total, timesheet) => {
      const cost =
        (timesheet as any).cost_per_hour != null
          ? Number((timesheet as any).cost_per_hour)
          : memberCostMap.get(timesheet.project_member_id) || 0;
      return total + cost * Number(timesheet.hours);
    }, 0);
  }, [project.members, timesheets, getMemberHourlyCost]);

  const costsPlannedBrl = useMemo(
    () =>
      projectCosts.reduce(
        (sum, cost) => sum + Number(cost.planned_amount_brl || 0),
        0,
      ),
    [projectCosts],
  );

  const costsActualBrl = useMemo(
    () =>
      projectCosts.reduce(
        (sum, cost) => sum + Number(cost.actual_amount_brl || 0),
        0,
      ),
    [projectCosts],
  );

  const reimbursementCostsActual = useMemo(
    () =>
      approvedReimbursements.reduce(
        (sum, reimbursement) => sum + Number(reimbursement.total_amount),
        0,
      ),
    [approvedReimbursements],
  );

  const totalPlanned = laborCostsPlanned + costsPlannedBrl;
  const totalActual =
    laborCostsActual + costsActualBrl + reimbursementCostsActual;

  const desvioText = useMemo(() => {
    if (totalPlanned === 0) return "-";
    const pct = ((totalActual - totalPlanned) / totalPlanned) * 100;
    const signal = pct >= 0 ? "+" : "";
    return `${signal}${pct.toFixed(1).replace(".", ",")}%`;
  }, [totalActual, totalPlanned]);

  const costDotStatus =
    totalActual === 0 ? undefined : totalActual > totalPlanned ? "alert" : "ok";
  const devDotStatus =
    totalPlanned === 0 ? undefined : totalActual > totalPlanned ? "alert" : "ok";

  const activeCategories = useMemo(() => {
    let count = 0;
    if (laborCostsActual > 0 || laborCostsPlanned > 0) count++;
    projectCosts.forEach((cost) => {
      if (
        Number(cost.planned_amount_brl || 0) > 0 ||
        Number(cost.actual_amount_brl || 0) > 0
      ) {
        count++;
      }
    });
    if (reimbursementCostsActual > 0) count++;
    return count;
  }, [
    laborCostsActual,
    laborCostsPlanned,
    projectCosts,
    reimbursementCostsActual,
  ]);

  const monthlyChartData = useMemo(() => {
    const projectStart = startOfMonth(parseISO(project.start_date));
    const memberCostFallback = new Map<string, number>();
    (project.members || []).forEach((member) =>
      memberCostFallback.set(member.id, getMemberHourlyCost(member)),
    );

    const plannedLaborMap = new Map<number, number>();
    memberMonths.forEach((month) => {
      const cost =
        (month as any).cost_per_hour != null
          ? Number((month as any).cost_per_hour)
          : memberCostFallback.get(month.project_member_id) || 0;
      plannedLaborMap.set(
        month.month_number,
        (plannedLaborMap.get(month.month_number) || 0) +
          cost * Number(month.hours),
      );
    });

    const actualLaborMap = new Map<number, number>();
    timesheets.forEach((timesheet) => {
      const monthNumber =
        differenceInMonths(parseISO(timesheet.work_date), projectStart) + 1;
      if (monthNumber < 1 || monthNumber > durationMonths) return;

      const cost =
        (timesheet as any).cost_per_hour != null
          ? Number((timesheet as any).cost_per_hour)
          : memberCostFallback.get(timesheet.project_member_id) || 0;
      actualLaborMap.set(
        monthNumber,
        (actualLaborMap.get(monthNumber) || 0) +
          cost * Number(timesheet.hours),
      );
    });

    const plannedExtraMap = new Map<number, number>();
    const plannedMaterialMap = new Map<number, number>();
    const actualExtraMap = new Map<number, number>();
    const actualMaterialMap = new Map<number, number>();

    projectCosts.forEach((cost) => {
      const isMaterial = cost.category === "material";
      const plannedMap = isMaterial ? plannedMaterialMap : plannedExtraMap;
      const actualMap = isMaterial ? actualMaterialMap : actualExtraMap;
      const isRecurring = Boolean((cost as any).is_recurring);

      if (isRecurring) {
        const startMonth = Number((cost as any).start_month || 1);
        const endMonth = Math.min(
          Number((cost as any).end_month || durationMonths),
          durationMonths,
        );
        const monthlyPlanned = Number(
          (cost as any).monthly_amount_brl ||
            (cost as any).monthly_amount ||
            0,
        );

        for (let monthNumber = startMonth; monthNumber <= endMonth; monthNumber++) {
          if (monthNumber < 1 || monthNumber > durationMonths) continue;
          plannedMap.set(
            monthNumber,
            (plannedMap.get(monthNumber) || 0) + monthlyPlanned,
          );
        }

        if (cost.actual_amount_brl != null) {
          actualMap.set(
            startMonth,
            (actualMap.get(startMonth) || 0) + Number(cost.actual_amount_brl),
          );
        }
        return;
      }

      const storedMonth = Number((cost as any).month_number || 0);
      const monthNumber =
        storedMonth ||
        (cost.cost_date
          ? differenceInMonths(parseISO(cost.cost_date), projectStart) + 1
          : 1);
      const clampedMonth = Math.max(1, Math.min(monthNumber, durationMonths));

      plannedMap.set(
        clampedMonth,
        (plannedMap.get(clampedMonth) || 0) +
          Number(cost.planned_amount_brl || 0),
      );
      if (cost.actual_amount_brl != null) {
        actualMap.set(
          clampedMonth,
          (actualMap.get(clampedMonth) || 0) +
            Number(cost.actual_amount_brl || 0),
        );
      }
    });

    const actualReimbursementMap = new Map<number, number>();
    approvedReimbursements.forEach((reimbursement) => {
      const dateStr = reimbursement.paid_at || reimbursement.reviewed_at;
      if (!dateStr) return;
      const monthNumber = differenceInMonths(parseISO(dateStr), projectStart) + 1;
      if (monthNumber < 1 || monthNumber > durationMonths) return;
      actualReimbursementMap.set(
        monthNumber,
        (actualReimbursementMap.get(monthNumber) || 0) +
          Number(reimbursement.total_amount),
      );
    });

    return Array.from({ length: durationMonths }, (_, index) => {
      const monthNumber = index + 1;
      const monthDate = addMonths(projectStart, index);
      const plannedLabor = plannedLaborMap.get(monthNumber) || 0;
      const plannedExtra = plannedExtraMap.get(monthNumber) || 0;
      const plannedMaterials = plannedMaterialMap.get(monthNumber) || 0;
      const actualLabor = actualLaborMap.get(monthNumber) || 0;
      const actualExtra = actualExtraMap.get(monthNumber) || 0;
      const actualMaterials = actualMaterialMap.get(monthNumber) || 0;
      const actualReimbursements =
        actualReimbursementMap.get(monthNumber) || 0;

      return {
        month: format(monthDate, "MMM yyyy", { locale: ptBR }),
        monthNum: monthNumber,
        planned: plannedLabor + plannedExtra + plannedMaterials,
        realized:
          actualLabor + actualExtra + actualMaterials + actualReimbursements,
        breakdown: {
          planned: {
            labor: plannedLabor,
            suppliers: plannedExtra,
            materials: plannedMaterials,
          },
          realized: {
            labor: actualLabor,
            suppliers: actualExtra,
            materials: actualMaterials,
            reimbursements: actualReimbursements,
          },
        },
      };
    });
  }, [
    approvedReimbursements,
    durationMonths,
    getMemberHourlyCost,
    memberMonths,
    project.members,
    project.start_date,
    projectCosts,
    timesheets,
  ]);

  return (
    <div className="space-y-6">
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
              subtitle={
                totalPlanned > 0
                  ? `${((totalActual / totalPlanned) * 100).toFixed(0)}% do plano`
                  : undefined
              }
              dotStatus={costDotStatus}
            />
            <MetricItem label="Desvio" value={desvioText} dotStatus={devDotStatus} />
            <MetricItem
              label="Lançamentos"
              value={String(projectCosts.length + approvedReimbursements.length)}
              subtitle={`${approvedReimbursements.length} reembolso${
                approvedReimbursements.length !== 1 ? "s" : ""
              }`}
            />
            <MetricItem label="Categorias Ativas" value={String(activeCategories)} />
          </div>
        </CardContent>
      </Card>

      <ProjectMonthlyCostChart
        data={monthlyChartData}
        isLoading={reimbursementsLoading || projectCostsLoading}
      />

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

      <ProjectReimbursementsSection reimbursements={approvedReimbursements} />

      <ProjectCostsLedger
        projectId={project.id}
        costs={projectCosts}
        canManage={isEditable || canEditActuals}
        isAdmin={isAdmin}
      />
    </div>
  );
}
