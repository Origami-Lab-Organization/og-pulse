import { ProjectActivityTagDB } from '@/types/projectActivity';

interface TagBadgeProps {
  tag: Pick<ProjectActivityTagDB, 'name' | 'color'>;
  className?: string;
}

export function TagBadge({ tag, className }: TagBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ''}`}
      style={{
        backgroundColor: tag.color + '26', // ~15% opacity
        color: tag.color,
        border: `1px solid ${tag.color}40`,
      }}
    >
      {tag.name}
    </span>
  );
}
