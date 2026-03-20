import { useParams, useNavigate } from 'react-router-dom';
import { Edit } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
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
import { ProjectValueBookUpload } from '@/components/projects/detail/ProjectValueBookUpload';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { CreateProjectInput } from '@/types/project';
import { useState } from 'react';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const isAdmin = employee?.isAdmin ?? false;
  const { data: project, isLoading } = useProject(id);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
      { id: project.id, name: project.name },
      { onSuccess: () => navigate('/projects') }
    );
  };

  if (isLoading) {
    return (
      <AppLayout
        title="Carregando..."
        breadcrumbs={[
          { label: 'Projetos', href: '/projects' },
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
          { label: 'Projetos', href: '/projects' },
          { label: 'Não encontrado' },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">O projeto solicitado não foi encontrado.</p>
          <Button onClick={() => navigate('/projects')}>
            Voltar para Projetos
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Determine if project is in planning phase
  const isPlanning = project.portfolio_stage === 'planning';
  const isCompleted = project.portfolio_stage === 'completed';
  const canEdit = isAdmin || !isCompleted;
  const isReadOnly = isCompleted && !isAdmin;
  const showValueBook = !isPlanning;

  return (
    <AppLayout
      title={project.name}
      breadcrumbs={[
        { label: 'Projetos', href: '/projects' },
        { label: project.name },
      ]}
      actions={
        canEdit ? (
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <ProjectHeader project={project} />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className={`grid w-full ${showValueBook ? 'grid-cols-8' : 'grid-cols-7'} lg:w-auto lg:inline-flex`}>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="okrs">OKR</TabsTrigger>
            <TabsTrigger value="costs">Custos</TabsTrigger>
            <TabsTrigger value="commissions">Comissão</TabsTrigger>
            <TabsTrigger value="schedule">Cronograma</TabsTrigger>
            <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            {showValueBook && (
              <TabsTrigger value="valuebook">Value Book</TabsTrigger>
            )}
          </TabsList>

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
              <ProjectFinancialTab project={project} />
            )}
          </TabsContent>

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

      <DeleteProjectDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        projectName={project.name}
        onConfirm={handleDelete}
        isDeleting={deleteProject.isPending}
      />
    </AppLayout>
  );
}
