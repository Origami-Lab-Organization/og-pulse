import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AssignedProjectCard } from '@/types/personalKanban';
import { CARD_TYPE_LABELS, COLUMN_LABELS } from '@/types/projectActivity';

interface ProjectCardDetailDialogProps {
  card: AssignedProjectCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectCardDetailDialog({ card, open, onOpenChange }: ProjectCardDetailDialogProps) {
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="leading-snug pr-4">{card.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {card.project && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Projeto</p>
              <p className="text-sm font-medium">{card.project.name}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{CARD_TYPE_LABELS[card.card_type]}</Badge>
            <Badge variant="outline">{COLUMN_LABELS[card.column_name]}</Badge>
            {card.points != null && (
              <Badge variant="secondary">{card.points} pts</Badge>
            )}
            {card.is_blocked && (
              <Badge variant="destructive">Bloqueado</Badge>
            )}
          </div>

          {card.user_story && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">User Story</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{card.user_story}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-1 border-t">
            Para editar, acesse a atividade do projeto.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
