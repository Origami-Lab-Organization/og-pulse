import { useNavigate } from 'react-router-dom';
import { FolderKanban, Building2, ArrowRight, User } from 'lucide-react';
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
  const { employee } = useAuth();
  const isManager = employee?.is_gerente ?? false;
  const isAdmin = employee?.isAdmin ?? false;

  const { data: projects = [], isLoading } = useMyProjects();
  const active = projects.slice(0, 3);

  const handleProjectClick = (projectId: string) => {
    if (isAdmin || isManager) navigate(`/projects/${projectId}`);
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
              <Badge variant="secondary" className="text-xs">
                {projects.length} ativo{projects.length !== 1 ? 's' : ''}
              </Badge>
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
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderKanban className="h-8 w-8 text-muted-foreground/40 mb-2" />
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
                className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleProjectClick(project.id)}
                role="button"
                aria-label={project.name}
              >
                <Badge className={cn('text-[10px] border-0 shrink-0', stageBadgeClass)}>
                  {stageLabel}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{project.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{clientName}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-foreground">{project.myHoursPerMonth}h/mês</p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground justify-end mt-0.5">
                    <User className="h-2.5 w-2.5" />
                    <span>{project.myRole}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
