import { useParams, useNavigate } from 'react-router-dom';
import { Edit } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectHeader } from '@/components/projects/detail/ProjectHeader';
import { ProjectOverviewTab } from '@/components/projects/detail/ProjectOverviewTab';
import { ProjectCostsTab } from '@/components/projects/detail/ProjectCostsTab';
import { ProjectFinancialTab } from '@/components/projects/detail/ProjectFinancialTab';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { CreateProjectInput } from '@/types/project';
import { useState } from 'react';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleUpdate = (data: CreateProjectInput) => {
    if (!project) return;
    updateProject.mutate(
      { id: project.id, updates: data },
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

  const isPlanning = project.status === 'planning';

  return (
    <AppLayout
      title={project.name}
      breadcrumbs={[
        { label: 'Projetos', href: '/projects' },
        { label: project.name },
      ]}
      actions={
        <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>
      }
    >
      <div className="space-y-6">
        <ProjectHeader project={project} />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="costs">Custos</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="stakeholders" disabled>
              Stakeholders
            </TabsTrigger>
            <TabsTrigger value="schedule" disabled>
              Cronograma
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ProjectOverviewTab project={project} />
          </TabsContent>

          <TabsContent value="costs" className="mt-6">
            <ProjectCostsTab project={project} isEditable={isPlanning} />
          </TabsContent>

          <TabsContent value="financial" className="mt-6">
            <ProjectFinancialTab project={project} />
          </TabsContent>
        </Tabs>
      </div>

      <ProjectFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
        onSubmit={handleUpdate}
        isSubmitting={updateProject.isPending}
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
