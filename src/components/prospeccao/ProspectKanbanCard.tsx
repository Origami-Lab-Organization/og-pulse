import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { BadgeDollarSign, CircleAlert, MessagesSquare, Route, User, Users, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { formatCurrency } from '@/lib/formatters';
import { otherOpportunitiesInProgress } from '@/lib/prospecting/companyStatus';
import { cn } from '@/lib/utils';
import {
  describeOpportunityContacts,
  getDiscardReasonLabel,
  getLeverLabel,
  getProspectStageLabel,
  isTaskOverdue,
  opportunityName,
  type PendingTaskLite,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';

interface ProspectKanbanCardProps {
  prospect: ProspectWithCompany;
  currentStage: ProspectStage;
  /** Empresa → oportunidades em andamento; o card procura aqui as OUTRAS da mesma empresa. */
  emAndamentoPorEmpresa: Map<string, ProspectWithCompany[]>;
  /** A tarefa pendente mais urgente da oportunidade — é ela, e só ela, que avisa vencimento. */
  proximaTarefa?: PendingTaskLite;
  onOpen: (prospect: ProspectWithCompany) => void;
  isOverlay?: boolean;
}

/**
 * O card mostra o que serve para ESCOLHER de longe: qual empresa, com quem, de onde veio e de
 * quem é. Desde 09/10/2026 o card é a oportunidade da empresa e leva o nome dela; as pessoas
 * aparecem resumidas ("Fernanda Castro +2"), decisor primeiro.
 *
 * Contagem de atividades e canal saíram — são detalhe de execução, e quem precisa deles já
 * está com o card aberto. Alavanca e responsável, ao contrário, são os dois cortes pelos
 * quais se varre o board: "o que veio de feira" e "o que é meu".
 */
export function ProspectKanbanCard({
  prospect,
  currentStage,
  emAndamentoPorEmpresa,
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
  const outrasEmAndamento = otherOpportunitiesInProgress(prospect, emAndamentoPorEmpresa);
  const contatos = describeOpportunityContacts(prospect);

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
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{opportunityName(prospect)}</span>
            {outrasEmAndamento.length > 0 && (
              <OutrasOportunidades oportunidades={outrasEmAndamento} nomeDe={(id) => byId.get(id)?.nome} />
            )}
          </span>
          <span className={cn('flex items-center gap-1 text-xs', contatos ? 'text-muted-foreground' : 'text-muted-foreground/70')}>
            <Users className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{contatos ?? 'Sem contato'}</span>
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
 * A empresa tem OUTRA oportunidade no funil, de "Em cadência" em diante (09/10/2026,
 * Guilherme). Antes o balão olhava outros contatos e só a partir de "Respondeu"; com o card
 * sendo da empresa, uma segunda oportunidade em cadência já é a conta sendo abordada duas vezes.
 */
function OutrasOportunidades({
  oportunidades,
  nomeDe,
}: {
  oportunidades: ProspectWithCompany[];
  nomeDe: (id: string) => string | undefined;
}) {
  const detalhe = oportunidades
    .map((o) => {
      const dono = o.owner_id ? nomeDe(o.owner_id) : undefined;
      return `${getProspectStageLabel(o.stage)}${dono ? `, com ${dono}` : ''}`;
    })
    .join('; ');
  const texto = `${oportunidades.length === 1 ? 'Outra oportunidade' : `Outras ${oportunidades.length} oportunidades`} desta empresa em andamento: ${detalhe}`;

  return (
    <span
      title={texto}
      className="inline-flex shrink-0 items-center rounded-md bg-warning-subtle p-1 text-warning-emphasis"
    >
      <MessagesSquare className="h-3 w-3" aria-hidden="true" />
      <span className="sr-only">{texto}</span>
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
