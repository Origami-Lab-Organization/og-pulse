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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DeclineInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: (options: { comment: string; removeFromCalendar: boolean }) => void;
}

/**
 * Confirmação de recusa, com a escolha de manter ou não o compromisso na
 * agenda. O Outlook remove por padrão; aqui a escolha é explícita porque
 * "recusei mas quero ver que existia" é caso legítimo.
 */
export function DeclineInviteDialog({
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: DeclineInviteDialogProps) {
  const [comment, setComment] = useState('');
  const [removeFromCalendar, setRemoveFromCalendar] = useState(true);

  useEffect(() => {
    if (open) {
      setComment('');
      setRemoveFromCalendar(true);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recusar convite</DialogTitle>
          <DialogDescription>
            O organizador recebe sua recusa. Você pode escrever um recado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="decline-comment">Mensagem (opcional)</Label>
            <Textarea
              id="decline-comment"
              rows={3}
              value={comment}
              onChange={(changed) => setComment(changed.target.value)}
              placeholder="Vai junto com a resposta ao organizador."
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="decline-remove"
              checked={removeFromCalendar}
              onCheckedChange={(checked) => setRemoveFromCalendar(checked === true)}
            />
            <Label htmlFor="decline-remove" className="text-sm font-normal leading-snug">
              Remover da minha agenda
              <span className="block text-muted-foreground">
                Desmarque para manter o compromisso visível como recusado.
              </span>
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => onConfirm({ comment: comment.trim(), removeFromCalendar })}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Recusar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
