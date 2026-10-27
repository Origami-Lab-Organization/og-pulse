import { useState } from 'react';
import {
  BadgeDollarSign,
  Check,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
  Undo2,
  X,
  XCircle,
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectBudget } from '@/hooks/useProspectDeal';
import { useUpdateProspect } from '@/hooks/useProspects';
import { formatCurrency } from '@/lib/formatters';
import { formatarData } from '@/lib/prospecting/prazos';
import { prospectValueSource, resolveProspectValue, type ProspectValueSource } from '@/lib/prospecting/value';
import { cn } from '@/lib/utils';
import {
  canWin,
  getProspectStageColor,
  getProspectStageLabel,
  hasOwnOpportunityName,
  isProspectClosed,
  OPPORTUNITY_TITLE_MAX,
  opportunityName,
  previousStagesOf,
  type ProspectActivityWithOwner,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';
import { ProspectAdvanceButton } from './ProspectAdvanceButton';
import { OpportunityOutcomeStrip } from './OpportunityOutcomeStrip';
import { ProspectStageStepper } from './ProspectStageStepper';

interface OpportunityHeaderProps {
  prospect: ProspectWithCompany;
  atividades: ProspectActivityWithOwner[];
  /** Nome de quem conduz, já resolvido no diretório. */
  responsavel: string | null;
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
  onCriarProjeto: () => void;
}

/**
 * O topo da ficha: quem é, onde está e o que fazer agora (09/10/2026; refeito em 27/10/2026).
 *
 * Primeira linha: o nome e a etapa à esquerda; à direita, perder ou avançar e o menu. Embaixo
 * do nome, quem conduz e os números em texto corrido. Por último, a régua das etapas com a
 * largura inteira — dividindo a linha com os botões ela estourava a ficha e quebrava os
 * rótulos — e, encerrada a oportunidade, a faixa do desfecho no lugar dela.
 *
 * O "x" de fechar é do próprio diálogo, no canto: o `pr-10` da primeira linha guarda o lugar.
 */
export function OpportunityHeader(props: OpportunityHeaderProps) {
  const { prospect, atividades } = props;
  const { can } = useAuth();
  const encerrada = isProspectClosed(prospect.stage);

  return (
    // `sm:pr-6`: o DialogHeader do shadcn zera o padding direito a partir de `sm`, e a régua
    // encostava na borda da ficha.
    <DialogHeader className="space-y-4 border-b px-6 pb-4 pt-5 text-left sm:pr-6">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 pr-10">
        <div className="min-w-0 flex-1 space-y-1.5">
          <TituloDaOportunidade prospect={prospect} podeEditar={!props.somenteLeitura && can('prospeccao:editar')} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge variant="secondary" className={cn('rounded-full font-medium', getProspectStageColor(prospect.stage))}>
              {getProspectStageLabel(prospect.stage)}
            </Badge>
            {props.somenteLeitura && <Badge variant="outline">Somente leitura</Badge>}
            <DialogDescription className="text-sm">{subtitulo(prospect, atividades, props.responsavel)}</DialogDescription>
            <Indicadores prospect={prospect} atividades={atividades} comValor={!encerrada} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AcoesDeEtapa {...props} />
          <MenuDaOportunidade {...props} />
        </div>
      </div>

      {encerrada ? (
        <OpportunityOutcomeStrip
          prospect={prospect}
          onGanhar={props.onGanhar}
          onReabrir={props.onReabrir}
          onCriarProjeto={props.onCriarProjeto}
        />
      ) : (
        <ProspectStageStepper stage={prospect.stage} />
      )}
    </DialogHeader>
  );
}

/**
 * O nome da oportunidade, editável no lugar (09/10/2026). Vazio volta ao nome da empresa —
 * é o padrão, e é o que a maioria das oportunidades usa.
 */
function TituloDaOportunidade({ prospect, podeEditar }: { prospect: ProspectWithCompany; podeEditar: boolean }) {
  const [editando, setEditando] = useState(false);
  if (editando) return <EdicaoDoTitulo prospect={prospect} onFechar={() => setEditando(false)} />;
  // O lápis cola no fim do nome e só aparece ao passar o mouse (ou no foco do teclado): fixo,
  // num nome longo ele ia sozinho para a linha de baixo.
  return (
    <div className="group flex min-w-0 items-start gap-1">
      <DialogTitle className="line-clamp-2 text-lg font-semibold leading-snug" title={opportunityName(prospect)}>
        {opportunityName(prospect)}
      </DialogTitle>
      {podeEditar && (
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
          aria-label="Editar nome da oportunidade"
          title="Editar nome"
          onClick={() => setEditando(true)}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

function EdicaoDoTitulo({ prospect, onFechar }: { prospect: ProspectWithCompany; onFechar: () => void }) {
  const atualizar = useUpdateProspect();
  const [texto, setTexto] = useState(prospect.title ?? '');
  const salvar = () =>
    atualizar.mutate({ id: prospect.id, updates: { title: texto.trim() || null } }, { onSuccess: onFechar });

  return (
    <form
      className="flex w-full max-w-md items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
    >
      {/* O título continua existindo para o leitor de tela enquanto o campo está aberto. */}
      <DialogTitle className="sr-only">{opportunityName(prospect)}</DialogTitle>
      <Input
        autoFocus
        data-esc-local
        value={texto}
        maxLength={OPPORTUNITY_TITLE_MAX}
        placeholder={prospect.company?.name ?? 'Nome da oportunidade'}
        aria-label="Nome da oportunidade"
        aria-describedby="titulo-oportunidade-dica"
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onFechar()}
        disabled={atualizar.isPending}
        className="h-9 text-base font-semibold"
      />
      <span id="titulo-oportunidade-dica" className="sr-only">Vazio, a oportunidade usa o nome da empresa.</span>
      <Button type="submit" size="icon" className="h-9 w-9 shrink-0" aria-label="Salvar nome" disabled={atualizar.isPending}>
        <Check className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Cancelar edição do nome" onClick={onFechar}>
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </form>
  );
}

/**
 * "Injepol · Victor Couto · Último contato em 01/10/2026" — a empresa só quando o nome é outro.
 * O segmento saiu em 27/10/2026: vindo da Receita, é a descrição inteira do CNAE e empurrava o
 * resto para a segunda linha. Ele continua no cartão da Empresa.
 */
function subtitulo(prospect: ProspectWithCompany, atividades: ProspectActivityWithOwner[], responsavel: string | null): string {
  const ultima = atividades[0]?.activity_date;
  return [
    hasOwnOpportunityName(prospect) ? prospect.company?.name : null,
    responsavel,
    ultima ? `Último contato em ${formatarData(ultima)}` : 'Nenhum contato registrado ainda',
  ]
    .filter(Boolean)
    .join(' · ');
}

const ROTULO_DO_VALOR: Record<ProspectValueSource, string> = {
  vendido: 'vendido',
  orcamento: 'orçado',
  estimado: 'estimado',
};

const contagem = (n: number, singular: string, plural: string) => (n === 1 ? singular : plural);

/**
 * Os números em texto corrido (27/10/2026; antes, três caixas com rótulo em caixa alta). O
 * valor diz de onde veio — vendido, orçado ou estimado (`resolveProspectValue`, ADR-0017) — e
 * sai quando a oportunidade encerra: o ganho já mostra o valor na faixa do desfecho.
 */
function Indicadores(props: { prospect: ProspectWithCompany; atividades: ProspectActivityWithOwner[]; comValor: boolean }) {
  const { prospect, atividades, comValor } = props;
  const { data: orcamento } = useProspectBudget(prospect.id);
  const comOrcamento = { ...prospect, budget: orcamento ?? null };
  const valor = resolveProspectValue(comOrcamento);
  const respostas = atividades.filter((a) => a.got_response).length;
  const itens = [
    comValor && valor > 0 && { rotulo: ROTULO_DO_VALOR[prospectValueSource(comOrcamento)], valor: formatCurrency(valor) },
    { rotulo: contagem(prospect.activity_count, 'atividade', 'atividades'), valor: String(prospect.activity_count) },
    { rotulo: contagem(respostas, 'resposta', 'respostas'), valor: String(respostas) },
  ].filter((item): item is { rotulo: string; valor: string } => !!item);

  return (
    <dl className="flex shrink-0 items-baseline gap-x-4 text-sm">
      {itens.map((item) => (
        <div key={item.rotulo} className="flex items-baseline gap-1">
          <dt className="order-2 text-muted-foreground">{item.rotulo}</dt>
          <dd className="order-1 font-semibold tabular-nums">{item.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Perder ou avançar, no canto da primeira linha. O avanço é sempre o próximo passo da etapa
 * (o mesmo botão de antes, agora como primário): em Qualificada, "Marcar ganho".
 */
function AcoesDeEtapa(props: OpportunityHeaderProps) {
  const { prospect, somenteLeitura } = props;
  if (somenteLeitura || isProspectClosed(prospect.stage)) return null;
  return (
    <>
      <Button
        variant="outline"
        size="sm"
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
        size="sm"
      />
    </>
  );
}

const ETAPA_GANHO: ProspectStage = 'ganho';
/** Perda, e o "Sem resposta" das linhas antigas: os dois reabrem em "A abordar". */
const PERDIDO = new Set<ProspectStage>(['descartado', 'sem_resposta']);

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
