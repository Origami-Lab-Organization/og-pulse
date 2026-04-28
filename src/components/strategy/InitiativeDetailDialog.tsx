import { CalendarDays, Layers3, Target, User } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getStrategyInitiativeBadgeClass } from '@/lib/strategyInitiativeBadge';
import { InitiativeStatus, StrategyInitiative } from '@/types/strategy';

const STATUS_LABELS: Record<InitiativeStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  review: 'Em revisão',
  done: 'Concluído',
};

function formatDate(date: string | null) {
  if (!date) return 'Nao definida';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="leading-snug">{initiative.title}</DialogTitle>
          <DialogDescription>
            Visualize os detalhes da iniciativa e acompanhe as informacoes salvas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-medium">
              {STATUS_LABELS[initiative.status]}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                Objetivo vinculado
              </div>
              {initiative.objectiveTitle ? (
                <Badge
                  variant="outline"
                  className={cn('max-w-full text-xs font-medium', initiativeBadgeClass)}
                >
                  <span className="truncate">{initiative.objectiveTitle}</span>
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground">Nao vinculado</p>
              )}
            </div>

            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                Dono
              </div>
              <p className="text-sm">{initiative.ownerName ?? 'Sem dono'}</p>
            </div>

            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Prazo de entrega
              </div>
              <p className="text-sm">{formatDate(initiative.dueDate)}</p>
              {initiative.dueDateNotes && (
                <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{initiative.dueDateNotes}</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5" />
              Observacoes
            </div>
            <div className="min-h-28 rounded-lg border bg-muted/20 p-3">
              {visibleNotes ? (
                <p className="whitespace-pre-wrap text-sm leading-6">{visibleNotes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma observacao registrada.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {cycleIsActive && (
            <>
              <Button variant="outline" onClick={onEdit}>
                Editar
              </Button>
              <Button variant="destructive" onClick={onDelete}>
                Excluir
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
