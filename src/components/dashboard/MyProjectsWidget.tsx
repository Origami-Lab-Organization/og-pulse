import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Building2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProjects } from "@/hooks/useMyProjects";
import {
  PORTFOLIO_COLUMNS,
  PORTFOLIO_STAGE_LABELS,
  PortfolioStage
} from "@/types/portfolio";
import { cn } from "@/lib/utils";

// Fases ativas — mesmo filtro da página Meus Projetos (exclui planejamento/concluído)
const ACTIVE_STAGES: PortfolioStage[] = [
  "value_delivery",
  "results_presentation",
  "learning_case"
];

function getStageBadgeClass(stage: string): string {
  const col = PORTFOLIO_COLUMNS.find((c) => c.id === stage);
  return col?.color ?? "bg-muted text-muted-foreground";
}

export function MyProjectsWidget() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useMyProjects();

  const recentProjects = useMemo(
    () =>
      projects
        .filter((p) =>
          ACTIVE_STAGES.includes(p.portfolioStage as PortfolioStage)
        )
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .slice(0, 3),
    [projects]
  );

  if (isLoading) {
    return (
      <div className="w-full max-w-sm space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FolderKanban className="h-3.5 w-3.5" />
          Meus projetos
        </span>
        <button
          type="button"
          onClick={() => navigate("/my-projects")}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Ver todos
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {recentProjects.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm font-medium">
              Você ainda não está alocado em projetos
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Quando um gerente de projetos alocar você, seus projetos
              aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {recentProjects.map((project) => {
            const clientName =
              project.client.tradingName ?? project.client.companyName;
            return (
              <Card
                key={project.id}
                role="article"
                aria-label={project.name}
                className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all duration-200"
                onClick={() => navigate(`/my-projects/${project.id}`)}
              >
                <CardContent className="py-3 space-y-1.5 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm leading-snug line-clamp-1">
                      {project.name}
                    </p>
                    <Badge
                      className={cn(
                        "text-[10px] border-0 shrink-0",
                        getStageBadgeClass(project.portfolioStage)
                      )}
                    >
                      {PORTFOLIO_STAGE_LABELS[
                        project.portfolioStage as PortfolioStage
                      ] ?? project.portfolioStage}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{clientName}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
