import { useMemo, useCallback, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProjectMonthlyCostChart, CostCategoryTarget } from "@/components/projects/detail/ProjectMonthlyCostChart";
import { ProjectCostsLedger } from "@/components/projects/detail/ProjectCostsLedger";
import { LaborCostSection } from "@/components/projects/detail/costs/LaborCostSection";
import { useAuth } from "@/contexts/AuthContext";
import { useMaskedCurrency } from "@/contexts/HideValuesContext";

import { useProjectCostItems } from "@/hooks/useProjectCostItems";
import { useProjectCostSummary } from "@/hooks/useProjectCostSummary";
import { countActiveCostCategories } from "@/lib/projectMonthlyCosts";
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
  tooltip,
}: {
  label: string;
  value: string;
  subtitle?: string;
  dotStatus?: "ok" | "alert";
  tooltip?: string;
}) {
  return (
    <div className="relative flex-1 min-w-0 px-5 py-4">
      {dotStatus === "alert" && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-destructive" />
      )}
      {dotStatus === "ok" && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary-deep" />
      )}
      <p className="ol-label text-muted-foreground truncate flex items-center gap-1">
        {label}
        {tooltip && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 shrink-0 cursor-help text-muted-foreground/60" aria-label={tooltip} />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </p>
      <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums truncate mt-1">
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

  const { employee } = useAuth();
  const isAdmin = employee?.isAdmin ?? false;
  // Nota² do PRD: custo de MO por pessoa só para admin ou o GP do próprio projeto
  // (a aba é visível a qualquer manager, então gate aqui, não na rota).
  const canSeeLaborBreakdown = isAdmin || project.manager_id === employee?.id;

  const laborSectionRef = useRef<HTMLDivElement>(null);
  const ledgerRef = useRef<HTMLDivElement>(null);
  const [laborHighlighted, setLaborHighlighted] = useState(false);

  const handleCategoryClick = useCallback((target: CostCategoryTarget) => {
    const ref = target === "labor" && canSeeLaborBreakdown ? laborSectionRef : ledgerRef;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (target === "labor" && canSeeLaborBreakdown) {
      setLaborHighlighted(true);
      window.setTimeout(() => setLaborHighlighted(false), 1600);
    }
  }, [canSeeLaborBreakdown]);

  const { data: projectCosts = [] } = useProjectCostItems(project.id);
  // Cards, gráfico mensal e rosca: regra única do custo do projeto (US-0025/US-0026) — o
  // mesmo número da Visão Geral e do Financeiro, e a soma dos meses igual aos cards.
  const costSummary = useProjectCostSummary(project);
  const totalPlanned = costSummary.totalPlanned;
  const totalActual = costSummary.totalActual;

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

  const activeCategories = useMemo(
    () =>
      countActiveCostCategories(
        { planned: costSummary.laborPlanned, actual: costSummary.laborActual },
        projectCosts,
      ),
    [costSummary.laborActual, costSummary.laborPlanned, projectCosts],
  );

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
              tooltip="Inclui mão de obra e outros custos"
            />
            <MetricItem label="Desvio" value={desvioText} dotStatus={devDotStatus} />
            <MetricItem label="Lançamentos" value={String(projectCosts.length)} />
            <MetricItem label="Categorias Ativas" value={String(activeCategories)} />
          </div>
        </CardContent>
      </Card>

      <ProjectMonthlyCostChart
        months={costSummary.months}
        isLoading={costSummary.isLoading}
        onCategoryClick={handleCategoryClick}
      />

      {canSeeLaborBreakdown && (
        <LaborCostSection ref={laborSectionRef} project={project} highlighted={laborHighlighted} />
      )}

      <div ref={ledgerRef} className="scroll-mt-24">
        <ProjectCostsLedger
          projectId={project.id}
          costs={projectCosts}
          canManage={isEditable || canEditActuals}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
