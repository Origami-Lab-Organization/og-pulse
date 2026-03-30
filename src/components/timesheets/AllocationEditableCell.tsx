import { useRef, useCallback } from 'react';
import { Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function fmt(h: number): string {
  return `${Math.round(h * 10) / 10}h`;
}

export type CellMode = 'planned' | 'actual';

interface AllocationEditableCellProps {
  cellKey: string;
  draft: number;
  actual: number;
  original: number;
  editable: boolean;
  isEditing: boolean;
  isSaving: boolean;
  isCurrentMonth: boolean;
  onBeginEdit: (key: string, currentValue: number) => void;
  onEndEdit: () => void;
  onCancelEdit: (key: string, initialValue: number) => void;
  onUpdateDraft: (key: string, value: number) => void;
  initialValue: number;
  /** data-col-index for Tab navigation */
  colIndex: number;
  /** data-row-index for Tab navigation */
  rowIndex: number;
  onTabNavigate?: (rowIndex: number, colIndex: number, direction: 1 | -1) => void;
  /** Visual mode: planned (amber borders) or actual (blue borders) */
  mode?: CellMode;
}

export function AllocationEditableCell({
  cellKey,
  draft,
  actual,
  original,
  editable,
  isEditing,
  isSaving,
  isCurrentMonth,
  onBeginEdit,
  onEndEdit,
  onCancelEdit,
  onUpdateDraft,
  initialValue,
  colIndex,
  rowIndex,
  onTabNavigate,
  mode = 'planned',
}: AllocationEditableCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const changed = Math.round(draft * 10) !== Math.round(original * 10);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancelEdit(cellKey, initialValue);
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        onEndEdit();
        onTabNavigate?.(rowIndex, colIndex, e.shiftKey ? -1 : 1);
      }
    },
    [cellKey, initialValue, onCancelEdit, onEndEdit, onTabNavigate, colIndex, rowIndex]
  );

  if (!editable) {
    return (
      <div
        className={cn(
          'mx-auto inline-flex h-7 min-w-[92px] items-center justify-center rounded border border-dashed px-2 text-xs text-muted-foreground',
          isCurrentMonth && 'bg-primary/5'
        )}
      >
        —
      </div>
    );
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        min={0}
        step={1}
        value={draft}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onUpdateDraft(cellKey, Number(e.target.value || 0))}
        onBlur={onEndEdit}
        onKeyDown={handleKeyDown}
        className={cn(
          'mx-auto h-7 w-[92px] text-center text-xs',
          changed && mode === 'actual' && 'border-blue-400',
          changed && mode === 'planned' && 'border-amber-400',
        )}
        disabled={isSaving}
        data-row-index={rowIndex}
        data-col-index={colIndex}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onBeginEdit(cellKey, draft);
      }}
      className={cn(
        'group/cell mx-auto inline-flex h-7 min-w-[92px] items-center justify-center gap-1 rounded border px-2 text-xs relative',
        'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer',
        changed && 'border-amber-400 bg-amber-50/70 dark:bg-amber-900/20',
        !changed && 'border-border bg-background',
        isCurrentMonth && !changed && 'bg-primary/5'
      )}
      disabled={isSaving}
      data-row-index={rowIndex}
      data-col-index={colIndex}
    >
      <span className="font-medium">{draft > 0 ? fmt(draft) : '—'}</span>
      <span className="text-muted-foreground">|</span>
      <span className="text-muted-foreground">{actual > 0 ? fmt(actual) : '—'}</span>
      <Pencil className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground opacity-0 group-hover/cell:opacity-100 transition-opacity" />
    </button>
  );
}
