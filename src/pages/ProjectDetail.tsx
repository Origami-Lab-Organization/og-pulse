import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Edit, Lock, Trash2, MoreVertical, Archive } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ProjectHeader } from '@/components/projects/detail/ProjectHeader';
import { ProjectOverviewTab } from '@/components/projects/detail/ProjectOverviewTab';
import { ProjectPlanningOverviewTab } from '@/components/projects/detail/ProjectPlanningOverviewTab';
import { ProjectCostsTab } from '@/components/projects/detail/ProjectCostsTab';
import { ProjectFinancialTab } from '@/components/projects/detail/ProjectFinancialTab';
import { ProjectOKRsTab } from '@/components/projects/detail/ProjectOKRsTab';
import { ProjectStakeholdersTab } from '@/components/projects/detail/ProjectStakeholdersTab';
import { ProjectScheduleTab } from '@/components/projects/detail/ProjectScheduleTab';
import { ProjectExpectedResultTab } from '@/components/projects/detail/ProjectExpectedResultTab';
import { ProjectCommissionsTab } from '@/components/projects/detail/ProjectCommissionsTab';
import { ProjectActivitiesTab } from '@/components/projects/detail/ProjectActivitiesTab';
import { ProjectValueBookUpload } from '@/components/projects/detail/ProjectValueBookUpload';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { ProjectRemoveDialog } from '@/components/projects/ProjectRemoveDialog';
import { useProject, useUpdateProject, useDeleteProject, useArchiveProject } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { CreateProjectInput } from '@/types/project';
import { useState } from 'react';

const CANCELLATION_REASON_LABELS: Record<string, string> = {
  client_cancellation: 'Cancelamento pelo cliente',
  scope_change: 'Mudança de escopo',
  budget_constraint: 'Restrição orçamentária',
  strategic_decision: 'Decisão estratégica',
  other: 'Outro',
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTab = searchParams.get('tab') || 'overview';
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const isAdmin = employee?.isAdmin ?? false;
  const isManager = employee?.is_gerente ?? false;
  const { data: project, isLoading } = useProject(id);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const archiveProject = useArchiveProject();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const handleUpdate = (data: CreateProjectInput, justification?: string) => {
    if (!project) return;
    updateProject.mutate(
      { id: project.id, updates: data, justification },
      { onSuccess: () => setEditDialogOpen(false) }
    );
  };

  const handleDelete = () => {
    if (!project) return;
    deleteProject.mutate(
      { id: project.id, name: project.name, withCascade: true },
      { onSuccess: () => navigate('/portfolio') }
    );
  };

  const handleArchive = (reason: string, notes: string) => {
    if (!project) return;
    archiveProject.mutate(
      { id: project.id, reason, notes },
      { onSuccess: () => { setRemoveDialogOpen(false); navigate('/portfolio'); } }
    );
  };

  if (isLoading) {
    return (
      <AppLayout
        title="Carregando..."
        breadcrumbs={[
          { label: 'Portfólio', href: '/portfolio' },
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
          { label: 'Portfólio', href: '/portfolio' },
          { label: 'Não encontrado' },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">O projeto solicitado não foi encontrado.</p>
          <Button onClick={() => navigate('/portfolio')}>
            Voltar para Portfólio
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Determine if project is in planning phase
  const isPlanning = project.portfolio_stage === 'planning';
  const isCompleted = project.portfolio_stage === 'completed';
  const isCancelled = project.status === 'cancelled';
  const canEdit = isAdmin || !isCompleted;
  const isReadOnly = isCompleted && !isAdmin;
  const canManageInstallments = (isAdmin || isManager) && !isReadOnly;
  const isMember = project.members?.some((m) => m.employee_id === employee?.id) ?? false;
  const canViewActivities = isAdmin || isManager || isMember;
  const canCreateActivity = isAdmin || isManager;
  const showValueBook = !isPlanning;

  const headerActions = (canEdit || isAdmin) ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && (
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem
            onClick={() => setRemoveDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir / Arquivar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : undefined;

  return (
    <AppLayout
      title={project.name}
      hideHeader
    >
      <div className="space-y-4">
        <ProjectHeader project={project} actions={headerActions} />

        {isCancelled && (project as any).cancellation_reason && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
            <Badge variant="destructive">Cancelado</Badge>
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                Motivo: {CANCELLATION_REASON_LABELS[(project as any).cancellation_reason] || (project as any).cancellation_reason}
              </p>
              {(project as any).cancellation_notes && (
                <p className="text-muted-foreground">{(project as any).cancellation_notes}</p>
              )}
            </div>
          </div>
        )}

        {isReadOnly && !isCancelled && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Este projeto está concluído. Apenas administradores podem realizar alterações.</span>
          </div>
        )}

        <Tabs defaultValue={initialTab} className="w-full">
          <div className="overflow-x-auto">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="okrs">OKR</TabsTrigger>
            <TabsTrigger value="costs">Custos</TabsTrigger>
            <TabsTrigger value="commissions">Comissão</TabsTrigger>
            <TabsTrigger value="schedule">Cronograma</TabsTrigger>
            <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            {canViewActivities && (
              <TabsTrigger value="activities">Atividades</TabsTrigger>
            )}
            {showValueBook && (
              <TabsTrigger value="valuebook">Value Book</TabsTrigger>
            )}
          </TabsList>
          </div>

          <TabsContent value="overview" className="mt-6">
            {isPlanning ? (
              <ProjectPlanningOverviewTab project={project} />
            ) : (
              <ProjectOverviewTab project={project} />
            )}
          </TabsContent>

          <TabsContent value="okrs" className="mt-6">
            <ProjectOKRsTab project={project} isReadOnly={isReadOnly} />
          </TabsContent>

          <TabsContent value="costs" className="mt-6">
            <ProjectCostsTab
              project={project}
              isEditable={isPlanning && !isReadOnly}
              canEditActuals={!isPlanning && !isReadOnly && project.portfolio_stage !== 'completed'}
            />
          </TabsContent>

          <TabsContent value="commissions" className="mt-6">
            <ProjectCommissionsTab project={project} isReadOnly={isReadOnly} />
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <ProjectScheduleTab project={project} isReadOnly={isReadOnly} />
          </TabsContent>

          <TabsContent value="stakeholders" className="mt-6">
            <ProjectStakeholdersTab project={project} isReadOnly={isReadOnly} />
          </TabsContent>

          <TabsContent value="financial" className="mt-6">
            {isPlanning ? (
              <ProjectExpectedResultTab project={project} />
            ) : (
              <ProjectFinancialTab project={project} isReadOnly={isReadOnly} canManageInstallments={canManageInstallments} />
            )}
          </TabsContent>

          {canViewActivities && (
            <TabsContent value="activities" className="mt-6">
              <ProjectActivitiesTab project={project} isReadOnly={isReadOnly} />
            </TabsContent>
          )}

          {showValueBook && (
            <TabsContent value="valuebook" className="mt-6">
              <ProjectValueBookUpload
                projectId={project.id}
                currentUrl={project.value_book_url || null}
                isReadOnly={isReadOnly}
                onUploadSuccess={() => queryClient.invalidateQueries({ queryKey: ['project', id] })}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <ProjectFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
        onSubmit={handleUpdate}
        isSubmitting={updateProject.isPending}
        requireJustification={isCompleted && isAdmin}
      />

      {project && (
        <ProjectRemoveDialog
          open={removeDialogOpen}
          onOpenChange={setRemoveDialogOpen}
          projectId={project.id}
          projectName={project.name}
          onDelete={handleDelete}
          onArchive={handleArchive}
          isProcessing={deleteProject.isPending || archiveProject.isPending}
        />
      )}
    </AppLayout>
  );
}
