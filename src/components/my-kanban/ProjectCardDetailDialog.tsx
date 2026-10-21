import { KanbanSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AssignedProjectCard, PersonalKanbanColumnDB } from '@/types/personalKanban';
import { CARD_TYPE_LABELS, COLUMN_LABELS } from '@/types/projectActivity';
import { useTrackProjectActivity } from '@/hooks/usePersonalKanban';
import { PROJECT_TO_PERSONAL_STAGE, firstColumnOfStage } from '@/lib/personalKanban';

interface ProjectCardDetailDialogProps {
  card: AssignedProjectCard | null;
  columns: PersonalKanbanColumnDB[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Acompanhar cria um card pessoal vinculado: a atividade passa a se mover pelo Meu Kanban e
// ganha prazo e lembrete, sem sair do projeto (ADR-0050).
function TrackActivityButton(props: { card: AssignedProjectCard; columns: PersonalKanbanColumnDB[]; onDone: () => void }) {
  const track = useTrackProjectActivity();
  const column = firstColumnOfStage(props.columns, PROJECT_TO_PERSONAL_STAGE[props.card.column_name]);
  if (!column) return null;
  return (
    <Button
      type="button"
      className="w-full gap-1.5"
      disabled={track.isPending}
      onClick={() => track.mutate({ activity: props.card, columnId: column.id }, { onSuccess: props.onDone })}
    >
      <KanbanSquare className="h-4 w-4" />
      Acompanhar no meu kanban
    </Button>
  );
}

export function ProjectCardDetailDialog(props: ProjectCardDetailDialogProps) {
  const { card, columns, open, onOpenChange } = props;
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="leading-snug pr-4">{card.title}</DialogTitle>
          <DialogDescription>Atividade atribuída a você no projeto.</DialogDescription>
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

          <div className="space-y-2 border-t pt-4">
            <TrackActivityButton card={card} columns={columns} onDone={() => onOpenChange(false)} />
            <p className="text-xs text-muted-foreground">
              Mover pelo seu kanban move a atividade no projeto, e o que o projeto mudar aparece aqui. Você pode dar prazo e lembrete a ela.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
