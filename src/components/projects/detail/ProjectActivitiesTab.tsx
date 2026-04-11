import { useState } from 'react';
import { Plus, KanbanSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectWithRelations } from '@/types/project';
import {
  ACTIVITY_COLUMNS,
  COLUMN_LABELS,
  ActivityColumnName,
  CreateActivityInput,
} from '@/types/projectActivity';
import { useProjectActivities, useCreateActivity } from '@/hooks/useProjectActivities';
import { ActivityCard } from './ActivityCard';
import { ActivityCardFormDrawer } from './ActivityCardFormDrawer';
import { ActivityCardDetailDrawer } from '@/components/projects/activities/ActivityCardDetailDrawer';
import { ActivityErrorBoundary } from '@/components/projects/activities/ActivityErrorBoundary';

interface ProjectActivitiesTabProps {
  project: ProjectWithRelations;
  isReadOnly: boolean;
  canCreate: boolean;
}

const ADDABLE_COLUMNS = new Set<ActivityColumnName>(['product_backlog', 'sprint_backlog']);

export function ProjectActivitiesTab({ project, isReadOnly, canCreate }: ProjectActivitiesTabProps) {
  const { data: activities = [], isLoading } = useProjectActivities(project.id);
  const createActivity = useCreateActivity();

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [targetColumn, setTargetColumn] = useState<ActivityColumnName>('product_backlog');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const selectedCard = activities.find((a) => a.id === selectedCardId) ?? null;

  const byColumn = ACTIVITY_COLUMNS.reduce<Record<ActivityColumnName, typeof activities>>(
    (acc, col) => {
      acc[col] = activities.filter((a) => a.column_name === col);
      return acc;
    },
    {} as Record<ActivityColumnName, typeof activities>
  );

  const handleAddCard = (col: ActivityColumnName) => {
    setTargetColumn(col);
    setCreateDrawerOpen(true);
  };

  const handleSubmit = (input: CreateActivityInput) => {
    createActivity.mutate(input, {
      onSuccess: () => setCreateDrawerOpen(false),
    });
  };

  const boardHeight = 'h-[calc(100dvh-240px)]';

  if (isLoading) {
    return (
      <div className={`flex gap-4 ${boardHeight}`}>
        {ACTIVITY_COLUMNS.map((col) => (
          <Skeleton key={col} className="min-w-[280px] flex-shrink-0 h-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <ScrollArea className={`w-full ${boardHeight}`}>
        <div className={`flex gap-4 pb-4 min-w-max ${boardHeight}`}>
          {ACTIVITY_COLUMNS.map((col) => {
            const cards = byColumn[col];
            const showAddButton = canCreate && !isReadOnly && ADDABLE_COLUMNS.has(col);

            return (
              <div
                key={col}
                className="min-w-[280px] flex-shrink-0 flex flex-col gap-3"
                style={{ height: '100%' }}
              >
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-sm font-medium text-foreground">
                    {COLUMN_LABELS[col]}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {cards.length}
                  </Badge>
                </div>

                <div className="flex flex-col gap-2 flex-1 min-h-0 rounded-lg bg-muted/40 border border-border p-2 overflow-y-auto">
                  {cards.length === 0 && col === 'product_backlog' ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-2 text-muted-foreground">
                      <KanbanSquare className="h-6 w-6 opacity-40" />
                      <span className="text-xs">Nenhuma atividade</span>
                    </div>
                  ) : (
                    cards.map((card) => (
                      <ActivityCard
                        key={card.id}
                        card={card}
                        onClick={() => setSelectedCardId(card.id)}
                      />
                    ))
                  )}

                  {showAddButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-muted-foreground hover:text-foreground gap-1.5 mt-auto shrink-0"
                      onClick={() => handleAddCard(col)}
                    >
                      <Plus className="h-4 w-4" />
                      Card
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <ActivityCardFormDrawer
        open={createDrawerOpen}
        onOpenChange={setCreateDrawerOpen}
        project={project}
        columnName={targetColumn}
        onSubmit={handleSubmit}
        isSubmitting={createActivity.isPending}
      />

      {selectedCard && (
        <ActivityErrorBoundary onClose={() => setSelectedCardId(null)}>
          <ActivityCardDetailDrawer
            open={!!selectedCardId}
            onOpenChange={(open) => { if (!open) setSelectedCardId(null); }}
            card={selectedCard}
            project={project}
            isReadOnly={isReadOnly}
          />
        </ActivityErrorBoundary>
      )}
    </>
  );
}
