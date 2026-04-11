import { CheckSquare } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ChecklistType } from '@/types/projectActivity';
import { useCardChecklist, useToggleChecklistItem } from '@/hooks/useCardChecklist';

const TYPE_LABEL: Record<ChecklistType, string> = {
  dor: 'Definition of Ready',
  dod: 'Definition of Done',
};

interface CardChecklistProps {
  cardId: string;
  cardTenantId: string;
  type: ChecklistType;
  isReadOnly?: boolean;
}

export function CardChecklist({ cardId, cardTenantId, type, isReadOnly = false }: CardChecklistProps) {
  const { data: items = [], isLoading } = useCardChecklist(cardId, type);
  const toggle = useToggleChecklistItem(cardId, cardTenantId);

  if (isLoading) return null;

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <CheckSquare className="h-3.5 w-3.5 opacity-40" />
        <span>Nenhum item configurado no template do projeto.</span>
      </div>
    );
  }

  const total = items.length;
  const checked = items.filter((i) => i.is_checked).length;
  const progress = (checked / total) * 100;
  const isComplete = checked === total;

  return (
    <div className="space-y-3">
      {/* Header + barra de progresso */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {TYPE_LABEL[type]} ({checked}/{total})
          </span>
          {isComplete && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              ✓ Completo
            </span>
          )}
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Itens */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <Checkbox
              id={`checklist-${item.id}`}
              checked={item.is_checked}
              disabled={isReadOnly || toggle.isPending}
              onCheckedChange={(val) =>
                toggle.mutate({ item, isChecked: !!val })
              }
              className="mt-0.5"
            />
            <label
              htmlFor={`checklist-${item.id}`}
              className={cn(
                'text-sm leading-snug cursor-pointer select-none',
                item.is_checked && 'line-through text-muted-foreground'
              )}
            >
              {item.item_text}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
