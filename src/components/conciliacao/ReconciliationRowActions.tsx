import { useState } from 'react';
import { Check, Undo2, Wallet, X } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { ReconciliationAction, useReconciliationAction } from '@/hooks/useConciliacao';
import { canApplyPayment, situationOf } from '@/lib/conciliacao';
import { ReconciliationSituation } from '@/types/conciliacao';
import type { ReceivableReconciliationRow } from '@/types/conciliacao';

interface ActionProps {
  row: ReceivableReconciliationRow;
  matchId: string;
  run: (action: ReconciliationAction) => void;
  busy: boolean;
}

function SuggestionActions({ run, busy }: ActionProps) {
  return (
    <>
      <Button size="sm" onClick={() => run(ReconciliationAction.Confirm)} disabled={busy}>
        <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Confirmar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => run(ReconciliationAction.Undo)} disabled={busy}>
        <X className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Não é esta
      </Button>
    </>
  );
}

function UndoButton(props: ActionProps) {
  const { row, run, busy } = props;
  const [open, setOpen] = useState(false);
  const revertsPayment = Boolean(row.received_applied_at);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} disabled={busy}>
        <Undo2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Desfazer
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desfazer este casamento?</AlertDialogTitle>
          <AlertDialogDescription>
            {revertsPayment
              ? 'A parcela do Pulse foi marcada como recebida por este casamento e volta ao que era antes. '
              : ''}
            O Pulse não sugere este par de novo. Nada muda no Conta Azul.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => run(ReconciliationAction.Undo)}>Desfazer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MatchedActions(props: ActionProps) {
  const { row, run, busy } = props;
  return (
    <>
      {canApplyPayment(row) && (
        <Button size="sm" variant="outline" onClick={() => run(ReconciliationAction.ApplyPayment)} disabled={busy}>
          <Wallet className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Levar baixa
        </Button>
      )}
      <UndoButton {...props} />
    </>
  );
}

/** Ações de uma linha da conciliação. Parcela sozinha não tem ação: se corrige no sistema que manda nela. */
export function ReconciliationRowActions({ row }: { row: ReceivableReconciliationRow }) {
  const action = useReconciliationAction();
  if (!row.match_id) return null;
  const props: ActionProps = {
    row,
    matchId: row.match_id,
    busy: action.isPending,
    run: (kind) => action.mutate({ action: kind, matchId: row.match_id as string }),
  };
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {situationOf(row) === ReconciliationSituation.Suggested ? <SuggestionActions {...props} /> : <MatchedActions {...props} />}
    </div>
  );
}
