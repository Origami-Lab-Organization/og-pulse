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
import { cn } from '@/lib/utils';

interface EmpresasReceitaTableProps {
  linhas: EmpresaReceita[];
  ordenacao: OrdenacaoReceita;
  onOrdenar: (ordem: OrdemReceita) => void;
}

/**
 * Lista da base da Receita (US-0002). Nome e atividade cortam em duas linhas; o texto
 * inteiro aparece ao passar o mouse. Faturamento estimado só aparece quando a carga traz
 * o valor (US-0006) — coluna inteira de traço não ajuda ninguém.
 */
export function EmpresasReceitaTable({ linhas, ordenacao, onOrdenar }: EmpresasReceitaTableProps) {
  useHideValues(); // re-renderiza quando o olho de ocultar valores muda
  const comFaturamento = linhas.some((l) => l.faturamento_estimado != null);
  const ordenavel = (ordem: OrdemReceita, rotulo: string, numerica = false) => (
    <CabecalhoOrdenavel ordem={ordem} ordenacao={ordenacao} onOrdenar={onOrdenar} numerica={numerica}>
      {rotulo}
    </CabecalhoOrdenavel>
  );

  return (
    <table className="w-full min-w-[960px] border-collapse text-[13.5px]">
      <caption className="sr-only">Empresas da base da Receita</caption>
      <thead>
        <tr className="h-10 border-b bg-muted/40 text-left text-[12.5px] font-medium text-muted-foreground">
          {ordenavel('nome', 'Empresa')}
          {comFaturamento && <th scope="col" className="px-3 text-right font-medium">Faturamento estimado</th>}
          {ordenavel('funcionarios', 'Funcionários', true)}
          <th scope="col" className="px-3 font-medium">Atividade</th>
          {ordenavel('idade', 'Idade', true)}
          <th scope="col" className="px-3 font-medium">Dívida ativa</th>
          {ordenavel('fit', 'Fit prévio')}
        </tr>
      </thead>
      <tbody>
        {linhas.map((empresa) => (
          <Linha key={empresa.cnpj} empresa={empresa} comFaturamento={comFaturamento} />
        ))}
      </tbody>
    </table>
  );
}

function Linha({ empresa, comFaturamento }: { empresa: EmpresaReceita; comFaturamento: boolean }) {
  const nome = nomeDaEmpresa(empresa);
  const ramo = ramoDaEmpresa(empresa.cnae_principal);
  const anos = anosDeOperacao(empresa.data_inicio_atividade);
  const local = [emTitulo(empresa.municipio), empresa.uf].filter(Boolean).join(' · ');
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/40">
      <td className="px-3 py-2 pl-5">
        <div className="line-clamp-2 max-w-[280px] font-semibold leading-snug" title={emTitulo(empresa.razao_social)}>{nome}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{formatCNPJ(empresa.cnpj)}</span>
          {local && <span>{local}</span>}
        </div>
      </td>
      {comFaturamento && (
        <td className="px-3 py-2 text-right font-mono tabular-nums">
          {empresa.faturamento_estimado != null ? reaisCurtos(Number(empresa.faturamento_estimado)) : '—'}
        </td>
      )}
      <td className="px-3 py-2 text-right font-mono tabular-nums">
        {empresa.funcionarios != null ? empresa.funcionarios.toLocaleString('pt-BR') : <span title="Sem dado na RAIS">—</span>}
      </td>
      <td className="px-3 py-2">
        <div className="line-clamp-2 max-w-[240px] text-[13px] leading-snug" title={empresa.cnae_descricao ?? undefined}>
          {empresa.cnae_descricao ?? empresa.cnae_principal}
        </div>
        {ramo && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {ramo}
            {empresa.pela_secundaria && ' · entrou pela atividade secundária'}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right font-mono tabular-nums">{anos != null ? `${anos} a` : '—'}</td>
      <td className="px-3 py-2"><DividaBadge empresa={empresa} /></td>
      <td className="px-3 py-2 pr-5"><FitPrevio empresa={empresa} /></td>
    </tr>
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
    <th scope="col" aria-sort={ativa ? direcao : 'none'} className={cn('px-3 font-medium first:pl-5 last:pr-5', numerica && 'text-right')}>
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
