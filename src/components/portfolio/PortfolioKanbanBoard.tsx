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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PlanningReadiness } from '@/types/projectPlanning';
import { PortfolioColumn } from './PortfolioColumn';
import { PortfolioCard } from './PortfolioCard';
import { PortfolioProject, useUpdatePortfolioStage } from '@/hooks/usePortfolioProjects';
import {
  PORTFOLIO_BOARD_COLUMN,
  PORTFOLIO_STAGE,
  type PortfolioAlert,
  type PortfolioBoardColumnId,
  type PortfolioStage,
} from '@/types/portfolio';
import { boardColumnOf, isCompletedInYear, sortForColumn } from '@/lib/portfolioBoard';
import { useProjectPlanningReadiness } from '@/hooks/useProjectPlanningReadiness';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CompletionDialogState {
  projectId: string;
  projectName: string;
  warnings: string[];
}

interface PortfolioKanbanBoardProps {
  projects: PortfolioProject[];
  /** Ano filtrado: a coluna Concluído mostra só os concluídos nele. Padrão: o ano atual. */
  year?: number;
  /** Hoje, `yyyy-MM-dd`: decide quem está em Encerramento. Padrão: hoje. */
  today?: string;
  canEditProject?: (project: PortfolioProject) => boolean;
  hideValues?: boolean;
  /** Pendências de cada projeto (sino do card e ordem na coluna, US-0037). */
  alertsOf?: (project: PortfolioProject) => PortfolioAlert[];
  /** Prontidão do planejamento de cada projeto ("N de M obrigatórios", US-0039). */
  planningOf?: (project: PortfolioProject) => PlanningReadiness | undefined;
}

/** Quem tem algo fora do planejado vem primeiro; depois quem pede atenção; depois o resto. */
const alertRank = (alerts: PortfolioAlert[]) => {
  if (alerts.some((alert) => alert.level === 'late')) return 0;
  return alerts.length ? 1 : 2;
};

/** Etapa gravada ao soltar o card na coluna. Encerramento segue a data de fim e não recebe card. */
const STAGE_OF_COLUMN: Record<PortfolioBoardColumnId, PortfolioStage | null> = {
  planning: PORTFOLIO_STAGE.PLANNING,
  value_delivery: PORTFOLIO_STAGE.VALUE_DELIVERY,
  closing: null,
  completed: PORTFOLIO_STAGE.COMPLETED,
};

const BOARD_COLUMNS = (year: number) => [
  { id: PORTFOLIO_BOARD_COLUMN.PLANNING, label: 'Planejamento', rule: 'Sai quando o planejamento é concluído, no projeto.' },
  { id: PORTFOLIO_BOARD_COLUMN.VALUE_DELIVERY, label: 'Entrega de Valor', rule: 'Em execução, a mais de 20 dias do fim.' },
  { id: PORTFOLIO_BOARD_COLUMN.CLOSING, label: 'Encerramento', rule: 'Últimos 20 dias e depois do fim, até concluir.' },
  { id: PORTFOLIO_BOARD_COLUMN.COMPLETED, label: 'Concluído', rule: `Concluídos em ${year}.` },
];

export function PortfolioKanbanBoard(props: PortfolioKanbanBoardProps) {
  const {
    projects,
    year = new Date().getFullYear(),
    today = format(new Date(), 'yyyy-MM-dd'),
    canEditProject = () => false,
    hideValues,
    alertsOf = () => [],
    planningOf,
  } = props;
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

  const projectsByColumn = useMemo(() => {
    const grouped: Record<PortfolioBoardColumnId, PortfolioProject[]> = {
      planning: [],
      value_delivery: [],
      closing: [],
      completed: [],
    };
    projects.forEach((project) => {
      const column = boardColumnOf(project, today);
      if (column === PORTFOLIO_BOARD_COLUMN.COMPLETED && !isCompletedInYear(project, year)) return;
      grouped[column].push(project);
    });
    (Object.keys(grouped) as PortfolioBoardColumnId[]).forEach((column) => {
      // `sort` é estável: dentro do mesmo grupo de pendência, vale a ordem da coluna.
      grouped[column] = sortForColumn(grouped[column], column).sort(
        (a, b) => alertRank(alertsOf(a)) - alertRank(alertsOf(b)),
      );
    });
    return grouped;
  }, [projects, today, year, alertsOf]);

  const columnUnder = (overId: string): PortfolioBoardColumnId | null => {
    if (overId in STAGE_OF_COLUMN) return overId as PortfolioBoardColumnId;
    const overProject = projects.find((p) => p.id === overId);
    return overProject ? boardColumnOf(overProject, today) : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const project = projects.find((p) => p.id === event.active.id);
    if (project) setActiveProject(project);
  };

  type MoveDecision = { stage: PortfolioStage } | { notice: { title: string; description: string; destructive?: boolean } };

  // Seguindo .harness/patterns/security.md e OWASP A01: mover card altera o recurso projeto,
  // então a tela também confere a permissão sobre o projeto específico.
  /** Card em Planejamento não se arrasta: a fase muda ao concluir o planejamento (US-0039). */
  const canDragProject = (project: PortfolioProject) =>
    canEditProject(project) && project.portfolio_stage !== PORTFOLIO_STAGE.PLANNING;

  const permissionNotice = (project: PortfolioProject) => {
    if (!canEditProject(project)) return 'Você só pode alterar projetos em que é PM.';
    // O planejamento só termina pela conclusão, dentro do projeto (US-0039, TD-0032).
    if (project.portfolio_stage === PORTFOLIO_STAGE.PLANNING) return 'O planejamento é concluído dentro do projeto, pelo checklist do planejamento.';
    if (project.portfolio_stage === PORTFOLIO_STAGE.COMPLETED && !isAdmin) return 'Apenas administradores podem mover projetos concluídos.';
    return null;
  };

  const decideMove = (project: PortfolioProject, overId: string): MoveDecision | null => {
    const denied = permissionNotice(project);
    if (denied) return { notice: { title: 'Ação não permitida', description: denied, destructive: true } };
    const targetColumn = columnUnder(overId);
    if (!targetColumn) {
      return { notice: { title: 'Movimento não realizado', description: 'Não foi possível identificar a coluna de destino.', destructive: true } };
    }
    if (targetColumn === boardColumnOf(project, today)) return null;
    const stage = STAGE_OF_COLUMN[targetColumn];
    if (!stage) {
      return { notice: { title: 'Encerramento segue a data de fim', description: 'O projeto entra em Encerramento sozinho nos últimos 20 dias antes da data de fim.' } };
    }
    return stage === project.portfolio_stage ? null : { stage };
  };

  const openCompletion = (project: PortfolioProject) => {
    setCompletionDate(format(new Date(), 'yyyy-MM-dd'));
    setCompletionDialog({ projectId: project.id, projectName: project.name, warnings: [] });
    // Avisos (ex.: pagamento pendente) aparecem antes de confirmar, sem impedir a conclusão.
    void checkCompletionReadiness(project.id).then(({ warnings }) => {
      setCompletionDialog((current) => (current?.projectId === project.id ? { ...current, warnings } : current));
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);
    if (!over) {
      toast({ title: 'Movimento não realizado', description: 'Solte o card sobre uma coluna do portfólio para mover o projeto.', variant: 'destructive' });
      return;
    }
    const project = projects.find((p) => p.id === active.id);
    if (!project) return;
    const decision = decideMove(project, String(over.id));
    if (!decision) return;
    if ('notice' in decision) {
      toast({ title: decision.notice.title, description: decision.notice.description, variant: decision.notice.destructive ? 'destructive' : 'default' });
      return;
    }
    if (decision.stage === PORTFOLIO_STAGE.COMPLETED) {
      openCompletion(project);
      return;
    }
    updateStage.mutate({ projectId: project.id, newStage: decision.stage });
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
          <div className="grid grid-cols-[repeat(4,minmax(260px,1fr))] gap-4">
            {BOARD_COLUMNS(year).map((column) => (
              <PortfolioColumn
                key={column.id}
                id={column.id}
                label={column.label}
                rule={column.rule}
                projects={projectsByColumn[column.id]}
                today={today}
                canDragProject={canDragProject}
                hideValues={hideValues}
                alertsOf={alertsOf}
                planningOf={planningOf}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeProject ? (
            <div className="rotate-3 scale-105">
              <PortfolioCard
                project={activeProject}
                column={boardColumnOf(activeProject, today)}
                today={today}
                canDrag
                hideValues={hideValues}
              />
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
              O projeto só será concluído se todas as etapas do cronograma estiverem concluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {completionDialog?.warnings.length ? (
            <Alert variant="warning">
              <AlertDescription>
                {completionDialog.warnings.join(' · ')}. Você pode concluir agora e registrar o
                recebimento depois, no projeto já concluído.
              </AlertDescription>
            </Alert>
          ) : null}
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
