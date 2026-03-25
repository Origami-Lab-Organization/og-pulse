import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { JobApplicationDB } from '@/types/jobApplication';
import { formatDate } from '@/lib/formatters';
import { Mail, Phone, FileText, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandidateKanbanCardProps {
  candidate: JobApplicationDB;
  onClick: () => void;
}

function getFirstTwoNames(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  return parts.slice(0, 2).join(' ');
}

export function CandidateKanbanCard({ candidate, onClick }: CandidateKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: candidate.id,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-md p-3 cursor-grab active:cursor-grabbing',
        'hover:border-primary/40 hover:shadow-sm transition-all',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <p className="text-sm font-medium text-foreground truncate mb-2">
        {candidate.nome}
      </p>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{candidate.email}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="h-3 w-3 shrink-0" />
          <span>{candidate.telefone}</span>
        </div>
      </div>

      {/* Responsável */}
      <div className="mt-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border',
            candidate.responsavel_nome
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-muted text-muted-foreground border-border'
          )}
        >
          <User className="h-2.5 w-2.5 shrink-0" />
          {candidate.responsavel_nome
            ? getFirstTwoNames(candidate.responsavel_nome)
            : 'Sem responsável'}
        </span>
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {formatDate(candidate.created_at)}
        </span>
        <div className="flex items-center gap-1.5">
          {candidate.linkedin && (
            <span className="text-[10px] font-semibold text-muted-foreground leading-none">in</span>
          )}
          {candidate.curriculo_nome && (
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}