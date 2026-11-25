import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/data-table/DataTable';
import { ProjectStats } from '@/components/projects/ProjectStats';
import { createProjectColumns } from '@/components/projects/ProjectsTable';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { ProjectRemoveDialog } from '@/components/projects/ProjectRemoveDialog';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useArchiveProject,
} from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectWithRelations, CreateProjectInput } from '@/types/project';

export default function Projects() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const isAdmin = employee?.isAdmin ?? false;
  const [searchQuery, setSearchQuery] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);

  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const archiveProject = useArchiveProject();

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
    navigate(`/projects/${project.id}`);
  };

  const handleEdit = (project: ProjectWithRelations) => {
    setSelectedProject(project);
    setFormDialogOpen(true);
  };

  const handleDelete = (project: ProjectWithRelations) => {
    if (!isAdmin) return;
    setSelectedProject(project);
    setRemoveDialogOpen(true);
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
        { id: selectedProject.id, name: selectedProject.name, withCascade: true },
        {
          onSuccess: () => {
            setRemoveDialogOpen(false);
            setSelectedProject(null);
          },
        }
      );
    }
  };

  const handleConfirmArchive = (reason: string, notes: string) => {
    if (selectedProject) {
      archiveProject.mutate(
        { id: selectedProject.id, reason, notes },
        {
          onSuccess: () => {
            setRemoveDialogOpen(false);
            setSelectedProject(null);
          },
        }
      );
    }
  };

  const columns = createProjectColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: isAdmin ? handleDelete : undefined,
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
            onRowClick={handleView}
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

      {selectedProject && (
        <ProjectRemoveDialog
          open={removeDialogOpen}
          onOpenChange={setRemoveDialogOpen}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onDelete={handleConfirmDelete}
          onArchive={handleConfirmArchive}
          isProcessing={deleteProject.isPending || archiveProject.isPending}
        />
      )}
    </AppLayout>
  );
}
