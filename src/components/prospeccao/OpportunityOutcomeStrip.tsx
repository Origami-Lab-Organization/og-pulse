import { ArrowRight, Briefcase, CircleCheck, Plus, RotateCcw, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectProject } from '@/hooks/useProspectDeal';
import { formatCurrency } from '@/lib/formatters';
import { formatarData } from '@/lib/prospecting/prazos';
import {
  getDiscardReasonLabel,
  outcomeDateOf,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';

interface OpportunityOutcomeStripProps {
  prospect: ProspectWithCompany;
  /** Abre o diálogo de data e valor do ganho — o "sem valor — registrar". */
  onGanhar: () => void;
  onReabrir: () => void;
  onCriarProjeto: () => void;
}

const ETAPA_GANHO: ProspectStage = 'ganho';
/** Perda, e o "Sem resposta" das linhas antigas: os dois reabrem em "A abordar". */
const PERDIDO = new Set<ProspectStage>(['descartado', 'sem_resposta']);

/**
 * O desfecho no topo da ficha (27/10/2026), no lugar da régua de etapas: numa oportunidade
 * encerrada a régua inteira pintada não dizia nada, e o projeto do Ganho — o próximo passo —
 * ficava no pé da coluna da esquerda, abaixo dos contatos.
 */
export function OpportunityOutcomeStrip(props: OpportunityOutcomeStripProps) {
  if (props.prospect.stage === ETAPA_GANHO) return <FaixaDoGanho {...props} />;
  if (PERDIDO.has(props.prospect.stage)) return <FaixaDaPerda {...props} />;
  return null;
}

function FaixaDoGanho(props: OpportunityOutcomeStripProps) {
  const { prospect, onGanhar, onCriarProjeto } = props;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-success/25 bg-success-subtle px-4 py-2.5">
      <CircleCheck className="h-5 w-5 shrink-0 text-success-emphasis" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold text-success-emphasis">
          Ganho{prospect.won_on ? ` em ${formatarData(prospect.won_on)}` : ''}
        </span>
        <span className="text-muted-foreground"> · </span>
        {prospect.won_value === null ? (
          <button
            type="button"
            onClick={onGanhar}
            className="rounded font-medium text-warning-emphasis underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            sem valor — registrar
          </button>
        ) : (
          <span className="font-semibold tabular-nums text-foreground">{formatCurrency(prospect.won_value)}</span>
        )}
      </p>
      <ProjetoDoGanho prospectId={prospect.id} onCriar={onCriarProjeto} />
    </div>
  );
}

/** O projeto que nasceu do ganho: abrir o criado, ou criar (o "Fechar negócio" de antes). */
function ProjetoDoGanho(props: { prospectId: string; onCriar: () => void }) {
  const { prospectId, onCriar } = props;
  const { can } = useAuth();
  const { data: projeto, isLoading } = useProspectProject(prospectId);
  if (isLoading) return <Skeleton className="h-9 w-40" />;
  if (projeto) {
    return (
      <Button variant="outline" size="sm" className="h-9 max-w-full bg-card" asChild>
        <Link to={`/projects/${projeto.id}`} title={`Abrir o projeto ${projeto.name}`}>
          <Briefcase className="mr-1.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="max-w-[18rem] truncate">{projeto.name}</span>
          <ArrowRight className="ml-1.5 h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      </Button>
    );
  }
  if (!can('projeto:editar')) return <p className="text-xs text-muted-foreground">Nenhum projeto criado ainda.</p>;
  return (
    <Button size="sm" className="h-9" onClick={onCriar}>
      <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
      Criar projeto
    </Button>
  );
}

function FaixaDaPerda(props: OpportunityOutcomeStripProps) {
  const { prospect, onReabrir } = props;
  const dia = outcomeDateOf(prospect);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/50 px-4 py-2.5">
      <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">Perdida{dia ? ` em ${formatarData(dia)}` : ''}</span>
        <span className="text-muted-foreground"> · Motivo: {getDiscardReasonLabel(prospect.discard_reason)}</span>
      </p>
      <Button variant="outline" size="sm" className="h-9 bg-card" onClick={onReabrir}>
        <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Reabrir
      </Button>
    </div>
  );
}
