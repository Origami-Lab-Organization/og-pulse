import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CircleAlert, Route, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { cn } from '@/lib/utils';
import {
  getLeverLabel,
  isOverdue,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';

interface ProspectKanbanCardProps {
  prospect: ProspectWithCompany;
  currentStage: ProspectStage;
  onOpen: (prospect: ProspectWithCompany) => void;
  isOverlay?: boolean;
}

/**
 * O card mostra o que serve para ESCOLHER de longe: quem é, de onde veio e de quem é.
 *
 * Contagem de atividades e canal saíram — são detalhe de execução, e quem precisa deles já
 * está com o card aberto. Alavanca e responsável, ao contrário, são os dois cortes pelos
 * quais se varre o board: "o que veio de feira" e "o que é meu".
 */
export function ProspectKanbanCard({
  prospect,
  currentStage,
  onOpen,
  isOverlay,
}: ProspectKanbanCardProps) {
  const { byId } = useEmployeeDirectoryMap();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: prospect.id,
    data: { prospect, currentStage },
    disabled: isOverlay,
  });

  const atrasado = isOverdue(prospect);
  const alavanca = getLeverLabel(prospect.lever);
  const responsavel = prospect.owner_id ? byId.get(prospect.owner_id)?.nome : null;

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
          className="w-full space-y-1.5 text-left focus:outline-none"
          onClick={() => onOpen(prospect)}
        >
          <span className="block truncate text-sm font-medium">{prospect.contact_name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {prospect.company?.name ?? 'Empresa não informada'}
          </span>

          {alavanca && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Route className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{alavanca}</span>
            </span>
          )}

          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{responsavel ?? 'Sem responsável'}</span>
          </span>

          {atrasado && prospect.next_activity_on && (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <CircleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">Venceu em {formatarData(prospect.next_activity_on)}</span>
            </span>
          )}
        </button>
      </CardContent>
    </Card>
  );
}

function formatarData(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}
