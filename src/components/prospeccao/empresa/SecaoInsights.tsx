import { useInsightsDaEmpresa, useVersaoEscolhida } from '@/hooks/useInsightsDaEmpresa';
import { useAuth } from '@/contexts/AuthContext';
import { SECAO_DA_EMPRESA } from '@/lib/prospecting/faseDaEmpresa.constants';
import { TEMAS_DOS_INSIGHTS } from '@/lib/prospecting/insights.constants';
import type { PropsDoBlocoDoTema } from '@/types/insights';
import { Bloco, Secao } from './PecasDaPagina';
import { AcaoDoTema, ListaDoTema, SeletorDeVersao } from './PecasDosInsights';

/** Sem versão: o "Gerar com IA" no meio do bloco, para quem gera; para quem só lê, um traço. */
function VazioDoTema(props: { companyId: string; tema: PropsDoBlocoDoTema['tema'] }) {
  const { companyId, tema } = props;
  const { can } = useAuth();
  return (
    <div className="flex flex-1 items-center justify-center py-6">
      {can('prospeccao:gerar-insights')
        ? <AcaoDoTema companyId={companyId} tema={tema} jaTem={false} destaque />
        : <span className="text-sm text-muted-foreground">—</span>}
    </div>
  );
}

/** Um tema (como os blocos do Econodata): o seu botão, a sua data e as suas versões. */
function BlocoDoTema(props: PropsDoBlocoDoTema) {
  const { companyId, tema, rotulo, insights } = props;
  const versoes = insights.versoesDo(tema);
  const { versao, escolher } = useVersaoEscolhida(versoes);
  return (
    <Bloco titulo={rotulo} className="min-h-[200px]" acao={<SeletorDeVersao versoes={versoes} valor={versao?.id} onTrocar={escolher} />}>
      {versao ? <ListaDoTema itens={versao.temas[tema] ?? []} /> : <VazioDoTema companyId={companyId} tema={tema} />}
      {versao && (
        <div className="mt-auto flex justify-end border-t pt-2.5">
          <AcaoDoTema companyId={companyId} tema={tema} jaTem />
        </div>
      )}
    </Bloco>
  );
}

/**
 * Insights de IA (US-0057, ADR-0057): produtos e serviços, clientes, concorrentes e notícias, cada um
 * com as fontes, gerados pelo runner local de quem tem `prospeccao:gerar-insights`.
 */
export function SecaoInsights({ companyId }: { companyId: string }) {
  const insights = useInsightsDaEmpresa(companyId);
  return (
    <Secao id={SECAO_DA_EMPRESA.INSIGHTS} titulo="Insights de IA">
      <div className="grid gap-3 md:grid-cols-2">
        {TEMAS_DOS_INSIGHTS.map((t) => <BlocoDoTema key={t.chave} companyId={companyId} tema={t.chave} rotulo={t.rotulo} insights={insights} />)}
      </div>
    </Secao>
  );
}
