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
import { avisoDaBusca, buscaDoNavegador, buscaDoPedido, buscouFilial, cnpjCompleto, guardarBusca, lerBusca } from '@/lib/prospecting/buscaReceita';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePainelDeFiltros } from '@/hooks/usePainelDeFiltros';
import { useSelecaoDeEmpresas } from '@/hooks/useSelecaoDeEmpresas';
import { useAuth } from '@/contexts/AuthContext';
import type { BuscaReceita, FiltrosReceita, SelecaoDaLista } from '@/types/filtrosReceita';
import { cn } from '@/lib/utils';
import { BarraDeSelecao } from './BarraDeSelecao';
import { CaixaDeBusca } from './CaixaDeBusca';
import { ColocarParaAbordarDialog } from './ColocarParaAbordarDialog';
import { EmpresasReceitaTable } from './EmpresasReceitaTable';
import { FichaDaEmpresaReceita } from './FichaDaEmpresaReceita';
import { GavetaDeFiltros } from './GavetaDeFiltros';
import { PainelDeFiltros } from './PainelDeFiltros';

const RECORTE =
  'Ficam fora: empresas baixadas, inaptas ou suspensas, filiais, ME e EPP, órgãos públicos, condomínios, igrejas, partidos e candidatos. As filiais aparecem na ficha da matriz.';

const FORA_DA_BASE =
  'A base tem só matrizes ativas, fora ME e EPP. Também ficam fora empresas baixadas, inaptas ou suspensas, órgãos públicos, condomínios, igrejas, partidos e candidatos.';
const ESPERA_DA_DIGITACAO_MS = 300;

/**
 * Aba "A classificar" da tela Empresas: a base da Receita, filtrada, buscada e página por
 * página (US-0002, US-0003, US-0005). A busca e os filtros ficam guardados entre visitas; o
 * painel de filtros fica ao lado da lista no computador e por cima dela no celular (US-0004).
 */
export function EmpresasDaReceita() {
  const [filtros, setFiltros] = useState<FiltrosReceita>(filtrosDoNavegador);
  const painel = usePainelDeFiltros();
  const [ficha, setFicha] = useState<string | null>(null);
  const { can } = useAuth();
  const podeColocar = can('prospeccao:editar');
  const marcadas = useSelecaoDeEmpresas();
  const [colocando, setColocando] = useState(false);
  const [ordenacao, setOrdenacao] = useState(ORDENACAO_PADRAO);
  const [pagina, setPagina] = useState(0);
  const [texto, setTexto] = useState(buscaDoNavegador);
  const busca = lerBusca(useDebouncedValue(texto, ESPERA_DA_DIGITACAO_MS));
  const consulta = useEmpresasReceita(filtros, ordenacao, pagina, buscaDoPedido(busca));
  const contagem = useTotalReceita(filtros, buscaDoPedido(busca));
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
  const buscar = (novo: string) => {
    setTexto(novo);
    guardarBusca(novo);
    setPagina(0);
  };

  const filtrosDoPainel = (emGaveta: boolean) => (
    <PainelDeFiltros filtros={filtros} onChange={filtrar} onLimpar={limpar} onRecolher={painel.recolher} emGaveta={emGaveta} />
  );

  return (
    <div className={cn('grid items-start gap-3.5', painel.larga && painel.aberto && 'grid-cols-[minmax(0,1fr)_288px]')}>
      <section className="min-w-0 space-y-3" aria-label="Empresas encontradas">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pb-1">
          <LinhaDoTotal contagem={contagem.data} contando={contagem.isFetching} carregadaEm={consulta.data?.carregadaEm ?? null} />
          <CaixaDeBusca valor={texto} aviso={avisoDaBusca(lerBusca(texto))} onChange={buscar} />
          <Button
            ref={painel.botao}
            variant="outline"
            size="sm"
            onClick={painel.alternar}
            aria-expanded={painel.aberto}
            aria-label={ativos ? `Filtros, ${ativos} ativo${ativos > 1 ? 's' : ''}` : 'Filtros'}
          >
            <Filter className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Filtros
            {ativos > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 font-mono text-[11px] text-primary-foreground">{ativos}</span>}
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <BarraDeSelecao quantidade={marcadas.empresas.length} onColocar={() => setColocando(true)} onLimpar={marcadas.limpar} />
          <AvisosDaBusca busca={busca} ativos={ativos} primeira={consulta.data?.linhas[0]?.cnpj} />
          <Conteudo consulta={consulta} busca={busca} ativos={ativos} ordenacao={ordenacao} onOrdenar={ordenar} onLimpar={limpar} onAbrir={setFicha} selecao={podeColocar ? marcadas.selecao : undefined} compacta={painel.larga && painel.aberto} />
          <Rodape contagem={contagem.data} pagina={pagina} onPagina={setPagina} vazia={!consulta.data?.linhas.length} />
        </div>
      </section>
      {painel.larga && painel.aberto && filtrosDoPainel(false)}
      <FichaDaEmpresaReceita cnpj={ficha} onFechar={() => setFicha(null)} />
      <ColocarParaAbordarDialog empresas={marcadas.empresas} aberta={colocando} onAbertaChange={setColocando} onConcluido={marcadas.limpar} />
      {!painel.larga && (
        <GavetaDeFiltros aberta={painel.aberto} onAbertaChange={painel.definirGaveta} contagem={contagem.data} contando={contagem.isFetching} botao={painel.botao}>
          {filtrosDoPainel(true)}
        </GavetaDeFiltros>
      )}
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

const BUSCA_POR_CNPJ: BuscaReceita['tipo'] = 'cnpj';
const BUSCA_POR_TEXTO: BuscaReceita['tipo'] = 'texto';

/** CNPJ ignora os filtros, e o de filial mostra a matriz (US-0005): a tela avisa as duas coisas. */
function AvisosDaBusca(props: { busca: BuscaReceita; ativos: number; primeira: string | undefined }) {
  const { busca, ativos, primeira } = props;
  if (busca.tipo !== BUSCA_POR_CNPJ || !primeira) return null;
  const avisos = [
    buscouFilial(busca, primeira) && 'Mostrando a matriz desta filial.',
    ativos > 0 && 'Busca por CNPJ: os filtros foram ignorados nesta busca.',
  ].filter(Boolean);
  if (!avisos.length) return null;
  return (
    <p role="status" className="border-b bg-muted/60 px-4 py-2 text-[12.5px] text-muted-foreground">
      {avisos.join(' ')}
    </p>
  );
}

function Vazio(props: { busca: BuscaReceita; ativos: number; onLimpar: () => void }) {
  const { busca, ativos, onLimpar } = props;
  if (busca.tipo === BUSCA_POR_CNPJ) {
    const titulo = cnpjCompleto(busca) ? 'Esse CNPJ não está na base' : 'Nenhum CNPJ da base começa com esses números';
    return <EstadoVazio titulo={titulo} texto={FORA_DA_BASE} />;
  }
  if (busca.tipo === BUSCA_POR_TEXTO && !ativos) {
    return <EstadoVazio titulo="Nenhuma empresa com esse nome ou cidade" texto="Confira a grafia ou busque só por parte do nome." />;
  }
  return (
    <EstadoVazio titulo="Nenhuma empresa com esses filtros" texto="Tire algum filtro para ver mais empresas.">
      <Button variant="outline" size="sm" className="mt-1" onClick={onLimpar}>Limpar filtros</Button>
    </EstadoVazio>
  );
}

function Conteudo(props: {
  consulta: ReturnType<typeof useEmpresasReceita>;
  busca: BuscaReceita;
  ativos: number;
  ordenacao: typeof ORDENACAO_PADRAO;
  onOrdenar: (ordem: OrdemReceita) => void;
  onLimpar: () => void;
  onAbrir: (cnpj: string) => void;
  selecao?: SelecaoDaLista;
  compacta: boolean;
}) {
  const { consulta, busca, ativos, ordenacao, onOrdenar, onLimpar, onAbrir, selecao, compacta } = props;
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
  if (!consulta.data.linhas.length) return <Vazio busca={busca} ativos={ativos} onLimpar={onLimpar} />;
  const trocando = consulta.isPlaceholderData;
  return (
    <div className={cn('overflow-x-auto transition-opacity', trocando && 'opacity-60')} aria-busy={trocando}>
      <EmpresasReceitaTable linhas={consulta.data.linhas} ordenacao={ordenacao} onOrdenar={onOrdenar} onAbrir={onAbrir} selecao={selecao} compacta={compacta} />
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
        texto="Peça a quem administra o Pulse a permissão de ver o Comercial."
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
