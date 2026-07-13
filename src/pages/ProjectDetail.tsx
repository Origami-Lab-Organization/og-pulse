import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Edit, Lock, Trash2, MoreVertical, Archive, Eye, EyeOff } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProjectHeader } from "@/components/projects/detail/ProjectHeader";
import { ProjectOverviewTab } from "@/components/projects/detail/ProjectOverviewTab";
import { ProjectPlanningOverviewTab } from "@/components/projects/detail/ProjectPlanningOverviewTab";
import { ProjectCostsTab } from "@/components/projects/detail/ProjectCostsTab";
import { ProjectFinancialTab } from "@/components/projects/detail/ProjectFinancialTab";
import { ProjectOKRsTab } from "@/components/projects/detail/ProjectOKRsTab";
import { ProjectStakeholdersTab } from "@/components/projects/detail/ProjectStakeholdersTab";
import { ProjectRoadmapTab } from "@/components/projects/detail/ProjectRoadmapTab";
import { ProjectExpectedResultTab } from "@/components/projects/detail/ProjectExpectedResultTab";
import { ProjectActivitiesTab } from "@/components/projects/detail/ProjectActivitiesTab";
import { EquipeTab } from "@/components/projects/detail/EquipeTab";
import { ProjectContractUpload } from "@/components/projects/ProjectContractUpload";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { ProjectRemoveDialog } from "@/components/projects/ProjectRemoveDialog";
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
  useArchiveProject,
} from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { HideValuesProvider, useHideValuesPreference } from "@/contexts/HideValuesContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateProjectInput } from "@/types/project";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Tab estilo underline para o detalhe do projeto. Anula o visual de pílula do
// TabsTrigger base (bg/shadow) e aplica sublinhado verde escuro no estado ativo.
const projectTabClass =
  "relative rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary-deep data-[state=active]:bg-transparent data-[state=active]:text-primary-deep data-[state=active]:shadow-none";

const CANCELLATION_REASON_LABELS: Record<string, string> = {
  client_cancellation: "Cancelamento pelo cliente",
  scope_change: "Mudança de escopo",
  budget_constraint: "Restrição orçamentária",
  strategic_decision: "Decisão estratégica",
  other: "Outro",
};

type ProjectCancellationFields = {
  cancellation_reason?: string | null;
  cancellation_notes?: string | null;
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { employee, loading: authLoading } = useAuth();
  const isAdmin = employee?.isAdmin ?? false;
  const isManager = employee?.is_gerente ?? false;
  const canAccessFullProject = isAdmin || isManager;
  const initialTab = canAccessFullProject
    ? searchParams.get("tab") || "overview"
    : "activities";
  const { data: project, isLoading } = useProject(id);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const archiveProject = useArchiveProject();

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [hideValues, setHideValues] = useHideValuesPreference();

  const handleUpdate = (data: CreateProjectInput, justification?: string) => {
    if (!project) return;
    updateProject.mutate(
      { id: project.id, updates: data, justification },
      { onSuccess: () => setEditDialogOpen(false) },
    );
  };

  const handleDelete = () => {
    if (!project) return;
    deleteProject.mutate(
      { id: project.id, name: project.name, withCascade: true },
      { onSuccess: () => navigate("/projetos") },
    );
  };

  const handleArchive = (reason: string, notes: string) => {
    if (!project) return;
    archiveProject.mutate(
      { id: project.id, reason, notes },
      {
        onSuccess: () => {
          setRemoveDialogOpen(false);
          navigate("/projetos");
        },
      },
    );
  };

  if (authLoading || isLoading) {
    return (
      <AppLayout
        title="Carregando..."
        breadcrumbs={[
          { label: "Portfólio", href: "/projetos" },
          { label: "Carregando..." },
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
          { label: "Portfólio", href: "/projetos" },
          { label: "Não encontrado" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">
            O projeto solicitado não foi encontrado.
          </p>
          <Button onClick={() => navigate("/projetos")}>
            Voltar para Portfólio
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Determine if project is in planning phase
  const isPlanning = project.portfolio_stage === "planning";
  const isCompleted = project.portfolio_stage === "completed";
  const isCancelled = project.status === "cancelled";
  const isProjectManager = project.manager_id === employee?.id;
  const canManageProject = isAdmin || isProjectManager;
  // Seguindo .harness/patterns/security.md e OWASP A01: gerente ve o tenant,
  // mas escrita no detalhe depende do projeto especifico.
  const canEdit = canManageProject && (isAdmin || !isCompleted);
  const isReadOnly = !canManageProject || (isCompleted && !isAdmin);
  const canManageInstallments = canManageProject && !isReadOnly;
  const isMember =
    project.members?.some((m) => m.employee_id === employee?.id) ?? false;
  const canViewActivities =
    isAdmin || isManager || isProjectManager || isMember;
  const cancellation = project as typeof project & ProjectCancellationFields;

  const showMenu = canAccessFullProject && (canEdit || isAdmin);
  const showHideValuesToggle = canAccessFullProject;

  const headerActions =
    showMenu || showHideValuesToggle ? (
      <div className="flex items-center gap-2">
        {showHideValuesToggle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setHideValues((v) => !v)}
              >
                {hideValues ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hideValues ? "Mostrar valores" : "Ocultar valores"}
            </TooltipContent>
          </Tooltip>
        )}
        {showMenu && (
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
        )}
      </div>
    ) : undefined;

  if (!canAccessFullProject && !canViewActivities) {
    return (
      <AppLayout title={project.name} hideHeader>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">
            Você não tem acesso a este projeto.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={project.name} hideHeader>
      <HideValuesProvider value={hideValues}>
        <div className="space-y-4">
          <ProjectHeader project={project} />

        {isCancelled && cancellation.cancellation_reason && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
            <Badge variant="destructive">Cancelado</Badge>
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                Motivo:{" "}
                {CANCELLATION_REASON_LABELS[
                  cancellation.cancellation_reason
                ] || cancellation.cancellation_reason}
              </p>
              {cancellation.cancellation_notes && (
                <p className="text-muted-foreground">
                  {cancellation.cancellation_notes}
                </p>
              )}
            </div>
          </div>
        )}

        {isReadOnly && !isCancelled && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              Este projeto está concluído. Apenas administradores podem realizar
              alterações.
            </span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Navegação estilo underline (modelo de design): sem pílula, tab
              ativa sublinhada no verde escuro da marca. As ações (ocultar
              valores / menu) ficam alinhadas à direita, na mesma linha. */}
          <div className="flex items-end justify-between gap-3 border-b border-border">
            <div className="min-w-0 flex-1 overflow-x-auto">
              <TabsList className="inline-flex h-auto w-max items-stretch gap-1 rounded-none bg-transparent p-0 text-muted-foreground">
                {canAccessFullProject && (
                  <>
                    <TabsTrigger value="overview" className={projectTabClass}>Visão Geral</TabsTrigger>
                    <TabsTrigger value="planning" className={projectTabClass}>Planejamento</TabsTrigger>
                    <TabsTrigger value="okrs" className={projectTabClass}>Objetivos</TabsTrigger>
                    <TabsTrigger value="roadmap" className={projectTabClass}>Roadmap</TabsTrigger>
                    <TabsTrigger value="team" className={projectTabClass}>Equipe</TabsTrigger>
                    <TabsTrigger value="costs" className={projectTabClass}>Custos</TabsTrigger>
                    <TabsTrigger value="financial" className={projectTabClass}>Financeiro</TabsTrigger>
                    <TabsTrigger value="stakeholders" className={projectTabClass}>Stakeholders</TabsTrigger>
                  </>
                )}
                {canViewActivities && (
                  <>
                    <TabsTrigger value="activities" className={projectTabClass}>Atividades</TabsTrigger>
                    <TabsTrigger value="files" className={projectTabClass}>Arquivos</TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>
            {headerActions && (
              <div className="shrink-0 self-center pb-1">{headerActions}</div>
            )}
          </div>

          {canAccessFullProject && (
            <>
              <TabsContent value="overview" className="mt-6">
                <ProjectOverviewTab project={project} />
              </TabsContent>

              <TabsContent value="planning" className="mt-6">
                <ProjectPlanningOverviewTab
                  project={project}
                  canManageProject={canManageProject}
                  onNavigateToTab={setActiveTab}
                />
              </TabsContent>

              <TabsContent value="okrs" className="mt-6">
                <ProjectOKRsTab project={project} isReadOnly={isReadOnly} />
              </TabsContent>

              <TabsContent value="roadmap" className="mt-6">
                <ProjectRoadmapTab project={project} isReadOnly={isReadOnly} />
              </TabsContent>

              <TabsContent value="team" className="mt-6">
                <EquipeTab project={project} isReadOnly={isReadOnly} />
              </TabsContent>

              <TabsContent value="costs" className="mt-6">
                <ProjectCostsTab
                  project={project}
                  isEditable={isPlanning && !isReadOnly}
                  canEditActuals={
                    !isPlanning &&
                    !isReadOnly &&
                    project.portfolio_stage !== "completed"
                  }
                />
              </TabsContent>

              <TabsContent value="financial" className="mt-6">
                {isPlanning ? (
                  <ProjectExpectedResultTab project={project} />
                ) : (
                  <ProjectFinancialTab
                    project={project}
                    isReadOnly={isReadOnly}
                    canManageInstallments={canManageInstallments}
                  />
                )}
              </TabsContent>

              <TabsContent value="stakeholders" className="mt-6">
                <ProjectStakeholdersTab
                  project={project}
                  isReadOnly={isReadOnly}
                />
              </TabsContent>
            </>
          )}

          {canViewActivities && (
			  <>
				<TabsContent value="activities" className="mt-6">
				  <ProjectActivitiesTab project={project} isReadOnly={isReadOnly} />
				</TabsContent>
				<TabsContent value="files" className="mt-6">
				  <ProjectContractUpload
					projectId={project.id}
					currentPath={project.contract_url}
					isReadOnly={isReadOnly}
					onUploadSuccess={() =>
					  queryClient.invalidateQueries({ queryKey: ["project", id] })
					}
				  />
				</TabsContent>
			  </>
          )}
        </Tabs>
      </div>

      {canAccessFullProject && (
        <>
          <ProjectFormDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            project={project}
            onSubmit={handleUpdate}
            isSubmitting={updateProject.isPending}
            requireJustification={isCompleted && isAdmin}
            canChangeManager={isAdmin}
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
        </>
      )}
      </HideValuesProvider>
    </AppLayout>
  );
}
