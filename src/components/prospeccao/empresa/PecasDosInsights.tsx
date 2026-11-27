import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAcaoDoTema } from '@/hooks/useInsightsDaEmpresa';
import { dominioDaFonte, quandoFoiGerado } from '@/lib/prospecting/insights';
import { PEDIDO_ABERTO, ROTULO_DO_PEDIDO_ABERTO, STATUS_DO_PEDIDO } from '@/lib/prospecting/insights.constants';
import type { FonteDoInsight, ItemDoInsight, PedidoDeInsights, PropsDaAcaoDoTema, PropsDoSeletorDeVersao } from '@/types/insights';
import { ETIQUETA } from './PecasDaPagina';
import { GerarDeNovoDialog } from './GerarDeNovoDialog';

/** Peças dos insights de IA (US-0057), usadas na aba Insights de IA e no cartão Porte. */


export function LinkDaFonte({ fonte }: { fonte: FonteDoInsight }) {
  return (
    <a
      href={fonte.url}
      target="_blank"
      rel="noopener noreferrer"
      title={fonte.titulo ?? fonte.url}
      className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {dominioDaFonte(fonte.url)}
    </a>
  );
}

export function ListaDoTema({ itens }: { itens: ItemDoInsight[] }) {
  if (!itens.length) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <ul className="space-y-3">
      {itens.map((item) => (
        <li key={item.texto} className="space-y-0.5">
          <p className="text-[13.5px] leading-snug">{item.texto}</p>
          <div className="flex flex-wrap gap-x-2">{item.fontes.map((f) => <LinkDaFonte key={f.url} fonte={f} />)}</div>
        </li>
      ))}
    </ul>
  );
}

export function SeletorDeVersao(props: PropsDoSeletorDeVersao) {
  const { versoes, valor, onTrocar } = props;
  if (versoes.length < 2) return versoes.length ? <span className="text-xs text-muted-foreground">{quandoFoiGerado(versoes[0].gerado_em)}</span> : null;
  return (
    <Select value={valor ?? ''} onValueChange={onTrocar}>
      <SelectTrigger className="h-7 w-[150px] text-xs" aria-label="Versão"><SelectValue /></SelectTrigger>
      <SelectContent>
        {versoes.map((v) => <SelectItem key={v.id} value={v.id} className="text-xs">{quandoFoiGerado(v.gerado_em)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** Na fila ou gerando, com o rótulo do status; sem pedido aberto, o runner está fora do ar. */
function SituacaoDoTema({ pedido }: { pedido: PedidoDeInsights | null }) {
  const rotulo = pedido ? ROTULO_DO_PEDIDO_ABERTO[pedido.status] : undefined;
  if (!rotulo) return <span className={ETIQUETA}>Runner indisponível</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      {rotulo}
    </span>
  );
}

function FalhaDoTema({ pedido }: { pedido: PedidoDeInsights | null }) {
  if (pedido?.status !== STATUS_DO_PEDIDO.FALHOU) return null;
  return <span className="text-xs text-destructive">Falhou · {pedido.erro ?? 'tente de novo'}</span>;
}

const LINK = 'inline-flex items-center gap-1 rounded-sm text-[12px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';

function BotaoDeGerar({ destaque, jaTem, disabled, onClick }: { destaque?: boolean; jaTem: boolean; disabled: boolean; onClick: () => void }) {
  if (destaque) {
    return (
      <Button variant="outline" size="sm" disabled={disabled} onClick={onClick}>
        <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Gerar com IA
      </Button>
    );
  }
  return (
    <button type="button" className={LINK} disabled={disabled} onClick={onClick}>
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      {jaTem ? 'Gerar de novo' : 'Gerar com IA'}
    </button>
  );
}

/**
 * O "Gerar com IA" de um tema (US-0057): só para quem tem `prospeccao:gerar-insights`. Mostra o
 * andamento do último pedido do tema e a falha, se houve; sem o runner ativo, não deixa pedir.
 */
export function AcaoDoTema(props: PropsDaAcaoDoTema) {
  const { companyId, tema, jaTem, destaque, rotulo = '' } = props;
  const acao = useAcaoDoTema(companyId, tema);
  const [perguntando, perguntar] = useState(false);
  if (!acao.podeGerar) return null;
  const clicar = () => (jaTem ? perguntar(true) : acao.pedir());
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      <FalhaDoTema pedido={acao.pedido} />
      {acao.esperando
        ? <SituacaoDoTema pedido={acao.aberto ? acao.pedido : null} />
        : <BotaoDeGerar destaque={destaque} jaTem={jaTem} disabled={acao.ocupado} onClick={clicar} />}
      <GerarDeNovoDialog
        aberto={perguntando}
        rotulo={rotulo}
        pendente={acao.ocupado}
        onFechar={() => perguntar(false)}
        onGerar={(orientacao) => acao.pedir(orientacao, () => perguntar(false))}
      />
    </span>
  );
}
