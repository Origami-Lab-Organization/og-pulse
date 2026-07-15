import { useMemo, useState } from 'react';
import {
  Plus,
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  Flag,
  Rocket,
  Layers,
  ClipboardCheck,
  LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ProjectWithRelations } from '@/types/project';
import { useProjectMilestones, useDeleteMilestone } from '@/hooks/useProjectMilestones';
import {
  ProjectMilestone,
  MILESTONE_STATUS_LABELS,
  MILESTONE_TYPE_LABELS,
  MilestoneStatus,
  MilestoneType,
  isInternalOnly,
} from '@/types/projectMilestone';
import { getEffectiveMilestoneStatus, parseLocalDate } from '@/lib/milestoneStatus';
import { MilestoneFormDialog } from '@/components/projects/schedule/MilestoneFormDialog';
import { ProjectRoadmapTimeline } from '@/components/projects/schedule/ProjectRoadmapTimeline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TYPE_ICONS: Record<MilestoneType, LucideIcon> = {
  marco: Flag,
  release: Rocket,
  epico: Layers,
  entrega_interna: ClipboardCheck,
};

function statusIcon(status: MilestoneStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-primary-deep" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-primary-deep/70" />;
    case 'delayed':
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
}

function statusBadgeClasses(status: MilestoneStatus) {
  switch (status) {
    case 'completed':
      return 'border-0 bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep';
    case 'in_progress':
      return 'border-0 bg-primary-deep/10 text-primary-deep hover:bg-primary-deep/10';
    case 'delayed':
      return 'border-0 bg-destructive/10 text-destructive hover:bg-destructive/10';
    default:
      return 'border-0 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100';
  }
}

interface ProjectRoadmapTabProps {
  project: ProjectWithRelations;
  isReadOnly?: boolean;
}

export function ProjectRoadmapTab({ project, isReadOnly = false }: ProjectRoadmapTabProps) {
  const { data: milestones = [], isLoading } = useProjectMilestones(project.id);
  const deleteMilestone = useDeleteMilestone();
  const today = useMemo(() => new Date(), []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestone | null>(null);

  const handleAdd = () => {
    setEditingMilestone(null);
    setDialogOpen(true);
  };

  const handleEdit = (milestone: ProjectMilestone) => {
    setEditingMilestone(milestone);
    setDialogOpen(true);
  };

  const handleDelete = (milestone: ProjectMilestone) => {
    if (confirm(`Deseja excluir "${milestone.title}"?`)) {
      deleteMilestone.mutate({ id: milestone.id, projectId: project.id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando roadmap...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Roadmap</h3>
          <p className="text-sm text-muted-foreground">
            Marcos, releases, épicos e entregas internas do projeto
          </p>
        </div>
        {!isReadOnly && (
          <Button onClick={handleAdd} className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90">
            <Plus className="mr-2 h-4 w-4" />
            Novo Item
          </Button>
        )}
      </div>

      {milestones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum item cadastrado ainda.
              <br />
              Defina marcos, releases, épicos e entregas do projeto.
            </p>
            {!isReadOnly && (
              <Button variant="outline" className="mt-4" onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <ProjectRoadmapTimeline
            items={milestones}
            projectStartDate={project.start_date}
            projectEndDate={project.end_date}
            today={today}
          />

          <div className="space-y-3">
            {milestones.map((milestone) => {
              const Icon = TYPE_ICONS[milestone.milestone_type] ?? Flag;
              const effectiveStatus = getEffectiveMilestoneStatus(milestone, today);
              return (
                <Card
                  key={milestone.id}
                  className={cn('group', !isReadOnly && 'cursor-pointer hover:border-primary-deep/40', 'transition-colors')}
                  onClick={() => !isReadOnly && handleEdit(milestone)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="pt-1">{statusIcon(effectiveStatus)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                              <p className="font-medium">{milestone.title}</p>
                              <span className="ol-label text-muted-foreground">
                                {MILESTONE_TYPE_LABELS[milestone.milestone_type]}
                              </span>
                              {isInternalOnly(milestone.milestone_type) && (
                                <span className="ol-label text-muted-foreground">· interno</span>
                              )}
                            </div>
                            {milestone.deliverables && (
                              <p className="text-sm text-muted-foreground mt-1">
                                <span className="font-medium">Entregáveis:</span> {milestone.deliverables}
                              </p>
                            )}
                          </div>
                          {!isReadOnly && (
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => handleEdit(milestone)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(milestone)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                              {format(parseLocalDate(milestone.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                              {milestone.end_date !== milestone.start_date && (
                                <> {' - '}{format(parseLocalDate(milestone.end_date), 'dd/MM/yyyy', { locale: ptBR })}</>
                              )}
                            </span>
                          </div>
                          {milestone.completed_date && (
                            <div className="flex items-center gap-1 text-sm text-primary-deep">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>
                                Concluído: {format(parseLocalDate(milestone.completed_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            </div>
                          )}
                          <Badge className={statusBadgeClasses(effectiveStatus)}>
                            {MILESTONE_STATUS_LABELS[effectiveStatus]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <MilestoneFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={project.id}
        milestone={editingMilestone}
      />
    </div>
  );
}
