import { useNavigate } from 'react-router-dom';
import { parseISO, isToday, isPast, isTomorrow } from 'date-fns';
import { KanbanSquare, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePersonalKanbanColumns, usePersonalKanbanCards } from '@/hooks/usePersonalKanban';
import { PersonalKanbanCardWithTags } from '@/types/personalKanban';
import { cn } from '@/lib/utils';

function DueDateChip({ due }: { due: string }) {
  const date = parseISO(due);
  if (isPast(date) && !isToday(date)) {
    return (
      <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/10 text-destructive shrink-0">
        Atrasada
      </span>
    );
  }
  if (isToday(date)) {
    return (
      <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
        Hoje
      </span>
    );
  }
  if (isTomorrow(date)) {
    return (
      <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
        Amanhã
      </span>
    );
  }
  const [, month, day] = due.split('-');
  return (
    <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
      {day}/{month}
    </span>
  );
}

export function MinhasTarefasWidget() {
  const navigate = useNavigate();
  const { data: columns = [], isLoading: loadingColumns } = usePersonalKanbanColumns();
  const { data: cards = [], isLoading: loadingCards } = usePersonalKanbanCards();

  const isLoading = loadingColumns || loadingCards;

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <KanbanSquare className="h-4 w-4 text-muted-foreground" />
              Minhas Tarefas
            </CardTitle>
            <Skeleton className="h-4 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const doneColumn = columns.find((c) => c.name === 'Done');
  const doingColumn = columns.find((c) => c.name === 'Doing');

  const allPending: PersonalKanbanCardWithTags[] = cards
    .filter((c) => c.column_id !== doneColumn?.id)
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });

  const visible = allPending.slice(0, 5);
  const extra = allPending.length - visible.length;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
            <KanbanSquare className="h-4 w-4 text-muted-foreground" />
            Minhas Tarefas
          </CardTitle>
          <div className="flex items-center gap-2">
            {allPending.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {allPending.length} pendente{allPending.length !== 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground gap-1 hover:text-foreground"
              onClick={() => navigate('/my-kanban')}
            >
              Ver kanban
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <KanbanSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 gap-1 text-xs"
              onClick={() => navigate('/my-kanban')}
            >
              Abrir Meu Kanban
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {visible.map((card) => {
              const isInProgress = card.column_id === doingColumn?.id;
              return (
                <div
                  key={card.id}
                  className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/my-kanban')}
                >
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      isInProgress ? 'bg-primary' : 'bg-muted-foreground/40',
                    )}
                  />
                  <p className="flex-1 text-sm truncate">{card.title}</p>
                  {card.due_date && <DueDateChip due={card.due_date} />}
                </div>
              );
            })}
            {extra > 0 && (
              <p className="text-xs text-muted-foreground text-center pt-1.5">
                +{extra} tarefa{extra !== 1 ? 's' : ''} no kanban
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
