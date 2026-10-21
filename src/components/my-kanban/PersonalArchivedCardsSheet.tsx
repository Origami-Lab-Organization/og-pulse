import { format, parseISO } from 'date-fns';
import { Archive, RotateCcw } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useArchivedPersonalCards, useRestorePersonalCard } from '@/hooks/usePersonalKanban';
import type { PersonalKanbanCardWithTags, PersonalKanbanColumnDB } from '@/types/personalKanban';

interface PersonalArchivedCardsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: PersonalKanbanColumnDB[];
}

function ArchivedRow(props: { card: PersonalKanbanCardWithTags; columnName: string | undefined }) {
  const { card, columnName } = props;
  const restore = useRestorePersonalCard();
  const finishedAt = card.completed_at ?? card.archived_at!;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{card.title}</p>
        <p className="text-xs text-muted-foreground">
          Concluído em {format(parseISO(finishedAt), 'dd/MM/yyyy')}{columnName ? ` · ${columnName}` : ''}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" disabled={restore.isPending} onClick={() => restore.mutate(card.id)}>
        <RotateCcw className="h-3.5 w-3.5" />
        Restaurar
      </Button>
    </li>
  );
}

function ArchivedList(props: { cards: PersonalKanbanCardWithTags[] | undefined; columns: PersonalKanbanColumnDB[] }) {
  const { cards, columns } = props;
  if (!cards) return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>;
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Archive className="h-8 w-8 text-muted-foreground/60" aria-hidden />
        <p className="text-sm text-muted-foreground">Nenhum card arquivado.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {cards.map((card) => <ArchivedRow key={card.id} card={card} columnName={columns.find((c) => c.id === card.column_id)?.name} />)}
    </ul>
  );
}

export function PersonalArchivedCardsSheet(props: PersonalArchivedCardsSheetProps) {
  const { data: cards } = useArchivedPersonalCards(props.open);
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="mb-6">
          <SheetTitle>Arquivados</SheetTitle>
          <SheetDescription>Cards concluídos que saíram do board. Restaurar devolve o card à coluna dele.</SheetDescription>
        </SheetHeader>
        <ArchivedList cards={cards} columns={props.columns} />
      </SheetContent>
    </Sheet>
  );
}
