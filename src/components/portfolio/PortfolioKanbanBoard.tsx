import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PortfolioColumn } from './PortfolioColumn';
import { PortfolioCard } from './PortfolioCard';
import { PortfolioProject, useUpdatePortfolioStage } from '@/hooks/usePortfolioProjects';
import { PORTFOLIO_COLUMNS, PORTFOLIO_STAGE_LABELS, PortfolioStage } from '@/types/portfolio';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useProjectPlanningReadiness } from '@/hooks/useProjectPlanningReadiness';
import { useToast } from '@/hooks/use-toast';

const STAGE_ORDER: PortfolioStage[] = [
  'planning',
  'value_delivery',
  'results_presentation',
  'learning_case',
  'completed',
];

interface RetroDialogState {
  projectId: string;
  targetStage: PortfolioStage;
  projectName: string;
  currentLabel: string;
  targetLabel: string;
}

interface CompletionDialogState {
  projectId: string;
  pendingCount: number;
  totalCount: number;
}

interface PortfolioKanbanBoardProps {
  projects: PortfolioProject[];
}

export function PortfolioKanbanBoard({ projects }: PortfolioKanbanBoardProps) {
  const [activeProject, setActiveProject] = useState<PortfolioProject | null>(null);
  const [retroDialog, setRetroDialog] = useState<RetroDialogState | null>(null);
  const [retroJustification, setRetroJustification] = useState('');
  const [completionDialog, setCompletionDialog] = useState<CompletionDialogState | null>(null);

  const updateStage = useUpdatePortfolioStage();
  const {
    checkReadiness,
    checkDeliveryToResultsReadiness,
    checkResultsToLearningReadiness,
    checkCompletionReadiness,
  } = useProjectPlanningReadiness();
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

    if (!over) return;

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

    if (!targetStage || targetStage === project.portfolio_stage) return;

    const currentIndex = STAGE_ORDER.indexOf(project.portfolio_stage as PortfolioStage);
    const targetIndex = STAGE_ORDER.indexOf(targetStage);

    // ── Retrocesso: abrir dialog de justificativa ─────────────────────
    if (targetIndex < currentIndex) {
      setRetroJustification('');
      setRetroDialog({
        projectId,
        targetStage,
        projectName: project.name,
        currentLabel: PORTFOLIO_STAGE_LABELS[project.portfolio_stage as PortfolioStage],
        targetLabel: PORTFOLIO_STAGE_LABELS[targetStage],
      });
      return;
    }

    // ── Salto de mais de uma coluna: bloquear ─────────────────────────
    if (targetIndex > currentIndex + 1) {
      const nextStage = STAGE_ORDER[currentIndex + 1];
      toast({
        title: 'Movimento não permitido',
        description: `O projeto deve passar por cada etapa sequencialmente. Mova para "${PORTFOLIO_STAGE_LABELS[nextStage]}" primeiro.`,
        variant: 'destructive',
      });
      return;
    }

    // ── Avanço de uma coluna: validações específicas ──────────────────
    await handleForwardTransition(projectId, project.name, project.portfolio_stage as PortfolioStage, targetStage);
  };

  const handleForwardTransition = async (
    projectId: string,
    projectName: string,
    from: PortfolioStage,
    to: PortfolioStage
  ) => {
    if (from === 'planning' && to === 'value_delivery') {
      const { ready, missing } = await checkReadiness(projectId);
      if (!ready) {
        toast({
          title: 'Projeto não pode ser movido',
          description: `Itens pendentes: ${missing.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }
    }

    if (from === 'value_delivery' && to === 'results_presentation') {
      const { ready, missing } = await checkDeliveryToResultsReadiness(projectId);
      if (!ready) {
        toast({
          title: 'Projeto não pode ser movido',
          description: `Itens pendentes: ${missing.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }
    }

    if (from === 'results_presentation' && to === 'learning_case') {
      await checkResultsToLearningReadiness(projectId);
      // always passes — no validation required for now
    }

    if (from === 'learning_case' && to === 'completed') {
      const { ready, pendingCount, totalCount } = await checkCompletionReadiness(projectId);
      if (!ready) {
        setCompletionDialog({ projectId, pendingCount, totalCount });
        return;
      }
    }

    updateStage.mutate({ projectId, newStage: to });
  };

  const confirmRetro = () => {
    if (!retroDialog || retroJustification.trim().length < 10) return;
    console.log(
      `[Retrocesso] Projeto "${retroDialog.projectName}": ${retroDialog.currentLabel} → ${retroDialog.targetLabel}. Motivo: ${retroJustification.trim()}`
    );
    updateStage.mutate({ projectId: retroDialog.projectId, newStage: retroDialog.targetStage });
    setRetroDialog(null);
    setRetroJustification('');
  };

  const confirmCompletion = () => {
    if (!completionDialog) return;
    updateStage.mutate({ projectId: completionDialog.projectId, newStage: 'completed' });
    setCompletionDialog(null);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="w-full h-full">
          <div className="grid grid-cols-5 gap-4 p-4 pb-6 min-h-full">
            {PORTFOLIO_COLUMNS.map((column) => (
              <PortfolioColumn
                key={column.id}
                id={column.id}
                label={column.label}
                color={column.color}
                projects={projectsByStage[column.id]}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay>
          {activeProject ? (
            <div className="rotate-3 scale-105">
              <PortfolioCard project={activeProject} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Retrocesso dialog */}
      <AlertDialog open={retroDialog !== null} onOpenChange={(open) => { if (!open) setRetroDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retroceder projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está movendo o projeto <strong>{retroDialog?.projectName}</strong> de{' '}
              <strong>{retroDialog?.currentLabel}</strong> para{' '}
              <strong>{retroDialog?.targetLabel}</strong>. Isso indica que o projeto precisa
              retornar a uma etapa anterior.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="retro-justification">Informe o motivo do retrocesso:</Label>
            <Textarea
              id="retro-justification"
              placeholder="Descreva o motivo..."
              value={retroJustification}
              onChange={(e) => setRetroJustification(e.target.value)}
              rows={3}
            />
            {retroJustification.length > 0 && retroJustification.trim().length < 10 && (
              <p className="text-xs text-destructive">Mínimo de 10 caracteres.</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setRetroDialog(null); setRetroJustification(''); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={retroJustification.trim().length < 10}
              onClick={confirmRetro}
            >
              Confirmar retrocesso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conclusão com parcelas pendentes */}
      <AlertDialog open={completionDialog !== null} onOpenChange={(open) => { if (!open) setCompletionDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Parcelas pendentes</AlertDialogTitle>
            <AlertDialogDescription>
              Existem <strong>{completionDialog?.pendingCount}</strong> parcela(s) pendente(s) de
              recebimento. Deseja concluir o projeto mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCompletionDialog(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCompletion}>Concluir mesmo assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
