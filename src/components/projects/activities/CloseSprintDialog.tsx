import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ActivitySprintDB, ProjectActivityCardWithRelations } from '@/types/projectActivity';
import { useCloseSprint } from '@/hooks/useActivitySprints';

interface CloseSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSprint: ActivitySprintDB;
  nextSprint: ActivitySprintDB | null;
  cards: ProjectActivityCardWithRelations[];
  projectId: string;
  /** Called after a successful close with the newly-activated sprint (if any). */
  onSuccess: (nextSprint: ActivitySprintDB | null) => void;
}

export function CloseSprintDialog({
  open,
  onOpenChange,
  activeSprint,
  nextSprint,
  cards,
  projectId,
  onSuccess,
}: CloseSprintDialogProps) {
  const closeSprint = useCloseSprint();
  const [pendingAction, setPendingAction] = useState<'product_backlog' | 'next_sprint'>('product_backlog');

  // Only cards that belong to the active sprint
  const sprintCards    = cards.filter((c) => c.sprint_id === activeSprint.id);
  const completedCards = sprintCards.filter((c) => c.column_name === 'done');
  const pendingCards   = sprintCards.filter((c) => c.column_name !== 'done');

  const cannotKeep = pendingAction === 'next_sprint' && !nextSprint;

  const handleConfirm = () => {
    closeSprint.mutate(
      {
        projectId,
        activeSprint,
        nextSprint,
        completedCount: completedCards.length,
        pendingCards: pendingCards.map((c) => ({ id: c.id, tenant_id: c.tenant_id })),
        pendingAction,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess(nextSprint);
        },
      }
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Encerrar {activeSprint.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação marca a sprint como concluída e não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Counts */}
        <div className="flex gap-3 my-1">
          <div className="flex-1 rounded-md border bg-green-50 dark:bg-green-950/20 p-3 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completedCards.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Concluídos</p>
          </div>
          <div className="flex-1 rounded-md border p-3 text-center">
            <p className="text-2xl font-bold">{pendingCards.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Em andamento</p>
          </div>
        </div>

        {/* Action for pending cards */}
        {pendingCards.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              O que fazer com os {pendingCards.length} cards em andamento?
            </p>
            <RadioGroup
              value={pendingAction}
              onValueChange={(v) => setPendingAction(v as typeof pendingAction)}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="product_backlog" id="action-backlog" />
                <Label htmlFor="action-backlog" className="text-sm cursor-pointer font-normal">
                  Mover tudo para Product Backlog
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="next_sprint" id="action-next" />
                <Label htmlFor="action-next" className="text-sm cursor-pointer font-normal">
                  Manter na próxima Sprint
                </Label>
              </div>
            </RadioGroup>

            {cannotKeep && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Não há próxima sprint planejada. Crie uma sprint em Configurações antes de continuar com esta opção.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={closeSprint.isPending || cannotKeep}
          >
            {closeSprint.isPending ? 'Encerrando...' : 'Confirmar Encerramento'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
