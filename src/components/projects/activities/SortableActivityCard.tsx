import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ActivityCard } from '@/components/projects/detail/ActivityCard';
import { ProjectActivityCardWithRelations } from '@/types/projectActivity';

interface SortableActivityCardProps {
  card: ProjectActivityCardWithRelations;
  projectName?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function SortableActivityCard({ card, projectName, disabled, onClick }: SortableActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ActivityCard card={card} projectName={projectName} onClick={onClick} />
    </div>
  );
}
