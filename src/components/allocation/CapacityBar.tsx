import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { MonthBreakdown } from '@/types/allocation';

function formatHours(value: number) {
  return `${Math.round(value)}h`;
}

/** Ocupação planejada da capacidade: o que está sob a lente, o que está com outros GPs e o que sobra. */
export function CapacityBar({
  breakdown,
  lensLabel,
  showLabel = true,
}: {
  breakdown: MonthBreakdown;
  lensLabel?: string | null;
  showLabel?: boolean;
}) {
  const { capacityHours, plannedHours, mineHours, othersHours, freeHours, overflowHours } = breakdown;
  const scale = Math.max(capacityHours, plannedHours, 1);

  const segments = [
    { key: 'mine', hours: mineHours, className: 'bg-chart-1', label: lensLabel ?? 'Sob sua gestão' },
    { key: 'others', hours: othersHours, className: 'bg-chart-2', label: lensLabel ? 'Outros GPs' : 'Planejado em projetos' },
  ].filter((segment) => segment.hours > 0);

  return (
    <div className="w-full">
      <div
        className="flex h-3 w-full items-stretch gap-[2px] overflow-hidden rounded-sm bg-muted"
        role="img"
        aria-label={`${formatHours(plannedHours)} planejadas de ${formatHours(capacityHours)} de capacidade`}
      >
        {segments.map((segment) => (
          <Tooltip key={segment.key}>
            <TooltipTrigger asChild>
              <div
                className={cn('h-full min-w-[3px] rounded-sm', segment.className)}
                style={{ width: `${(segment.hours / scale) * 100}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {segment.label}: {formatHours(segment.hours)} planejadas
            </TooltipContent>
          </Tooltip>
        ))}
        {overflowHours > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="h-full min-w-[3px] rounded-sm bg-destructive"
                style={{ width: `${(overflowHours / scale) * 100}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>Estouro: {formatHours(overflowHours)} planejadas acima da capacidade</TooltipContent>
          </Tooltip>
        )}
      </div>
      {showLabel && (
        <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
          {formatHours(plannedHours)}/{formatHours(capacityHours)}
          {overflowHours > 0 ? (
            <span className="ml-1.5 font-semibold text-destructive">· {formatHours(overflowHours)} acima</span>
          ) : (
            <span className="ml-1.5">· {formatHours(freeHours)} livres</span>
          )}
        </p>
      )}
    </div>
  );
}

export function CapacityLegend({ lensLabel }: { lensLabel?: string | null }) {
  const items = [
    ...(lensLabel ? [{ className: 'bg-chart-1', label: `${lensLabel} (projetos desta lente)` }] : []),
    { className: 'bg-chart-2', label: lensLabel ? 'Outros GPs' : 'Planejado em projetos' },
    { className: 'bg-muted', label: 'Livre para alocar' },
    { className: 'bg-destructive', label: 'Estouro (planejado acima da capacidade)' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-sm border border-border/50', item.className)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
