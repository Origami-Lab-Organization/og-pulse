import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rotaDaEmpresa } from '@/lib/prospecting/faseDaEmpresa.constants';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useHideValues } from '@/contexts/HideValuesContext';
import { useBantDoQuadro } from '@/hooks/useBant';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { useEmQualificacao } from '@/hooks/useEmQualificacao';
import { useEntradasNaQualificacao } from '@/hooks/useEntradasNaQualificacao';
import { usePainelDeFiltros } from '@/hooks/usePainelDeFiltros';
import { faturamentoCompacto } from '@/lib/prospecting/faturamento';
import { FIT_QUE_DESTACA } from '@/lib/prospecting/fit';
import { linhaValida, notasPorLinha, type LinhaDoFit } from '@/lib/prospecting/fitDoCatalogo';
import { useFitDoCatalogo } from '@/hooks/useFitDoCatalogo';
import {
  alternarOrdem,
  colunaDaLinha,
  contarFiltrosDaQualificacao,
  filtrarQualificacao,
  FILTROS_DA_QUALIFICACAO_VAZIOS,
  guardarQualificacao,
  linhaDaQualificacao,
  ORDEM_PADRAO,
  ordemDosFiltros,
  ordenarQualificacao,
  qualificacaoDoNavegador,
} from '@/lib/prospecting/filtrosDaQualificacao';
import { ColunaDaQualificacao, type ColunaOrdenavel, type LinhaDaQualificacao, type OrdemDaQualificacao, type SentidoDaOrdem } from '@/types/qualificacao';
import { formatarData } from '@/lib/prospecting/prazos';
import { getTipoDeContaLabel, type ProspectWithCompany } from '@/types/prospect';
import type { BantDaOportunidade } from '@/types/bant';
import { DiscardProspectDialog } from '../DiscardProspectDialog';
import { FichaDaEmpresaNoPipeline } from '../FichaDaEmpresaNoPipeline';
import { EstadoVazio } from '../ListaDeCadastro';
import { ProspectDetailDialog } from '../ProspectDetailDialog';
import { ProspectWonDialog } from '../ProspectWonDialog';
import { LetrasDoBant } from '../bant/LetrasDoBant';
import { BotaoDeFiltros } from '../filtros/BotaoDeFiltros';
import { GavetaDeFiltros } from '../receita/GavetaDeFiltros';
import { PainelDaQualificacao } from './PainelDaQualificacao';

/**
 * Aba "Em qualificação" da tela Empresas (US-0023, revista em 19/11/2026): as empresas escolhidas
 * na base, em estudo antes de virar abordagem. Tabela para comparar (BANT, tipo de conta, fit,
 * faturamento, distância, responsável); a linha abre a ficha da oportunidade no "Estudo da conta".
 * Busca, filtros e ordem por coluna na própria tela, guardados no navegador (US-0042).
 */
export function EmQualificacao() {
  const { lista, isLoading, data: todas = [] } = useEmQualificacao();
  const bantPorOportunidade = useBantDoQuadro(lista);
  const entradas = useEntradasNaQualificacao(useMemo(() => lista.map((p) => p.id), [lista]));
  const { byId } = useEmployeeDirectoryMap();
  const nomeDe = useCallback((id: string) => byId.get(id)?.nome, [byId]);
  const [estado, setEstado] = useState(qualificacaoDoNavegador);
  const painel = usePainelDeFiltros();
  const [aberta, setAberta] = useState<ProspectWithCompany | null>(null);
  const [descartando, setDescartando] = useState<ProspectWithCompany | null>(null);
  const [motivoSugerido, setMotivoSugerido] = useState<string | null>(null);
  const [ganhando, setGanhando] = useState<ProspectWithCompany | null>(null);
  const [empresaAberta, setEmpresaAberta] = useState<string | null>(null);
  // US-0053: a empresa em qualificação abre na página dela (BANT, estudo e "Criar Oportunidade").
  const navigate = useNavigate();
  const abrir = (p: ProspectWithCompany) => {
    const cnpj = p.company?.cnpj;
    if (cnpj) navigate(rotaDaEmpresa(cnpj), { state: { de: 'qualificacao' } });
    else setAberta(p);
  };
  useAbrirPeloLink(todas, isLoading, setAberta);

  // A ficha acompanha a versão atual (depois de mover, ela some da lista mas segue aberta).
  const abertaAtual = aberta ? todas.find((p) => p.id === aberta.id) ?? aberta : null;
  // Fit por linha de serviço do catálogo (US-0047): cada linha da tabela já sai com a nota de cada uma.
  const { linhas: linhasDoFit } = useFitDoCatalogo();
  const linhas = useMemo(
    () =>
      lista.map((p) => {
        const linha = linhaDaQualificacao(p, bantPorOportunidade.get(p.id), entradas.get(p.id));
        return { ...linha, notasPorLinha: notasPorLinha(linha.fits, linhasDoFit) };
      }),
    [lista, bantPorOportunidade, entradas, linhasDoFit],
  );
  // Linha salva no filtro que não tem mais fit vale como "Maior nota".
  const visiveis = useMemo(() => {
    const filtros = { ...estado.filtros, linhaDoFit: linhaValida(estado.filtros.linhaDoFit, linhasDoFit) };
    return ordenarQualificacao(filtrarQualificacao(linhas, filtros, estado.busca), estado.ordem);
  }, [linhas, estado, linhasDoFit]);
  const mudar = (parcial: Partial<typeof estado>) =>
    setEstado((atual) => {
      const novo = { ...atual, ...parcial };
      guardarQualificacao(novo);
      return novo;
    });
  const limpar = () => mudar({ filtros: FILTROS_DA_QUALIFICACAO_VAZIOS, busca: '', ordem: ORDEM_PADRAO });

  return (
    <>
      {lista.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <BuscaDaQualificacao valor={estado.busca} onChange={(busca) => mudar({ busca })} />
          <p className="text-[13px] text-muted-foreground sm:ml-auto" aria-live="polite">
            <b className="font-mono font-semibold tabular-nums text-foreground">{visiveis.length}</b> de {lista.length} empresas
          </p>
          <BotaoDeFiltros ref={painel.botao} ativos={contarFiltrosDaQualificacao(estado.filtros)} aberto={painel.aberto} onClick={painel.alternar} />
        </div>
      )}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Conteudo
          carregando={isLoading}
          total={lista.length}
          linhas={visiveis}
          bantPorOportunidade={bantPorOportunidade}
          ordem={estado.ordem}
          nomeDe={nomeDe}
          onOrdenar={(coluna) => mudar({ ordem: alternarOrdem(estado.ordem, coluna) })}
          onLimpar={limpar}
          onAbrir={abrir}
        />
      </div>

      <GavetaDeFiltros aberta={painel.aberto} onAbertaChange={painel.definir} contagem={{ total: visiveis.length, limitado: false }} contando={false} botao={painel.botao}>
        <PainelDaQualificacao
          filtros={estado.filtros}
          linhas={linhas}
          nomeDe={nomeDe}
          onChange={(filtros) => mudar({ filtros, ordem: ordemDosFiltros(estado.ordem, estado.filtros, filtros) })}
          onLimpar={limpar}
          onRecolher={painel.recolher}
        />
      </GavetaDeFiltros>
      <ProspectDetailDialog
        prospect={abertaAtual}
        open={!!aberta}
        onOpenChange={(abertaAgora) => !abertaAgora && setAberta(null)}
        onDiscard={(p, motivo) => {
          setMotivoSugerido(motivo ?? null);
          setDescartando(p);
        }}
        onWin={setGanhando}
        onOpenCompany={setEmpresaAberta}
      />
      <FichaDaEmpresaNoPipeline empresaId={empresaAberta} onEmpresaId={setEmpresaAberta} onAbrirOportunidade={setAberta} />
      <DiscardProspectDialog
        prospect={descartando}
        open={!!descartando}
        onOpenChange={(abertaAgora) => !abertaAgora && setDescartando(null)}
        motivoSugerido={motivoSugerido}
      />
      <ProspectWonDialog prospect={ganhando} open={!!ganhando} onOpenChange={(abertaAgora) => !abertaAgora && setGanhando(null)} />
    </>
  );
}

function BuscaDaQualificacao({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nome, CNPJ ou cidade"
        aria-label="Buscar por nome, CNPJ ou cidade"
        className="h-9 pl-8 text-[13px]"
      />
    </div>
  );
}

/** `?oportunidade=<id>`: o link da mensagem de "Mover para qualificação" abre a ficha. */
function useAbrirPeloLink(todas: ProspectWithCompany[], carregando: boolean, abrir: (p: ProspectWithCompany) => void) {
  const [params, setParams] = useSearchParams();
  const id = params.get('oportunidade');
  useEffect(() => {
    if (!id || carregando) return;
    const alvo = todas.find((p) => p.id === id);
    if (alvo) abrir(alvo);
    setParams((atual) => {
      atual.delete('oportunidade');
      return atual;
    }, { replace: true });
  }, [id, carregando, todas, abrir, setParams]);
}

interface ConteudoProps {
  carregando: boolean;
  /** Quantas há na aba, sem filtro. */
  total: number;
  linhas: LinhaDaQualificacao[];
  bantPorOportunidade: Map<string, BantDaOportunidade>;
  ordem: OrdemDaQualificacao;
  nomeDe: (id: string) => string | undefined;
  onOrdenar: (coluna: ColunaOrdenavel) => void;
  onLimpar: () => void;
  onAbrir: (p: ProspectWithCompany) => void;
}

function Conteudo(props: ConteudoProps) {
  const { carregando, total, linhas, bantPorOportunidade, ordem, nomeDe, onOrdenar, onLimpar, onAbrir } = props;
  const { linhas: linhasDoFit } = useFitDoCatalogo();
  if (carregando) {
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-label="Carregando empresas em qualificação">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }
  if (!total) {
    return (
      <EstadoVazio
        titulo="Nenhuma empresa em qualificação"
        texto='Na aba "Base de empresas", marque as empresas e use "Mover para qualificação".'
      />
    );
  }
  if (!linhas.length) {
    return (
      <EstadoVazio titulo="Nenhuma empresa com esses filtros" texto="Mude ou limpe os filtros e a busca.">
        <Button variant="outline" size="sm" onClick={onLimpar}>Limpar</Button>
      </EstadoVazio>
    );
  }
  const cabecalho = (coluna: ColunaOrdenavel) => ({ coluna, ordem, onOrdenar });
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1160px] border-collapse text-[13.5px]">
        <caption className="sr-only">Empresas em qualificação</caption>
        <thead>
          <tr className="h-10 border-b bg-muted/40 text-left text-[12.5px] text-muted-foreground">
            <th scope="col" className="px-3 pl-5 font-medium">Empresa</th>
            <CabecalhoOrdenavel {...cabecalho(ColunaDaQualificacao.Bant)}>BANT</CabecalhoOrdenavel>
            <th scope="col" className="px-3 font-medium">Tipo de conta</th>
            {/* US-0047: o fit de cada linha de serviço, lado a lado; a maior nota vai em destaque. */}
            {linhasDoFit.map((ls) => (
              <CabecalhoOrdenavel key={ls.id} {...cabecalho(colunaDaLinha(ls.id))} centro titulo={`Fit em ${ls.nome}`}>
                {ls.nome}
              </CabecalhoOrdenavel>
            ))}
            <CabecalhoOrdenavel {...cabecalho(ColunaDaQualificacao.Faturamento)} centro>Faturamento</CabecalhoOrdenavel>
            <CabecalhoOrdenavel {...cabecalho(ColunaDaQualificacao.Distancia)} centro titulo="Distância de Formiga, em linha reta">Distância</CabecalhoOrdenavel>
            <th scope="col" className="px-3 font-medium">Responsável</th>
            <CabecalhoOrdenavel {...cabecalho(ColunaDaQualificacao.Desde)} titulo="Entrada em qualificação">Desde</CabecalhoOrdenavel>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <Linha key={l.prospect.id} linha={l} bant={bantPorOportunidade.get(l.prospect.id)} linhasDoFit={linhasDoFit} nomeDe={nomeDe} onAbrir={onAbrir} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CabecalhoOrdenavelProps {
  coluna: ColunaOrdenavel;
  ordem: OrdemDaQualificacao;
  onOrdenar: (coluna: ColunaOrdenavel) => void;
  centro?: boolean;
  titulo?: string;
  children: ReactNode;
}

function sentidoDe(ordem: OrdemDaQualificacao, coluna: ColunaOrdenavel): SentidoDaOrdem {
  if (ordem.coluna !== coluna) return 'none';
  return ordem.crescente ? 'ascending' : 'descending';
}

/** Cabeçalho que ordena: um clique ordena, outro inverte (US-0042). */
function CabecalhoOrdenavel(props: CabecalhoOrdenavelProps) {
  const { coluna, ordem, onOrdenar, centro, titulo, children } = props;
  const ativa = ordem.coluna === coluna;
  const Seta = ordem.crescente ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={sentidoDe(ordem, coluna)} className={cn('px-2 font-medium', centro && 'text-center')}>
      <button
        type="button"
        onClick={() => onOrdenar(coluna)}
        title={[titulo, 'ordenar'].filter(Boolean).join(' — ')}
        className={cn(
          'inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          ativa && 'font-semibold text-foreground',
        )}
      >
        {children}
        {ativa && <Seta className="h-3 w-3" aria-hidden="true" />}
      </button>
    </th>
  );
}

const TECLA_QUE_ABRE = 'Enter';

const TRACO = '—';

/** "~R$ 45 mi" quando o valor é o estimado pela Base. */
function textoDoFaturamento(l: LinhaDaQualificacao): string {
  if (l.faturamento == null) return TRACO;
  return `${l.faturamentoEstimado ? '~' : ''}${faturamentoCompacto(l.faturamento)}`;
}

const textoDaDistancia = (km: number | null) => (km == null ? TRACO : `${km.toLocaleString('pt-BR')} km`);

/** O que cada coluna mostra, já em texto: a linha só desenha. */
/** A linha de serviço de maior nota, quando ela passa de `FIT_QUE_DESTACA`. */
function linhaEmDestaque(l: LinhaDaQualificacao): string | null {
  const [id, nota] = Object.entries(l.notasPorLinha ?? {}).reduce<[string | null, number]>(
    (melhor, [linhaId, n]) => (n !== null && n > melhor[1] ? [linhaId, n] : melhor),
    [null, -1],
  );
  return nota >= FIT_QUE_DESTACA ? id : null;
}

function colunasDaLinha(l: LinhaDaQualificacao, nomeDe: (id: string) => string | undefined) {
  return {
    maior: linhaEmDestaque(l),
    local: [l.cidade, l.uf].filter(Boolean).join(' · '),
    tipo: getTipoDeContaLabel(l.tipoConta) ?? TRACO,
    faturamento: textoDoFaturamento(l),
    distancia: textoDaDistancia(l.distanciaKm),
    responsavel: l.responsavel ? nomeDe(l.responsavel) ?? TRACO : 'Sem responsável',
    desde: formatarData(l.entrouEm),
  };
}

interface LinhaProps {
  linha: LinhaDaQualificacao;
  bant: BantDaOportunidade | undefined;
  linhasDoFit: LinhaDoFit[];
  nomeDe: (id: string) => string | undefined;
  onAbrir: (p: ProspectWithCompany) => void;
}

function Linha(props: LinhaProps) {
  const { linha: l, bant, linhasDoFit, nomeDe, onAbrir } = props;
  useHideValues();
  const c = colunasDaLinha(l, nomeDe);
  const p = l.prospect;
  return (
    <tr
      tabIndex={0}
      onClick={() => onAbrir(p)}
      onKeyDown={(e) => e.key === TECLA_QUE_ABRE && e.target === e.currentTarget && onAbrir(p)}
      title="Abrir o estudo da conta"
      className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <td className="px-3 py-2.5 pl-5">
        <p className="max-w-[280px] truncate font-semibold" title={l.nome}>{l.nome}</p>
        <p className="whitespace-nowrap text-xs text-muted-foreground">
          {l.cnpj && <span className="font-mono tabular-nums">{l.cnpj}</span>}
          {c.local && <span> · {c.local}</span>}
        </p>
      </td>
      <td className="px-3 py-2.5">{bant ? <LetrasDoBant bant={bant} compacto /> : TRACO}</td>
      <td className="whitespace-nowrap px-3 py-2.5">{c.tipo}</td>
      {linhasDoFit.map((ls) => (
        <CelulaDeFit key={ls.id} rotulo={ls.nome} nota={l.notasPorLinha?.[ls.id] ?? null} maior={c.maior === ls.id} />
      ))}
      <td className="whitespace-nowrap px-3 py-2.5 text-center font-mono tabular-nums" title={l.faturamentoEstimado ? 'Estimado pela Base' : undefined}>{c.faturamento}</td>
      <td className="whitespace-nowrap px-3 py-2.5 text-center font-mono tabular-nums">{c.distancia}</td>
      <td className="whitespace-nowrap px-3 py-2.5">{c.responsavel}</td>
      <td className="whitespace-nowrap px-3 py-2.5 pr-5 text-muted-foreground">{c.desde}</td>
    </tr>
  );
}

interface CelulaDeFitProps {
  rotulo: string;
  nota: number | null;
  maior: boolean;
}

/** A nota de uma linha de serviço; a maior em destaque (US-0047). Sem dados da Receita, traço. */
function CelulaDeFit(props: CelulaDeFitProps) {
  const { rotulo, nota, maior } = props;
  if (nota === null) return <td className="px-2 py-2.5 text-center text-muted-foreground">{TRACO}</td>;
  return (
    <td className="px-2 py-2.5 text-center font-mono tabular-nums" title={`${rotulo}: ${nota}${maior ? ' — o maior fit' : ''}`}>
      <span
        className={cn(
          'inline-block min-w-[2.25rem] rounded-md border px-1.5 py-0.5',
          maior ? 'border-primary bg-accent-subtle font-semibold text-success-emphasis' : 'border-transparent text-muted-foreground',
        )}
      >
        {nota}
      </span>
      {maior && <span className="sr-only"> (o maior fit)</span>}
    </td>
  );
}
