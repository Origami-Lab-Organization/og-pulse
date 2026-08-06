import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEventAction } from '@/hooks/useMicrosoftGraph';
import { EVENT_ACTION } from '@/types/microsoftGraph';
import type { EventAction } from '@/types/microsoftGraph';

interface ActionCopy {
  title: string;
  confirmLabel: string;
  /** Ações que notificam outras pessoas aceitam um recado. */
  withComment: boolean;
}

const ACTION_COPY: Record<EventAction, ActionCopy> = {
  [EVENT_ACTION.CANCEL]: {
    title: 'Cancelar reunião',
    confirmLabel: 'Cancelar reunião',
    withComment: true,
  },
  [EVENT_ACTION.DELETE]: {
    title: 'Excluir compromisso',
    confirmLabel: 'Excluir',
    withComment: false,
  },
  [EVENT_ACTION.DECLINE]: {
    title: 'Recusar convite',
    confirmLabel: 'Recusar',
    withComment: true,
  },
};

function describeConsequence(action: EventAction, attendeeCount: number): string {
  if (action === EVENT_ACTION.CANCEL) {
    return `A reunião sai da agenda de todos e ${attendeeCount} convidado(s) recebem o aviso de cancelamento. Não há como desfazer.`;
  }
  if (action === EVENT_ACTION.DECLINE) {
    return 'O compromisso sai da sua agenda e o organizador recebe sua recusa.';
  }
  return 'O compromisso sai da sua agenda. Não há como desfazer.';
}

interface EventActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: EventAction;
  eventId: string;
  eventSubject: string;
  attendeeCount: number;
  onDone: () => void;
}

export function EventActionDialog({
  open,
  onOpenChange,
  action,
  eventId,
  eventSubject,
  attendeeCount,
  onDone,
}: EventActionDialogProps) {
  const eventAction = useEventAction();
  const [comment, setComment] = useState('');
  const copy = ACTION_COPY[action];

  useEffect(() => {
    if (open) setComment('');
  }, [open]);

  const confirm = () => {
    eventAction.mutate(
      { action, eventId, comment: comment.trim() },
      { onSuccess: onDone },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            "{eventSubject}" — {describeConsequence(action, attendeeCount)}
          </DialogDescription>
        </DialogHeader>

        {copy.withComment && (
          <div className="space-y-2">
            <Label htmlFor="event-action-comment">Mensagem (opcional)</Label>
            <Textarea
              id="event-action-comment"
              rows={3}
              value={comment}
              onChange={(changed) => setComment(changed.target.value)}
              placeholder="Vai junto com o aviso enviado às pessoas."
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={eventAction.isPending}
          >
            Voltar
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={eventAction.isPending}>
            {eventAction.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {copy.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
