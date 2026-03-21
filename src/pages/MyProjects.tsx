import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Building2, Users, Calendar, Clock, Search, User, AlertTriangle } from 'lucide-react';
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

  const totalHoursActual = useMemo(
    () => projects.reduce((sum, p) => sum + p.totalHoursActual, 0),
    [projects]
  );

  const pageDescription = isEmployeeOnly
    ? 'Acompanhe os projetos em que você está alocado'
    : 'Visão pessoal dos projetos em que você participa como membro da equipe';

  if (isLoading) {
    return (
      <AppLayout title="Meus Projetos" description={pageDescription}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-5 space-y-3">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Meus Projetos" description={pageDescription}>
      <div className="space-y-6">
        {/* Summary cards — 3a */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card aria-label={`${activeCount} projeto${activeCount !== 1 ? 's' : ''} ativo${activeCount !== 1 ? 's' : ''}`}>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-primary">{activeCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Projetos ativos</p>
            </CardContent>
          </Card>
          <Card aria-label={`${totalHoursPerMonth} horas por mês alocadas`}>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {totalHoursPerMonth}h
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Horas/mês alocadas</p>
            </CardContent>
          </Card>
          {isEmployeeOnly ? (
            <Card aria-label={`${totalHoursActual} horas lançadas no total`}>
              <CardContent className="pt-4 pb-4">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {totalHoursActual}h
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Horas lançadas (total)</p>
              </CardContent>
            </Card>
          ) : (
            <Card aria-label={`${managerProjectsCount} projeto${managerProjectsCount !== 1 ? 's' : ''} como gerente de projetos`}>
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
            {search || stageFilter !== 'all' ? (
              <>
                <div className="rounded-full bg-muted p-4 mb-4">
                  <FolderKanban className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Nenhum projeto encontrado</h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                  Tente ajustar os filtros de busca.
                </p>
              </>
            ) : isEmployeeOnly ? (
              <>
                <div className="rounded-full bg-muted p-3 mb-4">
                  <FolderKanban className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Você ainda não está alocado em projetos</h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                  Quando um gerente de projetos alocar você, seus projetos aparecerão aqui.
                </p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-muted p-4 mb-4">
                  <FolderKanban className="h-8 w-8 text-muted-foreground" />
                </div>
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

              const statusDotClass =
                project.status === 'active'
                  ? 'bg-green-500 animate-pulse'
                  : project.status === 'paused'
                  ? 'bg-amber-500'
                  : project.status === 'planning'
                  ? 'bg-blue-500'
                  : null;

              const tooltipText =
                hoursPercent > 90
                  ? `${hoursPercent}% executado — Atenção: próximo do limite`
                  : hoursPercent > 70
                  ? `${hoursPercent}% executado — Consumo elevado`
                  : `${hoursPercent}% executado — Dentro do planejado`;

              return (
                <Card
                  key={project.id}
                  role="article"
                  aria-label={project.name}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <CardContent className="pt-4 pb-5 space-y-3">
                    {/* Stage badge + service line + status dot */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={cn('text-xs border-0', stageBadgeClass)}>
                        {PORTFOLIO_STAGE_LABELS[project.portfolioStage as PortfolioStage] ?? project.portfolioStage}
                      </Badge>
                      <div className="flex items-center gap-2 shrink-0">
                        {serviceLabel && (
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {serviceLabel}
                          </span>
                        )}
                        {statusDotClass && (
                          <div className={cn('w-2 h-2 rounded-full', statusDotClass)} />
                        )}
                      </div>
                    </div>

                    {/* Project name */}
                    <p className="font-semibold text-base leading-snug line-clamp-2">{project.name}</p>

                    {/* Client */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{clientName}</span>
                    </div>

                    {/* Minha alocação — 3b */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">
                        <User className="h-3 w-3" />
                        {project.myRole}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {project.myHoursPerMonth}h/mês
                      </span>
                      {project.manager.nome && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="ml-auto text-[11px] text-muted-foreground/70 shrink-0 cursor-default">
                                GP: {project.manager.nome.split(' ')[0]}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Gerente: {project.manager.nome}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>

                    {/* Horas do projeto com tooltip — 3b + 3c */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-1.5 cursor-help">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Horas do projeto
                              </span>
                              {project.totalHoursPlanned > 0 && (
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  {hoursPercent > 90 && (
                                    <AlertTriangle className="h-3 w-3 text-destructive" />
                                  )}
                                  {hoursPercent}%
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                role="progressbar"
                                aria-valuenow={hoursPercent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                className={cn('h-full rounded-full transition-all', barColorClass)}
                                style={{ width: `${hoursPercent}%` }}
                              />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs font-medium">
                            {project.totalHoursActual}h / {project.totalHoursPlanned}h
                          </p>
                          <p className="text-xs text-muted-foreground">{tooltipText}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

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
                            aria-label={`Lançar horas no projeto ${project.name}`}
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
