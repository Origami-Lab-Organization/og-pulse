import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import { formatHours } from '@/lib/relatorioHoras';
import { cn } from '@/lib/utils';
import { AllocationLineKind } from '@/types/rateio';
import type { AllocationLine, PersonAllocation } from '@/types/rateio';

/** Rateio de uma pessoa no mês, no detalhe aberto pela Custo x Hora (decisão do Italo, 01/10/2026). */

/**
 * Mesmas colunas no cabeçalho, nos centros, nos itens e no total — os números ficam um embaixo do
 * outro. No celular só o valor fica em coluna; horas e % descem para baixo do nome do centro.
 */
const GRID = 'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 sm:grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_7rem]';
const formatShare = (share: number) => `${(share * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

function LineRow({ line }: { line: AllocationLine }) {
  const notLogged = line.kind === AllocationLineKind.NotLogged;
  return (
    <li className="space-y-1 py-2">
      <div className={cn(GRID, 'text-sm')}>
        <span className={cn('font-medium [overflow-wrap:anywhere]', notLogged ? 'text-warning-emphasis' : 'text-foreground')}>
          {line.label}
          <span className="block text-xs font-normal tabular-nums text-muted-foreground sm:hidden">
            {formatHours(line.hours)} · {formatShare(line.share)}
          </span>
        </span>
        <span className="hidden text-right tabular-nums text-muted-foreground sm:block">{formatHours(line.hours)}</span>
        <span className="hidden text-right tabular-nums text-muted-foreground sm:block">{formatShare(line.share)}</span>
        <span className="text-right font-semibold tabular-nums text-foreground">{formatCurrency(line.value)}</span>
      </div>
      {line.items.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {line.items.map((item) => (
            <li key={item.key} className={GRID}>
              <span className="pl-3 [overflow-wrap:anywhere]">
                {item.name}
                {item.kind === 'atividade' && ' (atividade interna)'}
              </span>
              <span className="text-right tabular-nums">{formatHours(item.hours)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function ColumnHeader() {
  return (
    <div className={cn(GRID, 'border-b border-border pb-1.5 text-xs font-medium text-muted-foreground')} aria-hidden="true">
      <span>Centro de custo</span>
      <span className="hidden text-right sm:block">Horas</span>
      <span className="hidden whitespace-nowrap text-right sm:block">Da jornada</span>
      <span className="text-right">Valor</span>
    </div>
  );
}

function AuditLink({ allocation, monthKey }: { allocation: PersonAllocation | undefined; monthKey: string | undefined }) {
  const { can } = useAuth();
  if (!allocation?.logsHours || !monthKey || !can('timesheet-terceiro:ler')) return null;
  return (
    <Button asChild variant="outline" size="sm">
      <Link to={`/analises/custo-hora/auditoria/${allocation.employeeId}?mes=${monthKey}`}>
        <ClipboardCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Auditar horas
      </Link>
    </Button>
  );
}

export function PersonAllocationSection(props: {
  allocation: PersonAllocation | undefined;
  isLoading: boolean;
  monthKey: string | undefined;
  monthLabel: string;
}) {
  const { allocation, isLoading, monthKey, monthLabel } = props;
  return (
    <section className="space-y-2 rounded-lg border border-border p-4" aria-labelledby="rateio-pessoa">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="rateio-pessoa" className="text-sm font-semibold text-foreground">
          Rateio por centro de custo{monthLabel ? ` — ${monthLabel}` : ''}
        </h3>
        {allocation && !allocation.logsHours && <Badge variant="neutral">Não lança hora: vai para o centro de lotação</Badge>}
        <AuditLink allocation={allocation} monthKey={monthKey} />
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
          <ColumnHeader />
          <ul className="divide-y divide-border">
            {allocation.lines.map((line) => (
              <LineRow key={line.key} line={line} />
            ))}
          </ul>
          <div className={cn(GRID, 'border-t border-border pt-2 text-sm font-semibold text-foreground')}>
            <span>Total Mensal</span>
            <span className="hidden sm:block" />
            <span className="hidden sm:block" />
            <span className="text-right tabular-nums">{formatCurrency(allocation.total)}</span>
          </div>
        </>
      )}
    </section>
  );
}
