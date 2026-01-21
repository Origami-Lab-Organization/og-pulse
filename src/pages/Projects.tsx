import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/data-table/DataTable';
import { ProjectStats } from '@/components/projects/ProjectStats';
import { createProjectColumns } from '@/components/projects/ProjectsTable';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { ProjectDetailDialog } from '@/components/projects/ProjectDetailDialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useProject,
} from '@/hooks/useProjects';
import { ProjectWithRelations, CreateProjectInput } from '@/types/project';

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);
  const [viewingProjectId, setViewingProjectId] = useState<string | undefined>(undefined);

  const { data: projects = [], isLoading } = useProjects();
  const { data: projectDetail } = useProject(viewingProjectId);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.client?.company_name.toLowerCase().includes(query) ||
        p.manager?.nome.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  // Get all installments for stats
  const allInstallments = useMemo(() => {
    return projects.flatMap((p) => p.installments || []);
  }, [projects]);

  const handleView = (project: ProjectWithRelations) => {
    setViewingProjectId(project.id);
    setDetailDialogOpen(true);
  };

  const handleEdit = (project: ProjectWithRelations) => {
    setSelectedProject(project);
    setFormDialogOpen(true);
  };

  const handleDelete = (project: ProjectWithRelations) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: CreateProjectInput) => {
    if (selectedProject) {
      updateProject.mutate(
        { id: selectedProject.id, updates: data },
        {
          onSuccess: () => {
            setFormDialogOpen(false);
            setSelectedProject(null);
          },
        }
      );
    } else {
      createProject.mutate(data, {
        onSuccess: () => {
          setFormDialogOpen(false);
        },
      });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedProject) {
      deleteProject.mutate(
        { id: selectedProject.id, name: selectedProject.name },
        {
          onSuccess: () => {
            setDeleteDialogOpen(false);
            setSelectedProject(null);
          },
        }
      );
    }
  };

  const columns = createProjectColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  return (
    <AppLayout
      title="Projetos"
      description="Gerencie os projetos da sua equipe"
      breadcrumbs={[{ label: 'Projetos' }]}
      actions={
        <Button onClick={() => setFormDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      }
    >
      <div className="space-y-6">
        <ProjectStats projects={projects} installments={allInstallments} />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Carregando projetos...</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredProjects}
            searchKey="name"
            searchValue={searchQuery}
          />
        )}
      </div>

      <ProjectFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) setSelectedProject(null);
        }}
        project={selectedProject}
        onSubmit={handleFormSubmit}
        isSubmitting={createProject.isPending || updateProject.isPending}
      />

      <ProjectDetailDialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) setViewingProjectId(undefined);
        }}
        project={projectDetail || null}
      />

      <DeleteProjectDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        projectName={selectedProject?.name || ''}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteProject.isPending}
      />
    </AppLayout>
  );
}
