import { useState } from 'react';
import { Plus, CalendarDays, MoreHorizontal, Pencil, Trash2, CheckCircle2, Circle, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectWithRelations } from '@/types/project';
import { useProjectMilestones, useDeleteMilestone } from '@/hooks/useProjectMilestones';
import { ProjectMilestone, MILESTONE_STATUS_LABELS, MilestoneStatus } from '@/types/projectMilestone';
import { MilestoneFormDialog } from '@/components/projects/schedule/MilestoneFormDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Parse YYYY-MM-DD as local date to avoid timezone shifts
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

interface ProjectScheduleTabProps {
  project: ProjectWithRelations;
}

export function ProjectScheduleTab({ project }: ProjectScheduleTabProps) {
  const { data: milestones = [], isLoading } = useProjectMilestones(project.id);
  const deleteMilestone = useDeleteMilestone();

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
    if (confirm(`Deseja excluir o marco "${milestone.title}"?`)) {
      deleteMilestone.mutate({ id: milestone.id, projectId: project.id });
    }
  };

  const getStatusIcon = (status: MilestoneStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600 fill-green-100" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'delayed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: MilestoneStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600 text-white border-green-700';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'delayed':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando cronograma...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cronograma</h3>
          <p className="text-sm text-muted-foreground">
            Marcos e entregas planejadas do projeto
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Marco
        </Button>
      </div>

      {milestones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum marco cadastrado ainda.
              <br />
              Defina os marcos e entregas do projeto.
            </p>
            <Button variant="outline" className="mt-4" onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Marco
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Timeline visual */}
          <div className="hidden md:flex items-center justify-center gap-2 px-4 overflow-x-auto pb-4">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  {getStatusIcon(milestone.status)}
                  <div className="text-xs text-center mt-1 max-w-24 truncate">
                    {milestone.title}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>{format(parseLocalDate(milestone.start_date), 'dd/MM', { locale: ptBR })}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{format(parseLocalDate(milestone.end_date), 'dd/MM', { locale: ptBR })}</span>
                  </div>
                </div>
                {index < milestones.length - 1 && (
                  <div className={`h-0.5 w-16 mx-2 ${
                    milestone.status === 'completed' ? 'bg-green-500' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Lista de marcos */}
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <Card key={milestone.id} className="group cursor-pointer hover:border-primary/40 transition-colors" onClick={() => handleEdit(milestone)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="pt-1">
                      {getStatusIcon(milestone.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{milestone.title}</p>
                          {milestone.deliverables && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">Entregáveis:</span> {milestone.deliverables}
                            </p>
                          )}
                        </div>
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
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <CalendarDays className="h-4 w-4" />
                          <span>
                            Período: {format(parseLocalDate(milestone.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                            {' - '}
                            {format(parseLocalDate(milestone.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                        {milestone.completed_date && (
                          <div className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>
                              Concluído: {format(parseLocalDate(milestone.completed_date), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          </div>
                        )}
                        <Badge variant="outline" className={getStatusColor(milestone.status)}>
                          {MILESTONE_STATUS_LABELS[milestone.status]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
