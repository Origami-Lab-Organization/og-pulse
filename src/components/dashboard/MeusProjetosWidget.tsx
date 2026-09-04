import { useNavigate } from 'react-router-dom';
import { FolderKanban, Building2, ArrowRight, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyProjects } from '@/hooks/useMyProjects';
import { useAuth } from '@/contexts/AuthContext';
import { PORTFOLIO_COLUMNS, PORTFOLIO_STAGE_LABELS, PortfolioStage } from '@/types/portfolio';
import { cn } from '@/lib/utils';

function getStageBadgeClass(stage: string): string {
  const col = PORTFOLIO_COLUMNS.find((c) => c.id === stage);
  return col?.color ?? 'bg-muted text-muted-foreground';
}

export function MeusProjetosWidget() {
  const navigate = useNavigate();
  const { can } = useAuth();
  // Quem enxerga o portfólio abre a tela completa do projeto; quem não, abre a visão de
  // execução do consultor. É identidade de tela, decidida pela mesma capacidade que
  // governa o portfólio (ADR-0027) — o mesmo conjunto de antes.

  const { data: projects = [], isLoading } = useMyProjects();
  const active = projects.slice(0, 3);

  const handleProjectClick = (projectId: string) => {
    if (can('portfolio:ler')) navigate(`/projects/${projectId}`);
    else navigate(`/my-projects/${projectId}`);
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              Meus Projetos
            </CardTitle>
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            Meus Projetos
          </CardTitle>
          <div className="flex items-center gap-2">
            {projects.length > 0 && (
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {projects.length} ativo{projects.length !== 1 ? 's' : ''}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground gap-1 hover:text-foreground"
              onClick={() => navigate('/my-projects')}
            >
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-1.5">
        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Layers className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground">Sem projetos ativos no momento.</p>
          </div>
        ) : (
          active.map((project) => {
            const clientName = project.client.tradingName ?? project.client.companyName;
            const stageBadgeClass = getStageBadgeClass(project.portfolioStage);
            const stageLabel =
              PORTFOLIO_STAGE_LABELS[project.portfolioStage as PortfolioStage] ??
              project.portfolioStage;

            return (
              <div
                key={project.id}
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-md bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer group"
                onClick={() => handleProjectClick(project.id)}
                role="button"
                aria-label={project.name}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                    {project.name}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{clientName}</span>
                  </div>
                  <Badge className={cn('text-[10px] border-0 font-medium mt-1.5 pointer-events-none', stageBadgeClass)}>
                    {stageLabel}
                  </Badge>
                </div>
                <div className="text-right shrink-0 w-[80px]">
                  <p className="text-xs font-medium text-foreground tabular-nums">
                    {project.myHoursPerMonth}h/mês
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {project.myRole}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
