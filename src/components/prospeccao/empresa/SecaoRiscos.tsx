import { Check, Flag } from 'lucide-react';
import { SECAO_DA_EMPRESA } from '@/lib/prospecting/faseDaEmpresa.constants';
import { riscosDaEmpresa } from '@/lib/prospecting/paginaDaEmpresa';
import { cn } from '@/lib/utils';
import type { FichaReceita } from '@/types/fichaReceita';
import type { ItemDeRisco } from '@/types/paginaDaEmpresa';
import { Secao } from './PecasDaPagina';

function Risco({ risco }: { risco: ItemDeRisco }) {
  const Icone = risco.atencao ? Flag : Check;
  return (
    <li className={cn('flex items-center gap-3 border-t px-4 py-3 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0', risco.atencao && 'bg-warning-subtle')}>
      <span aria-hidden="true" className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full', risco.atencao ? 'bg-card text-warning-emphasis' : 'bg-success-subtle text-success-emphasis')}>
        <Icone className="h-3.5 w-3.5" />
      </span>
      <span className="grid min-w-0 leading-tight">
        <span className="text-[12px] font-semibold text-muted-foreground">{risco.titulo}</span>
        <span className={cn('text-[14px] font-semibold', risco.atencao && 'text-warning-emphasis')}>{risco.valor}</span>
        {risco.detalhe && <span className="text-[12px] text-muted-foreground">{risco.detalhe}</span>}
      </span>
    </li>
  );
}

/** Riscos da empresa na Receita (US-0053): situação, dívida ativa e o valor dela. Perdas ficam no Histórico. */
export function SecaoRiscos({ ficha }: { ficha: FichaReceita }) {
  const riscos = riscosDaEmpresa(ficha.empresa);
  const atencao = riscos.filter((r) => r.atencao).length;
  const selo = atencao > 0 && (
    <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-[12px] font-semibold text-warning-emphasis">
      {atencao} {atencao > 1 ? 'pontos' : 'ponto'} de atenção
    </span>
  );
  return (
    <Secao id={SECAO_DA_EMPRESA.RISCOS} titulo="Riscos" selo={selo || undefined}>
      <ul className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-3">
        {riscos.map((r) => <Risco key={r.titulo} risco={r} />)}
      </ul>
    </Secao>
  );
}
