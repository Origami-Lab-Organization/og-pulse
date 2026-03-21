import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Building2, Users, Calendar, Clock, Search, Eye } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMyProjects } from '@/hooks/useMyProjects';
import { useAuth } from '@/contexts/AuthContext';
import { PORTFOLIO_COLUMNS, PORTFOLIO_STAGE_LABELS, PortfolioStage } from '@/types/portfolio';
import { SERVICE_LINE_LABELS } from '@/types/lead';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

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

  if (isLoading) {
    return (
      <AppLayout
        title="Meus Projetos"
        description="Acompanhe os projetos em que você está alocado"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Meus Projetos"
      description="Acompanhe os projetos em que você está alocado"
    >
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Projetos ativos
              </p>
              <p className="text-3xl font-bold text-primary">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Horas/mês alocadas
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {totalHoursPerMonth}h
              </p>
            </CardContent>
          </Card>
          {isEmployeeOnly && (
            <Card className="col-span-2 md:col-span-1 flex items-center justify-center">
              <CardContent className="pt-5 pb-4 flex items-center justify-center">
                <Badge variant="secondary" className="gap-1 text-sm px-3 py-1.5">
                  <Eye className="h-3 w-3" />
                  Somente leitura
                </Badge>
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

        {/* Project grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <FolderKanban className="h-12 w-12 text-muted-foreground/40" />
            {projects.length === 0 ? (
              <>
                <p className="text-base font-medium text-muted-foreground">
                  Você não está alocado em nenhum projeto ativo.
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Quando for incluído em um projeto, ele aparecerá aqui.
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-medium text-muted-foreground">Nenhum projeto encontrado</p>
                <p className="text-sm text-muted-foreground/70">
                  Ajuste os filtros para ver outros projetos.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const clientName = project.client.tradingName ?? project.client.companyName;
              const progressPercent =
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

                    {/* My role + manager */}
                    <div className="flex items-center justify-between gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {getInitials(project.myRole)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground truncate">
                                {project.myRole}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Meu papel neste projeto</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {project.manager.nome && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          GP: {project.manager.nome.split(' ')[0]}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Horas executadas
                        </span>
                        <span>
                          {project.totalHoursActual}h / {project.totalHoursPlanned}h
                          {project.totalHoursPlanned > 0 && (
                            <span className="ml-1 text-muted-foreground/60">({progressPercent}%)</span>
                          )}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full bg-primary transition-all',
                            progressPercent >= 90 && 'bg-amber-500',
                            progressPercent >= 100 && 'bg-destructive'
                          )}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer: period + members */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {formatDate(project.startDate)}
                        {project.endDate && ` → ${formatDate(project.endDate)}`}
                        {project.isContinuous && !project.endDate && ' · Contínuo'}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Users className="h-3.5 w-3.5" />
                        {project.membersCount}
                      </span>
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
