import { Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getStrategyInitiativeBadgeClass } from '@/lib/strategyInitiativeBadge';
import { InitiativeStatus, StrategyInitiative } from '@/types/strategy';

const STATUS_LABELS: Record<InitiativeStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  review: 'Em revisão',
  done: 'Concluído',
};

const STATUS_COLORS: Record<InitiativeStatus, string> = {
  backlog: 'text-muted-foreground',
  in_progress: 'text-blue-600 dark:text-blue-400',
  review: 'text-amber-600 dark:text-amber-400',
  done: 'text-emerald-600 dark:text-emerald-400',
};

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface InitiativeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initiative: StrategyInitiative | null;
  cycleIsActive: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function ReadOnlyField({ value, empty, children }: { value?: string | null; empty?: string; children?: React.ReactNode }) {
  const content = children ?? value;
  const isEmpty = !content;
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
      {isEmpty
        ? <span className="text-muted-foreground">{empty ?? '—'}</span>
        : content}
    </div>
  );
}

export function InitiativeDetailDialog({
  open,
  onOpenChange,
  initiative,
  cycleIsActive,
  onEdit,
  onDelete,
}: InitiativeDetailDialogProps) {
  if (!initiative) return null;

  const visibleNotes = initiative.notes ?? initiative.description;
  const initiativeBadgeClass = getStrategyInitiativeBadgeClass(
    initiative.objectiveId ?? initiative.objectiveTitle ?? initiative.id,
  );
  const formattedDate = formatDate(initiative.dueDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="leading-snug pr-6">{initiative.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className={cn('text-sm font-medium', STATUS_COLORS[initiative.status])}>
                ● {STATUS_LABELS[initiative.status]}
              </span>
              {initiative.objectiveTitle && (
                <Badge
                  variant="outline"
                  className={cn('max-w-[200px] text-xs font-medium', initiativeBadgeClass)}
                >
                  <span className="truncate">{initiative.objectiveTitle}</span>
                </Badge>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Objetivo vinculado</p>
            <ReadOnlyField empty="Não vinculado">
              {initiative.objectiveTitle ? (
                <Badge
                  variant="outline"
                  className={cn('text-xs font-medium', initiativeBadgeClass)}
                >
                  {initiative.objectiveTitle}
                </Badge>
              ) : null}
            </ReadOnlyField>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Dono</p>
            <ReadOnlyField value={initiative.ownerName} empty="Sem dono" />
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Prazo de entrega</p>
            <ReadOnlyField value={formattedDate} empty="Não definido" />
            {initiative.dueDateNotes && (
              <p className="px-1 text-xs text-muted-foreground whitespace-pre-wrap">
                {initiative.dueDateNotes}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Observações</p>
            <div className="min-h-24 rounded-md border bg-muted/30 px-3 py-2 text-sm">
              {visibleNotes ? (
                <p className="whitespace-pre-wrap leading-6">{visibleNotes}</p>
              ) : (
                <span className="text-muted-foreground">Nenhuma observação registrada.</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {cycleIsActive ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {cycleIsActive && (
              <Button onClick={onEdit}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
