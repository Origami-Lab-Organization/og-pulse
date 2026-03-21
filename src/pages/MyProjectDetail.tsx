import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Building2, Calendar, FolderKanban } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
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

export default function MyProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { data: project, isLoading } = useMyProjectDetail(id);

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
        {/* Project header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={cn('text-xs border-0', stageBadgeClass)}>{stageLabel}</Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Lock className="h-3 w-3" />
              Somente leitura
            </Badge>
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
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="okrs">OKRs</TabsTrigger>
            <TabsTrigger value="allocation">Alocação</TabsTrigger>
            <TabsTrigger value="schedule">Cronograma</TabsTrigger>
            <TabsTrigger value="team">Equipe</TabsTrigger>
            <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
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
