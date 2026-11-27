import { useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useHideValues } from '@/contexts/HideValuesContext';
import { useDecidirProposta, useInsightsDaEmpresa, usePedirInsights, useRunnerDisponivel } from '@/hooks/useInsightsDaEmpresa';
import { reaisCurtos } from '@/lib/prospecting/empresasReceita';
import { CONFIANCA_DO_TIME } from '@/lib/prospecting/funcionarios.constants';
import {
  ESTADO_DA_PROPOSTA, ROTULO_DA_DECISAO, ROTULO_DA_PROPOSTA, ROTULO_DO_PEDIDO_ABERTO, STATUS_DO_PEDIDO,
  TEMAS_DOS_INSIGHTS, TIPO_DE_PROPOSTA,
} from '@/lib/prospecting/insights.constants';
import type {
  FonteDoInsight, ItemDoInsight, PedidoDeInsights, PropostaDePorte, PropsDaAcaoDeGerar, PropsDaDecisaoDaProposta, PropsDoConteudoDaVersao, PropsDoSeletorDeVersao, VersaoDosInsights,
} from '@/types/insights';
import { Cartao, ETIQUETA } from './PecasDaPagina';

const quando = (data: string) => format(new Date(data), 'dd/MM/yyyy HH:mm');

function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function LinkDaFonte({ fonte }: { fonte: FonteDoInsight }) {
  return (
    <a
      href={fonte.url}
      target="_blank"
      rel="noopener noreferrer"
      title={fonte.titulo ?? fonte.url}
      className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {dominio(fonte.url)}
    </a>
  );
}

function ItemDoTema({ item }: { item: ItemDoInsight }) {
  return (
    <li className="space-y-0.5">
      <p className="text-[13.5px] leading-snug">{item.texto}</p>
      <div className="flex flex-wrap gap-x-2">
        {item.fontes.map((f) => <LinkDaFonte key={f.url} fonte={f} />)}
      </div>
    </li>
  );
}

function CartaoDoTema({ rotulo, itens }: { rotulo: string; itens: ItemDoInsight[] }) {
  return (
    <Cartao className="space-y-2.5">
      <span className={ETIQUETA}>{rotulo}</span>
      {itens.length ? <ul className="space-y-2.5">{itens.map((i) => <ItemDoTema key={i.texto} item={i} />)}</ul> : <p className="text-sm text-muted-foreground">—</p>}
    </Cartao>
  );
}

const rotuloDaConfianca = (valor: string) => CONFIANCA_DO_TIME.find((c) => c.valor === valor)?.rotulo.toLowerCase() ?? valor;

function faixaDaProposta(proposta: PropostaDePorte): string {
  const { tipo, de, ate } = proposta;
  if (tipo === TIPO_DE_PROPOSTA.FATURAMENTO) return de === ate ? reaisCurtos(de) : `${reaisCurtos(de)} a ${reaisCurtos(ate)}`;
  const n = (v: number) => v.toLocaleString('pt-BR');
  return de === ate ? n(de) : `${n(de)} a ${n(ate)}`;
}

function DecisaoDaProposta(props: PropsDaDecisaoDaProposta) {
  const { proposta, podeDecidir, companyId } = props;
  const decidir = useDecidirProposta(companyId);
  if (proposta.estado !== ESTADO_DA_PROPOSTA.PROPOSTA) {
    return <span className="text-xs text-muted-foreground">{ROTULO_DA_DECISAO[proposta.estado]} · {proposta.decidida_em ? quando(proposta.decidida_em) : ''}</span>;
  }
  if (!podeDecidir) return null;
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={decidir.isPending} onClick={() => decidir.mutate({ proposta, aceitar: false })}>Recusar</Button>
      <Button size="sm" disabled={decidir.isPending} onClick={() => decidir.mutate({ proposta, aceitar: true })}>Aceitar</Button>
    </div>
  );
}

function PropostasDePorte({ propostas, companyId }: { propostas: PropostaDePorte[]; companyId: string }) {
  const { can } = useAuth();
  useHideValues(); // re-renderiza quando o olho de ocultar valores muda
  if (!propostas.length) return null;
  return (
    <Cartao className="divide-y p-0">
      {propostas.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <span className={ETIQUETA}>{ROTULO_DA_PROPOSTA[p.tipo]}</span>
          <span className="text-sm font-semibold tabular-nums">{faixaDaProposta(p)}</span>
          <span className="text-xs text-muted-foreground">confiança {rotuloDaConfianca(p.confianca)}</span>
          <LinkDaFonte fonte={{ url: p.fonte }} />
          <span className="ml-auto"><DecisaoDaProposta proposta={p} podeDecidir={can('prospeccao:editar')} companyId={companyId} /></span>
        </div>
      ))}
    </Cartao>
  );
}

function SituacaoDoPedido({ pedido, disponivel }: { pedido: PedidoDeInsights | null; disponivel: boolean }) {
  const rotulo = pedido ? ROTULO_DO_PEDIDO_ABERTO[pedido.status] : undefined;
  if (rotulo) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        {rotulo}
      </span>
    );
  }
  if (!disponivel) return <span className={ETIQUETA}>Runner indisponível</span>;
  if (pedido?.status === STATUS_DO_PEDIDO.FALHOU) return <span className="text-xs text-destructive">Falhou · {pedido.erro ?? 'tente de novo'}</span>;
  return null;
}

function AcaoDeGerar(props: PropsDaAcaoDeGerar) {
  const { companyId, pedido, pedidoAberto, jaTem } = props;
  const { data: disponivel = false, isLoading } = useRunnerDisponivel(true);
  const pedir = usePedirInsights(companyId);
  const bloqueado = isLoading || !disponivel || pedidoAberto || pedir.isPending;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SituacaoDoPedido pedido={pedido} disponivel={disponivel || isLoading} />
      <Button variant="outline" size="sm" disabled={bloqueado} onClick={() => pedir.mutate()}>
        <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        {jaTem ? 'Gerar de novo' : 'Gerar insights com IA'}
      </Button>
    </div>
  );
}

function SeletorDeVersao(props: PropsDoSeletorDeVersao) {
  const { versoes, valor, onTrocar } = props;
  if (versoes.length < 2) return versoes.length ? <span className="text-xs text-muted-foreground">{quando(versoes[0].gerado_em)}</span> : null;
  return (
    <Select value={valor ?? ''} onValueChange={onTrocar}>
      <SelectTrigger className="h-8 w-[170px] text-xs" aria-label="Versão dos insights"><SelectValue /></SelectTrigger>
      <SelectContent>
        {versoes.map((v) => <SelectItem key={v.id} value={v.id} className="text-xs">{quando(v.gerado_em)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ConteudoDaVersao({ versao, propostas, companyId }: PropsDoConteudoDaVersao) {
  return (
    <>
      <PropostasDePorte propostas={propostas.filter((p) => p.insight_id === versao.id)} companyId={companyId} />
      <div className="grid gap-3 md:grid-cols-2">
        {TEMAS_DOS_INSIGHTS.map((t) => <CartaoDoTema key={t.chave} rotulo={t.rotulo} itens={versao.temas[t.chave] ?? []} />)}
      </div>
    </>
  );
}

/**
 * Insights de IA (US-0057): os quatro temas com as fontes e a proposta de porte, por versão. Quem
 * tem `prospeccao:gerar-insights` pede; o runner local dessa pessoa gera (ADR-0057).
 */
/** A versão mostrada: a escolhida no seletor ou, sem escolha, a mais recente. */
function useVersaoEscolhida(versoes: VersaoDosInsights[]) {
  const [escolhida, escolher] = useState<string | null>(null);
  return { versao: versoes.find((v) => v.id === escolhida) ?? versoes[0], escolher };
}

export function InsightsDaIA({ companyId }: { companyId: string }) {
  const { can } = useAuth();
  const podeGerar = can('prospeccao:gerar-insights');
  const { pedido, pedidoAberto, versoes, propostas } = useInsightsDaEmpresa(companyId);
  const { versao, escolher } = useVersaoEscolhida(versoes);
  if (!podeGerar && !versao) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          Insights de IA
        </h3>
        <SeletorDeVersao versoes={versoes} valor={versao?.id} onTrocar={escolher} />
        {podeGerar && <span className="ml-auto"><AcaoDeGerar companyId={companyId} pedido={pedido} pedidoAberto={pedidoAberto} jaTem={!!versao} /></span>}
      </div>
      {versao && <ConteudoDaVersao versao={versao} propostas={propostas} companyId={companyId} />}
    </div>
  );
}
