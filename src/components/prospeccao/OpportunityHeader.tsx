import {
  BadgeDollarSign,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
  Undo2,
  XCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProspectBudget } from '@/hooks/useProspectDeal';
import { formatCurrency } from '@/lib/formatters';
import { iniciaisDe } from '@/lib/prospecting/iniciais';
import { formatarData } from '@/lib/prospecting/prazos';
import { prospectValueSource, resolveProspectValue, type ProspectValueSource } from '@/lib/prospecting/value';
import { cn } from '@/lib/utils';
import {
  canWin,
  getDiscardReasonLabel,
  getProspectStageColor,
  getProspectStageLabel,
  isProspectClosed,
  opportunityName,
  previousStagesOf,
  type ProspectActivityWithOwner,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';
import { ProspectAdvanceButton } from './ProspectAdvanceButton';
import { ProspectStageStepper } from './ProspectStageStepper';

interface OpportunityHeaderProps {
  prospect: ProspectWithCompany;
  atividades: ProspectActivityWithOwner[];
  somenteLeitura: boolean;
  editando: boolean;
  onEditar: () => void;
  onGanhar: () => void;
  onDescartar: () => void;
  /** Reunião feita: abre o registro de como a reunião foi. */
  onRegistrarReuniao: () => void;
  onReabrir: () => void;
  onDesfazerGanho: () => void;
  onVoltar: (stage: ProspectStage) => void;
  onExcluir: () => void;
}

/**
 * O topo da ficha (09/10/2026): quem é, onde está e o que fazer agora. À direita do nome, os
 * três números que respondem "como vai" sem descer à linha do tempo; embaixo, a régua das
 * etapas e, ao lado dela, os dois movimentos que importam — perder ou avançar.
 *
 * O "x" de fechar é do próprio diálogo, no canto: o `pr-10` da primeira linha guarda o lugar.
 */
export function OpportunityHeader(props: OpportunityHeaderProps) {
  const { prospect, atividades } = props;
  const nome = opportunityName(prospect);
  const respostas = atividades.filter((a) => a.got_response).length;

  return (
    <DialogHeader className="space-y-4 border-b px-6 pb-4 pt-5 text-left">
      <div className="flex flex-wrap items-start gap-4 pr-10">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{iniciaisDe(nome)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-xl font-semibold leading-tight">{nome}</DialogTitle>
            <Badge variant="secondary" className={cn('rounded-full font-medium', getProspectStageColor(prospect.stage))}>
              {getProspectStageLabel(prospect.stage)}
            </Badge>
            {props.somenteLeitura && <Badge variant="outline">Somente leitura</Badge>}
          </div>
          <DialogDescription className="text-sm">{subtitulo(prospect, atividades)}</DialogDescription>
          <DesfechoDaOportunidade prospect={prospect} onGanhar={props.onGanhar} />
        </div>

        <Indicadores prospect={prospect} respostas={respostas} />
        <MenuDaOportunidade {...props} />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <ProspectStageStepper stage={prospect.stage} className="min-w-[280px] flex-1" />
        <AcoesDeEtapa {...props} />
      </div>
    </DialogHeader>
  );
}

/** "Calçados / Injetados · Último contato em 01/10/2026". */
function subtitulo(prospect: ProspectWithCompany, atividades: ProspectActivityWithOwner[]): string {
  const ultima = atividades[0]?.activity_date;
  return [
    prospect.company?.segment,
    ultima ? `Último contato em ${formatarData(ultima)}` : 'Nenhum contato registrado ainda',
  ]
    .filter(Boolean)
    .join(' · ');
}

const ROTULO_DO_VALOR: Record<ProspectValueSource, string> = {
  vendido: 'Valor vendido',
  orcamento: 'Valor orçado',
  estimado: 'Valor estimado',
};

/**
 * O valor diz de onde veio (vendido, orçado ou estimado): quem lê "R$ 48 mil" precisa saber
 * se é fato ou palpite. Regra única em `resolveProspectValue` (ADR-0017).
 */
function Indicadores({ prospect, respostas }: { prospect: ProspectWithCompany; respostas: number }) {
  const { data: orcamento } = useProspectBudget(prospect.id);
  const comOrcamento = { ...prospect, budget: orcamento ?? null };
  const valor = resolveProspectValue(comOrcamento);
  const itens = [
    { rotulo: ROTULO_DO_VALOR[prospectValueSource(comOrcamento)], valor: valor > 0 ? formatCurrency(valor) : '—' },
    { rotulo: 'Atividades', valor: String(prospect.activity_count) },
    { rotulo: 'Respostas', valor: String(respostas) },
  ];

  return (
    <dl className="flex shrink-0 divide-x rounded-lg border bg-card">
      {itens.map((item) => (
        <div key={item.rotulo} className="px-4 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{item.rotulo}</dt>
          <dd className="mt-0.5 text-base font-semibold tabular-nums">{item.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Perder ou avançar, ao lado da régua. O avanço é sempre o próximo passo da etapa (o mesmo
 * botão de antes, agora como primário): em Qualificada, "Marcar ganho".
 */
function AcoesDeEtapa(props: OpportunityHeaderProps) {
  const { prospect, somenteLeitura } = props;
  if (somenteLeitura || isProspectClosed(prospect.stage)) return null;
  return (
    <div className="flex items-center gap-2 lg:border-l lg:pl-5">
      <Button
        variant="outline"
        className="border-destructive/30 text-destructive hover:bg-destructive-subtle hover:text-destructive"
        onClick={props.onDescartar}
      >
        Marcar perda
      </Button>
      <ProspectAdvanceButton
        prospect={prospect}
        onPrompt={props.onRegistrarReuniao}
        onWin={props.onGanhar}
        variant="default"
      />
    </div>
  );
}

const ETAPA_GANHO: ProspectStage = 'ganho';
/** Perda, e o "Sem resposta" das linhas antigas: os dois reabrem em "A abordar". */
const PERDIDO = new Set<ProspectStage>(['descartado', 'sem_resposta']);

/** O desfecho por extenso: quando e quanto vendemos, ou por que perdemos. */
function DesfechoDaOportunidade({ prospect, onGanhar }: { prospect: ProspectWithCompany; onGanhar: () => void }) {
  if (PERDIDO.has(prospect.stage)) {
    return <p className="text-xs text-muted-foreground">Motivo da perda: {getDiscardReasonLabel(prospect.discard_reason)}</p>;
  }
  if (prospect.stage !== ETAPA_GANHO || !prospect.won_on) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Ganho em {formatarData(prospect.won_on)}
      {' · '}
      {prospect.won_value === null ? (
        <button type="button" onClick={onGanhar} className="font-medium text-warning-emphasis underline-offset-2 hover:underline">
          sem valor — registrar
        </button>
      ) : (
        <span className="font-medium text-foreground">{formatCurrency(prospect.won_value)}</span>
      )}
    </p>
  );
}

function MenuDaOportunidade(props: OpportunityHeaderProps) {
  const { prospect, somenteLeitura, editando } = props;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Ações da oportunidade">
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!somenteLeitura && (
          <DropdownMenuItem onSelect={props.onEditar}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            {editando ? 'Cancelar edição' : 'Editar'}
          </DropdownMenuItem>
        )}
        <ItensDeGanho {...props} />
        <ItensDePerda {...props} />
        {!somenteLeitura && <ItensDeVolta stage={prospect.stage} onVoltar={props.onVoltar} />}
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={props.onExcluir}>
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Excluir oportunidade
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Voltar para qualquer etapa anterior (01/10/2026). Move direto: é correção, e a atividade
 * registrada continua contando — só a etapa volta.
 */
function ItensDeVolta({ stage, onVoltar }: { stage: ProspectStage; onVoltar: (stage: ProspectStage) => void }) {
  const anteriores = previousStagesOf(stage);
  if (anteriores.length === 0) return null;
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />
        Voltar para…
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {anteriores.map((etapa) => (
          <DropdownMenuItem key={etapa} onSelect={() => onVoltar(etapa)}>
            {getProspectStageLabel(etapa)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

/** Ganho no menu: registrar, corrigir e desfazer — cada um só onde faz sentido. */
function ItensDeGanho(props: OpportunityHeaderProps) {
  const { prospect } = props;
  const ganho = prospect.stage === ETAPA_GANHO;
  if (!ganho && !canWin(prospect)) return null;
  return (
    <>
      <DropdownMenuItem onSelect={props.onGanhar}>
        <BadgeDollarSign className="mr-2 h-4 w-4" aria-hidden="true" />
        {ganho ? 'Editar ganho' : 'Registrar ganho'}
      </DropdownMenuItem>
      {ganho && (
        <DropdownMenuItem onSelect={props.onDesfazerGanho}>
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          Desfazer ganho
        </DropdownMenuItem>
      )}
    </>
  );
}

function ItensDePerda(props: OpportunityHeaderProps) {
  const { prospect, somenteLeitura } = props;
  if (PERDIDO.has(prospect.stage)) {
    return (
      <DropdownMenuItem onSelect={props.onReabrir}>
        <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
        Reabrir
      </DropdownMenuItem>
    );
  }
  if (somenteLeitura) return null;
  return (
    <DropdownMenuItem onSelect={props.onDescartar}>
      <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
      Registrar perda
    </DropdownMenuItem>
  );
}
