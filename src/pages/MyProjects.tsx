import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Building2, Users, Calendar, Clock, Search, Eye, User } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMyProjects } from '@/hooks/useMyProjects';
import { useAuth } from '@/contexts/AuthContext';
import { PORTFOLIO_COLUMNS, PORTFOLIO_STAGE_LABELS, PortfolioStage } from '@/types/portfolio';
import { SERVICE_LINE_LABELS } from '@/types/lead';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

function getStageBadgeClass(stage: string): string {
  const col = PORTFOLIO_COLUMNS.find((c) => c.id === stage);
  return col?.color ?? 'bg-muted text-muted-foreground';
}

export default function MyProjects() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const isManager = employee?.is_gerente ?? false;
  const isAdmin = employee?.isAdmin ?? false;
  const isEmployeeOnly = !isManager && !isAdmin;
  const { data: projects = [], isLoading } = useMyProjects();

  const handleProjectClick = (projectId: string) => {
    if (isAdmin || isManager) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate(`/my-projects/${projectId}`);
    }
  };

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return projects.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.client.tradingName ?? p.client.companyName).toLowerCase().includes(q);
      const matchesStage = stageFilter === 'all' || p.portfolioStage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [projects, search, stageFilter]);

  const activeCount = useMemo(
    () => projects.filter((p) => p.status === 'active').length,
    [projects]
  );

  const totalHoursPerMonth = useMemo(
    () => projects.reduce((sum, p) => sum + p.myHoursPerMonth, 0),
    [projects]
  );

  const managerProjectsCount = useMemo(
    () => projects.filter((p) => p.manager?.nome === employee?.nome).length,
    [projects, employee?.nome]
  );

  const pageDescription = isEmployeeOnly
    ? 'Acompanhe os projetos em que você está alocado'
    : 'Visão pessoal dos projetos em que você participa como membro da equipe';

  if (isLoading) {
    return (
      <AppLayout title="Meus Projetos" description={pageDescription}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Meus Projetos" description={pageDescription}>
      <div className="space-y-6">
        {/* Summary cards — 3a */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-primary">{activeCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Projetos ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {totalHoursPerMonth}h
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Horas/mês alocadas</p>
            </CardContent>
          </Card>
          {isEmployeeOnly ? (
            <div className="col-span-2 md:col-span-1 flex items-center justify-end">
              <Badge variant="secondary" className="gap-1">
                <Eye className="h-3 w-3" />
                Somente leitura
              </Badge>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {managerProjectsCount}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Projetos como GP</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por projeto ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Todos os estágios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estágios</SelectItem>
              {PORTFOLIO_COLUMNS.map((col) => (
                <SelectItem key={col.id} value={col.id}>
                  {col.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Project grid / empty state — 3e */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            {search || stageFilter !== 'all' ? (
              <>
                <h3 className="text-lg font-medium">Nenhum projeto encontrado</h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                  Tente ajustar os filtros de busca.
                </p>
              </>
            ) : isEmployeeOnly ? (
              <>
                <h3 className="text-lg font-medium">Você ainda não está alocado em projetos</h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                  Quando um gerente de projetos alocar você em um projeto, ele aparecerá aqui automaticamente.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium">Nenhum projeto com sua participação</h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                  Você não está alocado como membro em nenhum projeto ativo. Projetos que você gerencia estão disponíveis em "Projetos".
                </p>
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={() => navigate('/projects')}
                >
                  <FolderKanban className="h-4 w-4" />
                  Ir para Projetos
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const clientName = project.client.tradingName ?? project.client.companyName;
              const hoursPercent =
                project.totalHoursPlanned > 0
                  ? Math.min(
                      100,
                      Math.round((project.totalHoursActual / project.totalHoursPlanned) * 100)
                    )
                  : 0;
              const stageBadgeClass = getStageBadgeClass(project.portfolioStage);
              const serviceLabel = project.serviceLine
                ? (SERVICE_LINE_LABELS[project.serviceLine] ?? project.serviceLine)
                : null;

              const barColorClass =
                hoursPercent > 90
                  ? 'bg-destructive'
                  : hoursPercent > 70
                  ? 'bg-amber-500'
                  : 'bg-primary';

              const tooltipText =
                hoursPercent > 90
                  ? `${hoursPercent}% executado — Atenção: próximo do limite`
                  : hoursPercent > 70
                  ? `${hoursPercent}% executado — Consumo elevado`
                  : `${hoursPercent}% executado — Dentro do planejado`;

              return (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <CardContent className="pt-4 pb-5 space-y-3">
                    {/* Stage badge + service line */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={cn('text-xs border-0', stageBadgeClass)}>
                        {PORTFOLIO_STAGE_LABELS[project.portfolioStage as PortfolioStage] ?? project.portfolioStage}
                      </Badge>
                      {serviceLabel && (
                        <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {serviceLabel}
                        </span>
                      )}
                    </div>

                    {/* Project name */}
                    <p className="font-medium text-base leading-snug line-clamp-2">{project.name}</p>

                    {/* Client */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{clientName}</span>
                    </div>

                    {/* Minha alocação — 3b */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                        <span className="font-medium text-sm truncate">{project.myRole}</span>
                        <span className="text-muted-foreground text-sm">·</span>
                        <span className="text-muted-foreground text-sm shrink-0">
                          {project.myHoursPerMonth}h/mês
                        </span>
                      </div>
                      {project.manager.nome && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          GP: {project.manager.nome.split(' ')[0]}
                        </span>
                      )}
                    </div>

                    {/* Horas do projeto com tooltip — 3b + 3c */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Horas do projeto
                        </span>
                        <span className="font-medium text-foreground">
                          {project.totalHoursActual}h / {project.totalHoursPlanned}h
                          {project.totalHoursPlanned > 0 && (
                            <span className="ml-1 text-muted-foreground font-normal">({hoursPercent}%)</span>
                          )}
                        </span>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden cursor-help">
                              <div
                                className={cn('h-full rounded-full transition-all', barColorClass)}
                                style={{ width: `${hoursPercent}%` }}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{tooltipText}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {/* Footer: period + members + atalho timesheet — 3d */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {formatDate(project.startDate)}
                        {project.endDate && ` → ${formatDate(project.endDate)}`}
                        {project.isContinuous && !project.endDate && ' · Contínuo'}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {project.membersCount}
                        </span>
                        {isEmployeeOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/my-timesheet');
                            }}
                          >
                            <Clock className="h-3 w-3" />
                            Lançar horas
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
