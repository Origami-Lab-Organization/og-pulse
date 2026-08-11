import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { gpoMonthPercent } from '@/lib/gpoAllocation';
import { GPO_HEALTHY_MAX, GPO_HEALTHY_MIN } from '@/lib/gpoAllocation.constants';
import type { GpoAllocation, GpoBand, GpoMonthBreakdown } from '@/types/equipe.types';

const BAND_STYLES: Record<GpoBand, { value: string; bar: string; track: string }> = {
  healthy: { value: 'text-primary-deep', bar: 'bg-primary-deep', track: 'bg-primary-deep/15' },
  under: { value: 'text-warning', bar: 'bg-warning', track: 'bg-warning/15' },
  over: { value: 'text-destructive', bar: 'bg-destructive', track: 'bg-destructive/15' },
  unknown: { value: 'text-muted-foreground', bar: 'bg-muted-foreground', track: 'bg-muted' },
};

const BAND_READING: Record<GpoBand, string> = {
  healthy: `Dentro da faixa saudável (${GPO_HEALTHY_MIN}–${GPO_HEALTHY_MAX}%).`,
  under: `Abaixo da faixa saudável (${GPO_HEALTHY_MIN}–${GPO_HEALTHY_MAX}%) — subconsumo ou apontamento atrasado.`,
  over: `Acima da faixa saudável (${GPO_HEALTHY_MIN}–${GPO_HEALTHY_MAX}%) — estouro de horas.`,
  unknown: 'Sem horas planejadas no período considerado.',
};

function formatHours(hours: number) {
  return `${Math.round(hours)}h`;
}

function formatPercent(percent: number | null) {
  if (percent === null) return '—';
  return `${percent.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function MonthBreakdownRow({ month }: { month: GpoMonthBreakdown }) {
  return (
    <tr className="border-t border-border/60">
      <td className="py-1.5 pr-2 text-foreground">
        <span className="uppercase">{month.label.replace('.', '')}</span>
        {month.isProRata && (
          <Badge
            variant="outline"
            className="ml-1.5 border-transparent bg-primary-deep/10 px-1 py-0 text-[9px] font-semibold text-primary-deep"
          >
            pro-rata
          </Badge>
        )}
      </td>
      <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-foreground">
        {formatHours(month.plannedConsidered)}
        {month.isProRata && (
          <span className="ml-1 text-muted-foreground">de {formatHours(month.plannedHours)}</span>
        )}
      </td>
      <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-foreground">
        {formatHours(month.realizedHours)}
      </td>
      <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">
        {formatPercent(gpoMonthPercent(month))}
      </td>
    </tr>
  );
}

interface GpoAllocationSummaryProps {
  allocation: GpoAllocation;
}

export function GpoAllocationSummary({ allocation }: GpoAllocationSummaryProps) {
  const { percent, band, plannedAccrued, realizedAccrued, months } = allocation;
  const styles = BAND_STYLES[band];
  const barWidth = percent === null ? 0 : Math.min(100, percent);
  const proRataMonth = months.find((m) => m.isProRata);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="ol-label text-muted-foreground">Alocação GPO</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={cn('font-mono text-2xl font-semibold tabular-nums leading-none', styles.value)}>
              {formatPercent(percent)}
            </span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatHours(realizedAccrued)} realizadas / {formatHours(plannedAccrued)} planejadas
            </span>
          </div>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-xs">
              <Info className="h-3.5 w-3.5" aria-hidden />
              Como é calculado
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-3">
            <p className="text-sm font-semibold text-foreground">Alocação no padrão GPO</p>
            {months.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum mês fechado ou corrente na grade — nada a acumular ainda.
              </p>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="pb-1 text-left font-medium">Mês</th>
                    <th className="pb-1 text-right font-medium">Planejado</th>
                    <th className="pb-1 text-right font-medium">Realizado</th>
                    <th className="pb-1 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((month) => (
                    <MonthBreakdownRow key={month.key} month={month} />
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Meses fechados entram cheios. O mês corrente entra em pro-rata pelos dias úteis já decorridos —
              o realizado dele entra pelo valor cheio apontado. Meses futuros são ignorados. A base é a mesma
              do total da tabela, incluindo desalocados.
            </p>
          </PopoverContent>
        </Popover>
      </div>

      <div
        className={cn('mt-3 flex h-1.5 w-full overflow-hidden rounded-full', styles.track)}
        role="progressbar"
        aria-valuenow={percent ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Alocação acumulada: ${formatPercent(percent)}`}
      >
        <span className={cn('h-full transition-all', styles.bar)} style={{ width: `${barWidth}%` }} />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {BAND_READING[band]}
        {proRataMonth && (
          <>
            {' '}
            <span className="uppercase">{proRataMonth.label.replace('.', '')}</span> em pro-rata · dia útil{' '}
            {proRataMonth.elapsedWorkingDays} de {proRataMonth.workingDays}.
          </>
        )}
      </p>
    </div>
  );
}
