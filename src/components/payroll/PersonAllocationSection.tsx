import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { formatHours } from '@/lib/relatorioHoras';
import { AllocationLineKind } from '@/types/rateio';
import type { AllocationLine, PersonAllocation } from '@/types/rateio';

/** Rateio de uma pessoa no mês, no detalhe aberto pela Custo x Hora (decisão do Italo, 01/10/2026). */

function LineRow({ line }: { line: AllocationLine }) {
  const notLogged = line.kind === AllocationLineKind.NotLogged;
  return (
    <li className="space-y-1 py-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className={notLogged ? 'font-medium text-warning-emphasis' : 'font-medium text-foreground'}>{line.label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {formatHours(line.hours)} · {(line.share * 100).toFixed(1)}%
        </span>
        <span className="w-28 shrink-0 text-right font-semibold tabular-nums text-foreground">{formatCurrency(line.value)}</span>
      </div>
      {line.items.length > 0 && (
        <ul className="space-y-0.5 pl-3 text-xs text-muted-foreground">
          {line.items.map((item) => (
            <li key={item.key} className="flex justify-between gap-3">
              <span>
                {item.name}
                {item.kind === 'atividade' && ' (atividade interna)'}
              </span>
              <span className="tabular-nums">{formatHours(item.hours)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function PersonAllocationSection(props: { allocation: PersonAllocation | undefined; isLoading: boolean; monthLabel: string }) {
  const { allocation, isLoading, monthLabel } = props;
  return (
    <section className="space-y-2 rounded-lg border border-border p-4" aria-labelledby="rateio-pessoa">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="rateio-pessoa" className="text-sm font-semibold text-foreground">
          Rateio por centro de custo{monthLabel ? ` — ${monthLabel}` : ''}
        </h3>
        {allocation && !allocation.logsHours && <Badge variant="neutral">Não lança hora: vai para o centro de lotação</Badge>}
      </div>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !allocation ? (
        <p className="text-sm text-muted-foreground">Sem custo neste mês.</p>
      ) : (
        <>
          {allocation.logsHours && (
            <p className="text-xs text-muted-foreground">
              Lançou {formatHours(allocation.lancado)} de {formatHours(allocation.jornada)} da jornada. Cada centro recebe as horas
              lançadas nele × o custo-hora do mês; o que não foi lançado não vai para centro nenhum.
            </p>
          )}
          <ul className="divide-y divide-border">
            {allocation.lines.map((line) => (
              <LineRow key={line.key} line={line} />
            ))}
          </ul>
          <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold text-foreground">
            <span>Total Mensal</span>
            <span className="tabular-nums">{formatCurrency(allocation.total)}</span>
          </div>
        </>
      )}
    </section>
  );
}
