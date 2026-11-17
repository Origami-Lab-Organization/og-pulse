import { useState } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EstadoVazio, RodapeDaLista } from '@/components/prospeccao/ListaDeCadastro';
import {
  ErroDaBase,
  LIMITE_DE_NAVEGACAO,
  POR_PAGINA_RECEITA,
  SEM_PERMISSAO,
  useEmpresasReceita,
  useTotalReceita,
} from '@/hooks/useEmpresasReceita';
import {
  alternarOrdenacao,
  dataDaBase,
  ORDENACAO_PADRAO,
  type OrdemReceita,
  type TotalReceita,
} from '@/lib/prospecting/empresasReceita';
import { contarFiltros, FILTROS_VAZIOS, filtrosDoNavegador, guardarFiltros } from '@/lib/prospecting/filtrosReceita';
import type { FiltrosReceita } from '@/types/filtrosReceita';
import { cn } from '@/lib/utils';
import { EmpresasReceitaTable } from './EmpresasReceitaTable';
import { PainelDeFiltros } from './PainelDeFiltros';

const RECORTE =
  'Ficam fora: empresas baixadas, inaptas ou suspensas, filiais, ME e EPP, órgãos públicos, condomínios, igrejas, partidos e candidatos. As filiais aparecem na ficha da matriz.';

/** Aba "A classificar" da tela Empresas: a base da Receita, filtrada e página por página (US-0002, US-0003). */
export function EmpresasDaReceita() {
  const [filtros, setFiltros] = useState<FiltrosReceita>(filtrosDoNavegador);
  const [painelAberto, setPainelAberto] = useState(true);
  const [ordenacao, setOrdenacao] = useState(ORDENACAO_PADRAO);
  const [pagina, setPagina] = useState(0);
  const consulta = useEmpresasReceita(filtros, ordenacao, pagina);
  const contagem = useTotalReceita(filtros);
  const ativos = contarFiltros(filtros);

  const filtrar = (novos: FiltrosReceita) => {
    setFiltros(novos);
    guardarFiltros(novos);
    setPagina(0);
  };
  const ordenar = (ordem: OrdemReceita) => {
    setOrdenacao((atual) => alternarOrdenacao(atual, ordem));
    setPagina(0);
  };
  const limpar = () => filtrar(FILTROS_VAZIOS);

  return (
    <div className={cn('grid items-start gap-3.5', painelAberto && 'lg:grid-cols-[minmax(0,1fr)_288px]')}>
      <section className="min-w-0 space-y-3" aria-label="Empresas encontradas">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <LinhaDoTotal contagem={contagem.data} contando={contagem.isFetching} carregadaEm={consulta.data?.carregadaEm ?? null} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPainelAberto((aberto) => !aberto)}
            aria-expanded={painelAberto}
            aria-label={ativos ? `Filtros, ${ativos} ativo${ativos > 1 ? 's' : ''}` : 'Filtros'}
          >
            <Filter className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Filtros
            {ativos > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 font-mono text-[11px] text-primary-foreground">{ativos}</span>}
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Conteudo consulta={consulta} ordenacao={ordenacao} onOrdenar={ordenar} onLimpar={limpar} />
          <Rodape contagem={contagem.data} pagina={pagina} onPagina={setPagina} vazia={!consulta.data?.linhas.length} />
        </div>
      </section>
      {painelAberto && <PainelDeFiltros filtros={filtros} onChange={filtrar} onLimpar={limpar} onRecolher={() => setPainelAberto(false)} />}
    </div>
  );
}

function LinhaDoTotal(props: { contagem: TotalReceita | undefined; contando: boolean; carregadaEm: string | null }) {
  const { contagem, contando, carregadaEm } = props;
  const data = dataDaBase(carregadaEm);
  const total = contagem?.total;
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 text-[13px] text-muted-foreground" aria-live="polite">
      {total == null || contando ? (
        <span>contando…</span>
      ) : (
        <>
          <b className="font-mono font-semibold tabular-nums text-foreground">
            {contagem?.limitado ? 'mais de ' : ''}
            {total.toLocaleString('pt-BR')}
          </b>
          <span>empresas</span>
        </>
      )}
      <span title={RECORTE}>· só matrizes ativas, fora ME e EPP</span>
      {data && <span>· base de {data}</span>}
    </p>
  );
}

function Conteudo(props: {
  consulta: ReturnType<typeof useEmpresasReceita>;
  ordenacao: typeof ORDENACAO_PADRAO;
  onOrdenar: (ordem: OrdemReceita) => void;
  onLimpar: () => void;
}) {
  const { consulta, ordenacao, onOrdenar, onLimpar } = props;
  if (consulta.isLoading) return <Carregando />;
  if (consulta.error) return <Falha erro={consulta.error} onTentar={() => consulta.refetch()} />;
  if (!consulta.data || consulta.data.totalDaBase == null) {
    return (
      <EstadoVazio
        titulo="A base da Receita ainda não foi carregada"
        texto="Quando a primeira carga terminar, as empresas do país aparecem aqui."
      />
    );
  }
  if (!consulta.data.linhas.length) {
    return (
      <EstadoVazio titulo="Nenhuma empresa com esses filtros" texto="Tire algum filtro para ver mais empresas.">
        <Button variant="outline" size="sm" className="mt-1" onClick={onLimpar}>Limpar filtros</Button>
      </EstadoVazio>
    );
  }
  const trocando = consulta.isPlaceholderData;
  return (
    <div className={cn('overflow-x-auto transition-opacity', trocando && 'opacity-60')} aria-busy={trocando}>
      <EmpresasReceitaTable linhas={consulta.data.linhas} ordenacao={ordenacao} onOrdenar={onOrdenar} />
    </div>
  );
}

function Rodape(props: { contagem: TotalReceita | undefined; pagina: number; onPagina: (p: number) => void; vazia: boolean }) {
  const { contagem, pagina, onPagina, vazia } = props;
  if (vazia || !contagem?.total) return null;
  return (
    <RodapeDaLista
      texto={textoDoRodape(pagina, contagem)}
      pagina={pagina}
      totalDePaginas={Math.ceil(Math.min(contagem.total, LIMITE_DE_NAVEGACAO) / POR_PAGINA_RECEITA)}
      onPagina={onPagina}
    />
  );
}

function Carregando() {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-label="Carregando empresas">
      {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}

function Falha({ erro, onTentar }: { erro: Error; onTentar: () => void }) {
  if (erro instanceof ErroDaBase && erro.falha === SEM_PERMISSAO) {
    return (
      <EstadoVazio
        titulo="Você não tem acesso à base da Receita"
        texto="Peça a quem administra o Pulse a permissão de ver a Prospecção."
      />
    );
  }
  return (
    <EstadoVazio
      titulo="A base da Receita está indisponível agora"
      texto="Tente de novo em alguns minutos. O restante do Pulse continua funcionando."
    >
      <Button variant="outline" size="sm" className="mt-1" onClick={onTentar}>Tentar de novo</Button>
    </EstadoVazio>
  );
}

function textoDoRodape(pagina: number, { total, limitado }: TotalReceita): string {
  const n = total ?? 0;
  const inicio = pagina * POR_PAGINA_RECEITA + 1;
  const fim = Math.min(n, (pagina + 1) * POR_PAGINA_RECEITA);
  const de = `${limitado ? 'mais de ' : ''}${n.toLocaleString('pt-BR')}`;
  const faixa = `${inicio.toLocaleString('pt-BR')}–${fim.toLocaleString('pt-BR')} de ${de} empresas`;
  return n > LIMITE_DE_NAVEGACAO ? `${faixa} · a lista vai até as 10 mil primeiras; use os filtros para as outras` : faixa;
}
