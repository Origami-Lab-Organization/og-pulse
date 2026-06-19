import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { JobApplicationDB, VAGA_PRETENDIDA_LABELS } from '@/types/jobApplication';
import { formatDate } from '@/lib/formatters';
import { Mail, Phone, FileText, User, Briefcase, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandidateKanbanCardProps {
  candidate: JobApplicationDB;
  onClick: () => void;
  onHireClick?: () => void;
}

function getFirstTwoNames(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  return parts.slice(0, 2).join(' ');
}

export function CandidateKanbanCard({ candidate, onClick, onHireClick }: CandidateKanbanCardProps) {
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
      {(candidate.vaga_titulo || candidate.vaga_pretendida) && (
        <div className="flex flex-wrap gap-1 mb-2">
          {candidate.vaga_titulo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-medium truncate max-w-full">
              <Briefcase className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{candidate.vaga_titulo}</span>
            </span>
          )}
          {candidate.vaga_pretendida && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground border border-border px-2 py-0.5 text-[10px] font-medium truncate max-w-full">
              <span className="truncate">{VAGA_PRETENDIDA_LABELS[candidate.vaga_pretendida]}</span>
            </span>
          )}
        </div>
      )}
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

      {candidate.status === 'aprovado' && onHireClick && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onHireClick();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 transition-colors cursor-pointer"
        >
          <UserCheck className="h-3.5 w-3.5" />
          Contratar
        </button>
      )}
    </div>
  );
}
