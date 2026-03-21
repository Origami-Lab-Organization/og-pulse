import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Building2, Calendar, FolderKanban, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyProjectDetail } from '@/hooks/useMyProjectDetail';
import { useAuth } from '@/contexts/AuthContext';
import { PORTFOLIO_COLUMNS, PORTFOLIO_STAGE_LABELS, PortfolioStage } from '@/types/portfolio';
import { SERVICE_LINE_LABELS } from '@/types/lead';
import { MyProjectOverviewTab } from '@/components/my-projects/MyProjectOverviewTab';
import { MyProjectOKRsTab } from '@/components/my-projects/MyProjectOKRsTab';
import { MyProjectAllocationTab } from '@/components/my-projects/MyProjectAllocationTab';
import { MyProjectScheduleTab } from '@/components/my-projects/MyProjectScheduleTab';
import { MyProjectTeamTab } from '@/components/my-projects/MyProjectTeamTab';
import { MyProjectStakeholdersTab } from '@/components/my-projects/MyProjectStakeholdersTab';
import { cn } from '@/lib/utils';

function getStageBadgeClass(stage: string): string {
  const col = PORTFOLIO_COLUMNS.find((c) => c.id === stage);
  return col?.color ?? 'bg-muted text-muted-foreground';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

export default function MyProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { data: project, isLoading } = useMyProjectDetail(id);
  const isEmployeeOnly = !(employee?.is_gerente || employee?.isAdmin);

  if (isLoading) {
    return (
      <AppLayout
        title="Carregando..."
        breadcrumbs={[
          { label: 'Meus Projetos', href: '/my-projects' },
          { label: 'Carregando...' },
        ]}
      >
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout
        title="Projeto não encontrado"
        breadcrumbs={[
          { label: 'Meus Projetos', href: '/my-projects' },
          { label: 'Não encontrado' },
        ]}
      >
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <FolderKanban className="h-12 w-12 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-base font-medium">Projeto não encontrado</p>
            <p className="text-sm text-muted-foreground">
              Você não está alocado neste projeto ou ele não existe.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/my-projects')}>
            Voltar para Meus Projetos
          </Button>
        </div>
      </AppLayout>
    );
  }

  const clientName = project.client.tradingName ?? project.client.companyName;
  const serviceLabel = project.serviceLine
    ? (SERVICE_LINE_LABELS[project.serviceLine] ?? project.serviceLine)
    : null;
  const stageBadgeClass = getStageBadgeClass(project.portfolioStage);
  const stageLabel =
    PORTFOLIO_STAGE_LABELS[project.portfolioStage as PortfolioStage] ?? project.portfolioStage;

  const durationLabel = project.isContinuous
    ? 'Contínuo'
    : `${project.durationMonths} ${project.durationMonths === 1 ? 'mês' : 'meses'}`;

  return (
    <AppLayout
      title={project.name}
      breadcrumbs={[
        { label: 'Meus Projetos', href: '/my-projects' },
        { label: project.name },
      ]}
    >
      <div className="space-y-6">
        {/* Project header — 4a + 4b */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={cn('text-xs border-0', stageBadgeClass)}>{stageLabel}</Badge>
            {isEmployeeOnly && (
              <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                Somente leitura
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              {clientName}
            </span>
            {project.manager.nome && (
              <span className="flex items-center gap-1.5">
                GP: {project.manager.nome}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {durationLabel}
            </span>
            {serviceLabel && (
              <span className="flex items-center gap-1.5">{serviceLabel}</span>
            )}
          </div>

          {/* Minha participação — destaque */}
          {employee?.nome && (
            <div className="flex items-center gap-3 mt-1 p-2.5 rounded-lg bg-primary/5 border border-primary/10 text-sm">
              <Avatar className="h-7 w-7 border border-primary/20 shrink-0">
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {getInitials(employee.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium text-foreground truncate">{project.myRole}</span>
                <span className="text-muted-foreground shrink-0">·</span>
                <span className="text-muted-foreground shrink-0">{project.myHoursPerMonth}h/mês</span>
              </div>
              {isEmployeeOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 text-xs text-muted-foreground hover:text-primary gap-1 shrink-0"
                  onClick={() => navigate('/my-timesheet')}
                >
                  <Clock className="h-3 w-3" />
                  Lançar horas
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Tabs — 4e */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full overflow-x-auto flex flex-nowrap lg:inline-flex lg:w-auto">
            <TabsTrigger value="overview" className="shrink-0">Visão Geral</TabsTrigger>
            <TabsTrigger value="okrs" className="shrink-0">OKRs</TabsTrigger>
            <TabsTrigger value="allocation" className="shrink-0">Alocação</TabsTrigger>
            <TabsTrigger value="schedule" className="shrink-0">Cronograma</TabsTrigger>
            <TabsTrigger value="team" className="shrink-0">Equipe</TabsTrigger>
            <TabsTrigger value="stakeholders" className="shrink-0">Stakeholders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <MyProjectOverviewTab
              project={project}
              currentEmployeeId={employee?.id ?? ''}
            />
          </TabsContent>

          <TabsContent value="okrs" className="mt-6">
            <MyProjectOKRsTab okrs={project.okrs} />
          </TabsContent>

          <TabsContent value="allocation" className="mt-6">
            <MyProjectAllocationTab
              allocation={project.allocation}
              currentEmployeeName={employee?.nome ?? ''}
            />
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <MyProjectScheduleTab phases={project.schedulePhases} />
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <MyProjectTeamTab
              members={project.members}
              currentEmployeeId={employee?.id ?? ''}
            />
          </TabsContent>

          <TabsContent value="stakeholders" className="mt-6">
            <MyProjectStakeholdersTab stakeholders={project.stakeholders} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
