import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { BadgeDollarSign, CircleAlert, MessagesSquare, Route, User, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  getDiscardReasonLabel,
  getLeverLabel,
  getProspectStageLabel,
  isTaskOverdue,
  type PendingTaskLite,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';

interface ProspectKanbanCardProps {
  prospect: ProspectWithCompany;
  currentStage: ProspectStage;
  /** Contatos da MESMA empresa em conversa ou além — pode incluir este próprio card. */
  emConversa?: ProspectWithCompany[];
  /** A tarefa pendente mais urgente do contato — é ela, e só ela, que avisa vencimento. */
  proximaTarefa?: PendingTaskLite;
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
  emConversa,
  proximaTarefa,
  onOpen,
  isOverlay,
}: ProspectKanbanCardProps) {
  const { byId } = useEmployeeDirectoryMap();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: prospect.id,
    data: { prospect, currentStage },
    disabled: isOverlay,
  });

  // Só tarefa vencida avisa (28/09/2026): a data da cadência é sugestão, não compromisso.
  const vencida = !!proximaTarefa && isTaskOverdue({ due_date: proximaTarefa.due_date, done_at: null });
  const alavanca = getLeverLabel(prospect.lever);
  const responsavel = prospect.owner_id ? byId.get(prospect.owner_id)?.nome : null;
  const outrosEmConversa = (emConversa ?? []).filter((c) => c.id !== prospect.id);

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring',
        isDragging && 'opacity-50',
        vencida && 'border-destructive/40',
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
          <span className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{prospect.contact_name}</span>
            {outrosEmConversa.length > 0 && (
              <EmpresaEmConversa contatos={outrosEmConversa} nomeDe={(id) => byId.get(id)?.nome} />
            )}
          </span>
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

          <DesfechoDoCard prospect={prospect} />

          {vencida && (
            <span className="flex items-center gap-1 text-xs text-destructive" title={proximaTarefa.description}>
              <CircleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">Tarefa venceu em {formatarData(proximaTarefa.due_date)}</span>
            </span>
          )}
        </button>
      </CardContent>
    </Card>
  );
}

/**
 * Outro contato da mesma empresa já respondeu (ou foi além): a conta está em conversa.
 *
 * Sinaliza a partir de "Respondeu", não de "Em cadência" (24/09/2026, Guilherme) — cadência
 * é tentativa; conversa é quando abordar de novo por outro contato atrapalha.
 */
function EmpresaEmConversa({
  contatos,
  nomeDe,
}: {
  contatos: ProspectWithCompany[];
  nomeDe: (id: string) => string | undefined;
}) {
  const detalhe = contatos
    .map((c) => {
      const dono = c.owner_id ? nomeDe(c.owner_id) : undefined;
      return `${c.contact_name} (${getProspectStageLabel(c.stage)}${dono ? `, com ${dono}` : ''})`;
    })
    .join('; ');

  return (
    <span
      title={`Empresa em conversa: ${detalhe}`}
      className="inline-flex shrink-0 items-center rounded-md bg-warning-subtle p-1 text-warning-emphasis"
    >
      <MessagesSquare className="h-3 w-3" aria-hidden="true" />
      <span className="sr-only">Empresa em conversa: {detalhe}</span>
    </span>
  );
}

/**
 * O desfecho no card: quanto vendemos, ou por que perdemos. Ganho sem valor é sinalizado
 * como pendência — é o dado que falta para o ticket médio e o valor ganho da aba Métricas.
 */
const DESFECHOS: Partial<Record<ProspectWithCompany['stage'], (p: ProspectWithCompany) => JSX.Element>> = {
  ganho: (p) =>
    p.won_value === null ? (
      <span className="inline-flex items-center gap-1 rounded-md bg-warning-subtle px-1.5 py-0.5 text-xs font-medium text-warning-emphasis">
        <CircleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
        Sem valor
      </span>
    ) : (
      <span className="flex items-center gap-1 text-xs font-medium text-success-emphasis">
        <BadgeDollarSign className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="truncate tabular-nums">{formatCurrency(p.won_value)}</span>
      </span>
    ),
  descartado: (p) => (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <XCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{getDiscardReasonLabel(p.discard_reason)}</span>
    </span>
  ),
};

function DesfechoDoCard({ prospect }: { prospect: ProspectWithCompany }) {
  return DESFECHOS[prospect.stage]?.(prospect) ?? null;
}

function formatarData(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}
