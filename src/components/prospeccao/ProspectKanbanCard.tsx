import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CircleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getChannelLabel } from '@/lib/interactionChannels';
import { cn } from '@/lib/utils';
import { isOverdue, type ProspectStage, type ProspectWithCompany } from '@/types/prospect';

interface ProspectKanbanCardProps {
  prospect: ProspectWithCompany;
  currentStage: ProspectStage;
  onOpen: (prospect: ProspectWithCompany) => void;
  isOverlay?: boolean;
}

export function ProspectKanbanCard({
  prospect,
  currentStage,
  onOpen,
  isOverlay,
}: ProspectKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: prospect.id,
    data: { prospect, currentStage },
    disabled: isOverlay,
  });

  const atrasado = isOverdue(prospect);

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring',
        isDragging && 'opacity-50',
        atrasado && 'border-destructive/40',
      )}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-3">
        <button
          type="button"
          className="w-full text-left focus:outline-none"
          onClick={() => onOpen(prospect)}
        >
          <p className="truncate text-sm font-medium">{prospect.contact_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {prospect.company?.name ?? 'Empresa não informada'}
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            {atrasado && <CircleAlert className="h-3 w-3 text-destructive" aria-hidden="true" />}
            <span className={cn(atrasado && 'text-destructive')}>
              {prospect.activity_count} ativ. · {getChannelLabel(prospect.primary_channel)}
            </span>
          </p>
        </button>
      </CardContent>
    </Card>
  );
}
