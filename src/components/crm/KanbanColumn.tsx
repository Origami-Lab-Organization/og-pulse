import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanCard } from './KanbanCard';
import { BudgetWithDetails, BudgetStatus } from '@/types/budget';
import { cn } from '@/lib/utils';

interface ColumnConfig {
  id: BudgetStatus;
  label: string;
  color: string;
}

interface KanbanColumnProps {
  column: ColumnConfig;
  budgets: BudgetWithDetails[];
  activeId: string | null;
}

export function KanbanColumn({ column, budgets, activeId }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const count = budgets.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full min-h-[500px] rounded-lg border bg-muted/30 transition-colors',
        isOver && 'bg-primary/5 border-primary/50'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">{column.label}</h3>
        <Badge variant="secondary" className={cn('text-xs', column.color)}>
          {count}
        </Badge>
      </div>

      {/* Cards Container */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {budgets.map((budget) => (
            <KanbanCard
              key={budget.id}
              budget={budget}
              isDragging={activeId === budget.id}
            />
          ))}
          {budgets.length === 0 && (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              Nenhum orçamento
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
