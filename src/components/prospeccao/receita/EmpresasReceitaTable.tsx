import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useHideValues } from '@/contexts/HideValuesContext';
import { formatCNPJ } from '@/lib/masks';
import { ROTULO_DA_FRENTE } from '@/lib/prospecting/fit';
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
  ROTULO_DO_INFORMADO,
  textoDoFaturamento,
  textoDoInformado,
} from '@/lib/prospecting/faturamentoEstimado';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface EmpresasReceitaTableProps {
  /** Abre a ficha da empresa (US-0007): clique na linha, ou Enter com ela em foco. */
  onAbrir: (cnpj: string) => void;
  /** Com o painel de filtros aberto: menos respiro e nome e atividade mais estreitos, para caber sem rolar. */
  compacta?: boolean;
  linhas: EmpresaReceita[];
  ordenacao: OrdenacaoReceita;
  onOrdenar: (ordem: OrdemReceita) => void;
}

/**
 * Lista da base da Receita (US-0002). Nome e atividade ficam numa linha só, com o texto
 * inteiro ao passar o mouse; números não quebram. O faturamento estimado vem antes da dívida ativa, com a
 * conta no tooltip (US-0006).
 */
export function EmpresasReceitaTable({ linhas, ordenacao, onOrdenar, onAbrir, compacta = false }: EmpresasReceitaTableProps) {
  useHideValues(); // re-renderiza quando o olho de ocultar valores muda
  const ordenavel = (ordem: OrdemReceita, rotulo: string, numerica = false) => (
    <CabecalhoOrdenavel ordem={ordem} ordenacao={ordenacao} onOrdenar={onOrdenar} numerica={numerica}>
      {rotulo}
    </CabecalhoOrdenavel>
  );

  return (
    <table className={cn('w-full border-collapse', compacta ? 'min-w-[960px] text-[13px] [&_td]:px-2 [&_th]:px-2' : 'min-w-[1160px] text-[13.5px]')}>
      <caption className="sr-only">Empresas da base da Receita</caption>
      <thead>
        <tr className="h-10 border-b bg-muted/40 text-left text-[12.5px] font-medium text-muted-foreground">
          {ordenavel('nome', 'Empresa')}
          {ordenavel('distancia', 'Distância', true)}
          <th scope="col" className="whitespace-nowrap px-3 text-center font-medium">Capital social</th>
          {ordenavel('funcionarios', 'Funcionários', true)}
          <th scope="col" className="whitespace-nowrap px-3 font-medium">Atividade</th>
          {ordenavel('idade', 'Idade', true)}
          {ordenavel('faturamento', 'Faturamento', true)}
          <th scope="col" className="whitespace-nowrap px-3 font-medium">Dívida ativa</th>
          {ordenavel('fit', 'Fit prévio')}
        </tr>
      </thead>
      <tbody>
        {linhas.map((empresa) => (
          <Linha key={empresa.cnpj} empresa={empresa} compacta={compacta} onAbrir={onAbrir} />
        ))}
      </tbody>
    </table>
  );
}

const TECLA_QUE_ABRE = 'Enter';

function Linha({ empresa, compacta, onAbrir }: { empresa: EmpresaReceita; compacta: boolean; onAbrir: (cnpj: string) => void }) {
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
      <td className="px-3 py-2 pl-5">
        <div className={cn(compacta ? 'max-w-[190px]' : 'max-w-[280px]', 'truncate font-semibold leading-snug')} title={nomeCompleto}>{nome}</div>
        <div className="mt-0.5 flex gap-x-2 whitespace-nowrap text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{formatCNPJ(empresa.cnpj)}</span>
          {local && <span>{local}</span>}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-center font-mono tabular-nums">
        {empresa.distancia_km != null ? `${empresa.distancia_km.toLocaleString('pt-BR')} km` : <span title="Município não reconhecido">—</span>}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-center font-mono tabular-nums">
        {empresa.capital_social ? reaisCurtos(Number(empresa.capital_social)) : <span title="Capital social não informado na Receita">—</span>}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-center font-mono tabular-nums">
        {empresa.funcionarios != null ? empresa.funcionarios.toLocaleString('pt-BR') : <span title="Sem dado na RAIS">—</span>}
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
      <td className="px-3 py-2 pr-5"><FitPrevio empresa={empresa} /></td>
    </tr>
  );
}

const GATILHO = 'inline-flex flex-col items-center gap-1 rounded-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const AVISO_LUCRO_REAL =
  'Lucro Real provável: acima de R$ 78 mi por ano, o regime é obrigatório (Lei 9.718/1998, art. 14). Confirme na consulta da Receita.';

/**
 * Faturamento da linha (US-0006): o que o time informou na Prospecção, quando há; senão a
 * estimativa da base ("≈ valor" com a base, ou o piso do porte). A conta vai no tooltip.
 */
function FaturamentoEstimado({ empresa }: { empresa: EmpresaReceita }) {
  if (empresa.faturamento_informado != null) return <FaturamentoDoTime empresa={empresa} />;
  const { faturamento_estimado: valor, faturamento_base: base } = empresa;
  if (valor == null || !base) return <span className="text-[12.5px] text-muted-foreground">—</span>;
  const lucroReal = lucroRealProvavel(Number(valor), base);
  const piso = base === BASE_PISO;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={GATILHO}>
          <span className={cn('whitespace-nowrap text-[13px] tabular-nums', piso ? 'text-muted-foreground' : 'font-mono')}>
            {textoDoFaturamento(Number(valor), base)}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-normal text-left text-[12.5px] leading-snug">
        <p className="font-medium">Faturamento {ROTULO_DA_BASE[base]}</p>
        <p className="mt-0.5">{contaDoFaturamento(empresa.cnae_principal, empresa.funcionarios, base, empresa.capital_social)}</p>
        {lucroReal && <p className="mt-1.5 font-medium text-info-emphasis">{AVISO_LUCRO_REAL}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

function FaturamentoDoTime({ empresa }: { empresa: EmpresaReceita }) {
  const valor = Number(empresa.faturamento_informado);
  const rotulo = empresa.faturamento_informado_base ? ROTULO_DO_INFORMADO[empresa.faturamento_informado_base] : 'informado pelo time';
  const estimado = empresa.faturamento_estimado != null && empresa.faturamento_base
    ? `${textoDoFaturamento(Number(empresa.faturamento_estimado), empresa.faturamento_base)} (${ROTULO_DA_BASE[empresa.faturamento_base]})`
    : null;
  const lucroReal = lucroRealPeloTime(valor);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={GATILHO}>
          <span className="whitespace-nowrap font-mono text-[13px] tabular-nums">{textoDoInformado(valor)}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-normal text-left text-[12.5px] leading-snug">
        <p className="font-medium">Faturamento {rotulo}</p>
        <p className="mt-0.5">Valor informado na Prospecção.{estimado && ` A estimativa pela base seria ${estimado}.`}</p>
        {lucroReal && <p className="mt-1.5 font-medium text-info-emphasis">{AVISO_LUCRO_REAL}</p>}
      </TooltipContent>
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

function FitPrevio({ empresa }: { empresa: EmpresaReceita }) {
  const nota = empresa.fit_previo;
  return (
    <span className="inline-flex items-center gap-2" title={`Maior nota: ${ROTULO_DA_FRENTE[empresa.fit_frente]}`}>
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
