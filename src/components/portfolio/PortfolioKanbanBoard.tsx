import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PortfolioColumn } from './PortfolioColumn';
import { PortfolioCard } from './PortfolioCard';
import { PortfolioProject, useUpdatePortfolioStage } from '@/hooks/usePortfolioProjects';
import { PORTFOLIO_COLUMNS, PortfolioStage } from '@/types/portfolio';
import { useProjectPlanningReadiness } from '@/hooks/useProjectPlanningReadiness';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CompletionDialogState {
  projectId: string;
  projectName: string;
}

interface PortfolioKanbanBoardProps {
  projects: PortfolioProject[];
  onRemoveProject?: (project: PortfolioProject) => void;
  hideValues?: boolean;
}

export function PortfolioKanbanBoard({ projects, onRemoveProject, hideValues }: PortfolioKanbanBoardProps) {
  const [activeProject, setActiveProject] = useState<PortfolioProject | null>(null);
  const [completionDialog, setCompletionDialog] = useState<CompletionDialogState | null>(null);
  const [completionDate, setCompletionDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const { employee } = useAuth();
  const isAdmin = employee?.isAdmin ?? false;

  const updateStage = useUpdatePortfolioStage();
  const { checkCompletionReadiness } = useProjectPlanningReadiness();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    })
  );

  const projectsByStage = useMemo(() => {
    const grouped: Record<PortfolioStage, PortfolioProject[]> = {
      planning: [],
      value_delivery: [],
      results_presentation: [],
      learning_case: [],
      completed: [],
    };

    projects.forEach((project) => {
      const stage = (project.portfolio_stage as PortfolioStage) || 'planning';
      if (grouped[stage]) {
        grouped[stage].push(project);
      } else {
        grouped['planning'].push(project);
      }
    });

    return grouped;
  }, [projects]);

  const handleDragStart = (event: DragStartEvent) => {
    const project = projects.find((p) => p.id === event.active.id);
    if (project) setActiveProject(project);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);

    if (!over) {
      toast({
        title: 'Movimento não realizado',
        description: 'Solte o card sobre uma coluna do portfólio para mover o projeto.',
        variant: 'destructive',
      });
      return;
    }

    const projectId = active.id as string;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    let targetStage: PortfolioStage | null = null;
    if (PORTFOLIO_COLUMNS.some((col) => col.id === over.id)) {
      targetStage = over.id as PortfolioStage;
    } else {
      const overProject = projects.find((p) => p.id === over.id);
      if (overProject) {
        targetStage = (overProject.portfolio_stage as PortfolioStage) || 'planning';
      }
    }

    if (!targetStage) {
      toast({
        title: 'Movimento não realizado',
        description: 'Não foi possível identificar a coluna de destino.',
        variant: 'destructive',
      });
      return;
    }

    if (targetStage === project.portfolio_stage) return;

    // Projetos concluídos só podem ser movidos por admins
    if (project.portfolio_stage === 'completed' && !isAdmin) {
      toast({
        title: 'Ação não permitida',
        description: 'Apenas administradores podem mover projetos concluídos.',
        variant: 'destructive',
      });
      return;
    }

    if (targetStage === 'completed') {
      setCompletionDate(format(new Date(), 'yyyy-MM-dd'));
      setCompletionDialog({
        projectId,
        projectName: project.name,
      });
      return;
    }

    updateStage.mutate({ projectId, newStage: targetStage });
  };

  const confirmCompletion = async () => {
    if (!completionDialog) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    if (!completionDate || completionDate > today) {
      toast({
        title: 'Data inválida',
        description: 'Informe uma data real de conclusão até hoje.',
        variant: 'destructive',
      });
      return;
    }

    const { ready, missing } = await checkCompletionReadiness(completionDialog.projectId);
    if (!ready) {
      toast({
        title: 'Projeto não pode ser concluído',
        description: `Itens pendentes: ${missing.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    updateStage.mutate({
      projectId: completionDialog.projectId,
      newStage: 'completed',
      completedDate: completionDate,
    });
    setCompletionDialog(null);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-[repeat(5,minmax(240px,1fr))] gap-4">
            {PORTFOLIO_COLUMNS.map((column) => (
              <PortfolioColumn
                key={column.id}
                id={column.id}
                label={column.label}
                color={column.color}
                projects={projectsByStage[column.id]}
                onRemoveProject={onRemoveProject}
                hideValues={hideValues}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeProject ? (
            <div className="rotate-3 scale-105">
              <PortfolioCard project={activeProject} hideValues={hideValues} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Conclusão */}
      <AlertDialog open={completionDialog !== null} onOpenChange={(open) => { if (!open) setCompletionDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Informe a data real de conclusão de <strong>{completionDialog?.projectName}</strong>.
              O projeto só será concluído se todas as etapas do cronograma estiverem concluídas e
              todos os pagamentos aplicáveis estiverem recebidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="completion-date">Data real de conclusão</Label>
            <Input
              id="completion-date"
              type="date"
              max={format(new Date(), 'yyyy-MM-dd')}
              value={completionDate}
              onChange={(event) => setCompletionDate(event.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCompletionDialog(null)}>Cancelar</AlertDialogCancel>
            <Button onClick={confirmCompletion} disabled={updateStage.isPending}>
              {updateStage.isPending ? 'Concluindo...' : 'Concluir projeto'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
