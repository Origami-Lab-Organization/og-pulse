import type { ReactNode } from 'react';
import { origemDoTime, textoDoFaturamentoDoTime, textoDosFuncionariosDoTime } from '@/lib/prospecting/paginaDaEmpresa';
import type { BaseDoFaturamento } from '@/types/filtrosReceita';
import { faixaDoFaturamento, faixaDosFuncionarios, faturamentoEmFaixa, faturamentoInformadoPeloTime } from '@/lib/prospecting/faixasDeFaturamento';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useHideValues } from '@/contexts/HideValuesContext';
import { formatCNPJ } from '@/lib/masks';
import { FIT_QUE_DESTACA } from '@/lib/prospecting/fit';
import { regraValida, type GrupoDeFit } from '@/lib/prospecting/fitDoCatalogo';
import { useFitDoCatalogo } from '@/hooks/useFitDoCatalogo';
import type { FitFront } from '@/types/receita';
import {
  anosDeOperacao,
  emTitulo,
  nomeDaEmpresa,
  ramoDaEmpresa,
  reaisCurtos,
  situacaoDaDivida,
  type EmpresaReceita,
  type OrdemReceita,
  type OrdenacaoReceita,
} from '@/lib/prospecting/empresasReceita';
import {
  BASE_PISO,
  contaDoFaturamento,
  lucroRealPeloTime,
  lucroRealProvavel,
  ROTULO_DA_BASE,
  textoDoFaturamento,
} from '@/lib/prospecting/faturamentoEstimado';
import { confiancaDoFaturamento, seloDoInformado } from '@/lib/prospecting/confiancaDoFaturamento';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { notaDoRegime } from '@/lib/prospecting/limiteDoRegime';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { SelecaoDaLista } from '@/types/filtrosReceita';
import { MotivoDaConfianca } from './SeloDeConfianca';
import { CelulaDeRelacao } from './SeloDeRelacao';

interface EmpresasReceitaTableProps {
  /** Abre a ficha da empresa (US-0007): clique na linha, ou Enter com ela em foco. */
  onAbrir: (cnpj: string) => void;
  /** Seleção para mover para abordar (US-0008); ausente sem `prospeccao:editar`. */
  selecao?: SelecaoDaLista;
  /** A relação com a Origami não carregou (US-0019, cenário 9). */
  relacaoIndisponivel?: boolean;
  /** Com o painel de filtros aberto: menos respiro e nome e atividade mais estreitos, para caber sem rolar. */
  compacta?: boolean;
  linhas: EmpresaReceita[];
  ordenacao: OrdenacaoReceita;
  onOrdenar: (ordem: OrdemReceita) => void;
  /** O serviço cujo fit a coluna mostra (US-0014); nulo = a maior nota. */
  servicoDoFit?: FitFront | null;
}

/**
 * Lista da base da Receita (US-0002). Nome e atividade ficam numa linha só, com o texto
 * inteiro ao passar o mouse; números não quebram. O faturamento estimado vem antes da dívida ativa, com a
 * conta no tooltip (US-0006).
 */
export function EmpresasReceitaTable(props: EmpresasReceitaTableProps) {
  const { linhas, ordenacao, onOrdenar, onAbrir, selecao, relacaoIndisponivel = false, compacta = false } = props;
  useHideValues(); // re-renderiza quando o olho de ocultar valores muda
  const { grupos } = useFitDoCatalogo();
  const servicoDoFit = regraValida(props.servicoDoFit ?? null, grupos);
  const ordenavel = (ordem: OrdemReceita, rotulo: string, numerica = false) => (
    <CabecalhoOrdenavel ordem={ordem} ordenacao={ordenacao} onOrdenar={onOrdenar} numerica={numerica}>
      {rotulo}
    </CabecalhoOrdenavel>
  );

  return (
    <table className={cn('w-full border-collapse', compacta ? 'min-w-[1160px] text-[13px] [&_td]:px-2 [&_th]:px-2' : 'min-w-[1380px] text-[13.5px]')}>
      <caption className="sr-only">Empresas da base da Receita</caption>
      <thead>
        <tr className="h-10 border-b bg-muted/40 text-left text-[12.5px] font-medium text-muted-foreground">
          {selecao && <th scope="col" className="w-10 pl-4"><MarcarPagina linhas={linhas} selecao={selecao} /></th>}
          {ordenavel('nome', 'Empresa')}
          {ordenavel('relacao', 'Relação')}
          {ordenavel('distancia', 'Distância', true)}
          {ordenavel('capital', 'Capital social', true)}
          {ordenavel('funcionarios', 'Funcionários', true)}
          <th scope="col" className="whitespace-nowrap px-3 font-medium">Atividade</th>
          {ordenavel('idade', 'Idade', true)}
          {ordenavel('faturamento', 'Faturamento', true)}
          <th scope="col" className="whitespace-nowrap px-3 font-medium">Dívida ativa</th>
          {ordenavel('fit', tituloDoFit(servicoDoFit, grupos))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((empresa) => (
          <Linha key={empresa.cnpj} empresa={empresa} compacta={compacta} onAbrir={onAbrir} selecao={selecao} relacaoIndisponivel={relacaoIndisponivel} servicoDoFit={servicoDoFit} />
        ))}
      </tbody>
    </table>
  );
}

/** Funcionários na lista: a faixa ou o número do time (*), a estimativa (≈) ou a RAIS (US-0054). */
function Funcionarios({ empresa }: { empresa: EmpresaReceita }) {
  const n = (empresa.funcionarios ?? 0).toLocaleString('pt-BR');
  if (empresa.funcionarios_do_time) return <span title="Informados pelo time">{textoDosFuncionariosDoTime(empresa)}*</span>;
  if (empresa.funcionarios_estimados) return <span title={`Estimado por empresas parecidas: ${n}; RAIS: ${(empresa.funcionarios_rais ?? 0).toLocaleString('pt-BR')}`}>{faixaDosFuncionarios(empresa.funcionarios ?? 0)}</span>;
  return <span>{n}</span>;
}

const TECLA_QUE_ABRE = 'Enter';

interface LinhaProps {
  empresa: EmpresaReceita;
  compacta: boolean;
  onAbrir: (cnpj: string) => void;
  selecao?: SelecaoDaLista;
  relacaoIndisponivel: boolean;
  servicoDoFit: FitFront | null;
}

function Linha(props: LinhaProps) {
  const { empresa, compacta, onAbrir, selecao, relacaoIndisponivel, servicoDoFit } = props;
  const largura = compacta ? 'max-w-[170px]' : 'max-w-[260px]';
  const nome = nomeDaEmpresa(empresa);
  const ramo = ramoDaEmpresa(empresa.cnae_principal);
  const anos = anosDeOperacao(empresa.data_inicio_atividade);
  const local = [emTitulo(empresa.municipio), empresa.uf].filter(Boolean).join(' · ');
  const razao = emTitulo(empresa.razao_social);
  const nomeCompleto = razao && razao !== nome ? `${nome} — ${razao}` : nome;
  return (
    <tr
      tabIndex={0}
      onClick={() => onAbrir(empresa.cnpj)}
      onKeyDown={(e) => e.key === TECLA_QUE_ABRE && e.target === e.currentTarget && onAbrir(empresa.cnpj)}
      title="Abrir a ficha"
      className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {selecao && (
        <td className="w-10 pl-4" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selecao.marcadas.has(empresa.cnpj)}
            onCheckedChange={(marcada) => selecao.onMarcar([empresa], marcada === true)}
            aria-label={`Selecionar ${nome}`}
          />
        </td>
      )}
      <td className={cn('px-3 py-2', !selecao && 'pl-5')}>
        <div className={cn(compacta ? 'max-w-[190px]' : 'max-w-[280px]', 'truncate font-semibold leading-snug')} title={nomeCompleto}>{nome}</div>
        <div className="mt-0.5 flex gap-x-2 whitespace-nowrap text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{formatCNPJ(empresa.cnpj)}</span>
          {local && <span>{local}</span>}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2"><CelulaDeRelacao relacao={empresa.relacao} indisponivel={relacaoIndisponivel} /></td>
      <td className="whitespace-nowrap px-3 py-2 text-center font-mono tabular-nums">
        {empresa.distancia_km != null ? `${empresa.distancia_km.toLocaleString('pt-BR')} km` : <span title="Município não reconhecido">—</span>}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-center font-mono tabular-nums">
        {empresa.capital_social ? reaisCurtos(Number(empresa.capital_social)) : <span title="Capital social não informado na Receita">—</span>}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-center font-mono tabular-nums">
        {empresa.funcionarios != null
          ? <Funcionarios empresa={empresa} />
          : <span title="Sem dado na RAIS">—</span>}
      </td>
      <td className="px-3 py-2">
        <div className={cn(largura, 'truncate leading-snug')} title={empresa.cnae_descricao ?? undefined}>
          {empresa.cnae_descricao ?? empresa.cnae_principal}
        </div>
        {ramo && (
          <div className={cn(largura, 'mt-0.5 truncate text-xs text-muted-foreground')}>
            {ramo}
            {empresa.pela_secundaria && ' · entrou pela atividade secundária'}
          </div>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-center font-mono tabular-nums">{anos != null ? `${anos} a` : '—'}</td>
      <td className="whitespace-nowrap px-3 py-2 text-center"><FaturamentoEstimado empresa={empresa} /></td>
      <td className="whitespace-nowrap px-3 py-2"><DividaBadge empresa={empresa} /></td>
      <td className="px-3 py-2 pr-5"><FitPrevio empresa={empresa} servicoDoFit={servicoDoFit} /></td>
    </tr>
  );
}

/** "Selecionar todas desta página": marca as da página, ou desmarca se já estão todas. */
function MarcarPagina({ linhas, selecao }: { linhas: EmpresaReceita[]; selecao: SelecaoDaLista }) {
  const marcadas = linhas.filter((e) => selecao.marcadas.has(e.cnpj)).length;
  const todas = marcadas === linhas.length;
  const estado = todas ? true : marcadas > 0 ? 'indeterminate' : false;
  return (
    <Checkbox
      checked={estado}
      onCheckedChange={() => selecao.onMarcar(linhas, !todas)}
      aria-label="Selecionar todas desta página"
    />
  );
}

const GATILHO = 'inline-flex flex-col items-center gap-1 rounded-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const AVISO_LUCRO_REAL =
  'Lucro Real provável: acima de R$ 78 mi por ano, o regime é obrigatório (Lei 9.718/1998, art. 14). Confirme na consulta da Receita.';

/**
 * Faturamento da linha (US-0006): o que o time informou, quando há; senão a
 * estimativa da base ("≈ valor" com a base, ou o piso do porte). A conta, o selo de confiança
 * com o porquê (US-0018) e o regime vão no hover, para a coluna ficar limpa.
 */
/** Faixa fixa quando o time não informou (US-0056); o piso fica "acima de R$ 4,8 mi". */
function textoDaLista(empresa: EmpresaReceita, valor: number, base: BaseDoFaturamento): string {
  if (base === BASE_PISO || !faturamentoEmFaixa(empresa)) return textoDoFaturamento(valor, base);
  return faixaDoFaturamento(valor);
}

/** A conta por trás do estimado, no tooltip: valor central, como foi feita, confiança e avisos. */
function ExplicacaoDoEstimado(props: { empresa: EmpresaReceita; valor: number; base: BaseDoFaturamento }) {
  const { empresa, valor, base } = props;
  const piso = base === BASE_PISO;
  const regime = notaDoRegime(empresa);
  return (
    <TooltipContent className="max-w-xs whitespace-normal text-left text-[12.5px] leading-snug">
      <p className="font-medium">Faturamento {ROTULO_DA_BASE[base]}{piso ? '' : `: ${textoDoFaturamento(valor, base)}`}</p>
      <p className="mt-0.5">{contaDoFaturamento(empresa.cnae_principal, empresa.funcionarios, base, empresa.capital_social, empresa.funcionarios_do_time, empresa.funcionarios_estimados)}</p>
      <MotivoDaConfianca confianca={confiancaDoFaturamento(empresa.cnae_principal, base)} className="mt-1.5" />
      {regime && <p className="mt-1.5">{regime}</p>}
      {lucroRealProvavel(valor, base) && <p className="mt-1.5 font-medium text-info-emphasis">{AVISO_LUCRO_REAL}</p>}
    </TooltipContent>
  );
}

function FaturamentoEstimado({ empresa }: { empresa: EmpresaReceita }) {
  if (faturamentoInformadoPeloTime(empresa)) return <FaturamentoDoTime empresa={empresa} />;
  const { faturamento_estimado: valor, faturamento_base: base } = empresa;
  if (valor == null || !base) return <span className="text-[12.5px] text-muted-foreground">—</span>;
  const piso = base === BASE_PISO;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={GATILHO}>
          <span className={cn('whitespace-nowrap text-[13px] tabular-nums', piso ? 'text-muted-foreground' : 'font-mono')}>
            {textoDaLista(empresa, Number(valor), base)}
          </span>
        </span>
      </TooltipTrigger>
      <ExplicacaoDoEstimado empresa={empresa} valor={Number(valor)} base={base} />
    </Tooltip>
  );
}

/** A estimativa da Base ao lado do valor do time, para comparar. */
function estimativaAoLado(empresa: EmpresaReceita): string | null {
  const { faturamento_estimado: valor, faturamento_base: base } = empresa;
  if (valor == null || !base) return null;
  return `${textoDoFaturamento(Number(valor), base)} (${ROTULO_DA_BASE[base]})`;
}

function ExplicacaoDoTime({ empresa }: { empresa: EmpresaReceita }) {
  const { byId } = useEmployeeDirectoryMap();
  const selo = seloDoInformado(empresa, (id) => byId.get(id)?.nome);
  const estimado = estimativaAoLado(empresa);
  return (
    <TooltipContent className="max-w-xs whitespace-normal text-left text-[12.5px] leading-snug">
      <p className="font-medium">Faturamento {origemDoTime(empresa.faturamento_informado_base, empresa.faturamento_confianca)}</p>
      {empresa.faturamento_fonte && <p className="mt-1">Fonte: {empresa.faturamento_fonte}</p>}
      {selo.autoria && <p className="mt-1">{selo.autoria}</p>}
      {estimado && <p className="mt-1.5 text-muted-foreground">A estimativa pela base seria {estimado}.</p>}
      {lucroRealPeloTime(Number(empresa.faturamento_informado)) && <p className="mt-1.5 font-medium text-info-emphasis">{AVISO_LUCRO_REAL}</p>}
    </TooltipContent>
  );
}

/** O faturamento que o time informou: a faixa ou o valor, com origem, confiança e fonte no tooltip (US-0056). */
function FaturamentoDoTime({ empresa }: { empresa: EmpresaReceita }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={GATILHO}>
          <span className="whitespace-nowrap font-mono text-[13px] tabular-nums">{textoDoFaturamentoDoTime(empresa)}</span>
        </span>
      </TooltipTrigger>
      <ExplicacaoDoTime empresa={empresa} />
    </Tooltip>
  );
}

function DividaBadge({ empresa }: { empresa: EmpresaReceita }) {
  const situacao = situacaoDaDivida(empresa);
  if (situacao.tipo === 'sem') {
    return <span className="inline-flex rounded-full bg-success-subtle px-2.5 py-0.5 text-xs font-medium text-success-emphasis">Sem dívida</span>;
  }
  const ajuizada = situacao.tipo === 'ajuizada';
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        ajuizada ? 'bg-destructive-subtle text-destructive-emphasis' : 'bg-warning-subtle text-warning-emphasis',
      )}
      title={ajuizada ? 'Dívida ativa da União, com parte ajuizada' : 'Dívida ativa da União em cobrança'}
    >
      {reaisCurtos(situacao.valor)}
      {ajuizada && ' · ajuizada'}
    </span>
  );
}

/** A nota de cada serviço na linha da Base (US-0014). */
const NOTA_DO_SERVICO: Record<FitFront, (e: EmpresaReceita) => number> = {
  studio: (e) => e.fit_studio,
  lei_do_bem: (e) => e.fit_lei_do_bem,
  captacao: (e) => e.fit_captacao,
  consultoria: (e) => e.fit_consultoria,
};

/** "Fit", ou "Fit · Lei do Bem" com o serviço escolhido no filtro (US-0047: nome do catálogo). */
const tituloDoFit = (servicoDoFit: FitFront | null, grupos: GrupoDeFit[]) =>
  servicoDoFit ? `Fit · ${grupos.find((g) => g.frente === servicoDoFit)?.rotuloCurto ?? ''}` : 'Fit';

/** Os serviços do catálogo no title: o que a pessoa vê ao parar o mouse na nota. */
const notasNoTitulo = (e: EmpresaReceita, grupos: GrupoDeFit[]) =>
  grupos.map((g) => `${g.rotulo}: ${NOTA_DO_SERVICO[g.frente](e) ?? 0}`).join(' · ');

function destaqueDoFit(e: EmpresaReceita, grupos: GrupoDeFit[]): string {
  const grupo = grupos.find((g) => g.frente === e.fit_frente);
  return e.fit_previo >= FIT_QUE_DESTACA && grupo ? `Maior nota: ${grupo.rotulo}. ` : 'Nenhum serviço se destaca. ';
}

function FitPrevio({ empresa, servicoDoFit }: { empresa: EmpresaReceita; servicoDoFit: FitFront | null }) {
  const { grupos } = useFitDoCatalogo();
  const nota = servicoDoFit ? NOTA_DO_SERVICO[servicoDoFit](empresa) ?? 0 : empresa.fit_previo;
  const destaque = destaqueDoFit(empresa, grupos);
  return (
    <span className="inline-flex items-center gap-2" title={`${servicoDoFit ? '' : destaque}${notasNoTitulo(empresa, grupos)}`}>
      <span className="w-6 text-right font-mono text-[13px] font-semibold tabular-nums">{nota}</span>
      <span className="h-1.5 w-11 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${nota}%` }} />
      </span>
    </span>
  );
}

function CabecalhoOrdenavel(props: {
  ordem: OrdemReceita;
  ordenacao: OrdenacaoReceita;
  onOrdenar: (ordem: OrdemReceita) => void;
  numerica: boolean;
  children: ReactNode;
}) {
  const { ordem, ordenacao, onOrdenar, numerica, children } = props;
  const ativa = ordenacao.ordem === ordem;
  const direcao = ordenacao.crescente ? 'ascending' : 'descending';
  const Icone = !ativa ? ChevronsUpDown : ordenacao.crescente ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={ativa ? direcao : 'none'} className={cn('whitespace-nowrap px-3 font-medium first:pl-5 last:pr-5', numerica && 'text-center')}>
      <button
        type="button"
        onClick={() => onOrdenar(ordem)}
        className="inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
        <Icone className={cn('h-3.5 w-3.5', !ativa && 'opacity-60')} aria-hidden="true" />
      </button>
    </th>
  );
}
