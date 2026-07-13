import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { laborDeltaTextTone } from '@/lib/laborDeltaTone';
import { LaborBreakdownRow } from '@/hooks/useProjectLaborBreakdown';
import { LaborCostMonthlyExpansion } from './LaborCostMonthlyExpansion';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatHours(value: number) {
  return `${Math.round(value)}h`;
}

function formatDelta(deltaCost: number, deltaPct: number | null, formatCurrency: (v: number) => string) {
  const sign = deltaCost > 0 ? '+' : '';
  const pctText = deltaPct === null ? '—' : `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(0)}%`;
  return `${sign}${formatCurrency(deltaCost)} · ${pctText}`;
}

interface LaborCostTableFullProps {
  rows: LaborBreakdownRow[];
  projectStartDate: string;
  projectEndDate: string | null;
}

export function LaborCostTableFull({ rows, projectStartDate, projectEndDate }: LaborCostTableFullProps) {
  const formatCurrency = useMaskedCurrency();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-[minmax(0,1fr)_100px_130px_130px_150px_36px] items-center gap-2 border-b bg-muted px-4 py-2">
        <span className="ol-label text-muted-foreground">Membro</span>
        <span className="ol-label text-right text-muted-foreground">Horas</span>
        <span className="ol-label text-right text-muted-foreground">Planejado</span>
        <span className="ol-label text-right text-muted-foreground">Realizado</span>
        <span className="ol-label text-right text-muted-foreground">Desvio</span>
        <span className="sr-only">Expandir</span>
      </div>

      <div className="divide-y">
        {rows.map((row) => {
          const isOpen = expanded.has(row.employeeId);
          const deltaTone = laborDeltaTextTone(row.realizedCost, row.plannedCost);
          return (
            <div key={row.employeeId}>
              <button
                type="button"
                onClick={() => toggle(row.employeeId)}
                className={cn(
                  'grid w-full grid-cols-[minmax(0,1fr)_100px_130px_130px_150px_36px] items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/40',
                  row.deallocated && 'opacity-60',
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                      {initials(row.employee?.nome ?? '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{row.employee?.nome ?? 'Funcionário'}</p>
                    <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <span className="truncate">{row.roleName}</span>
                      {row.isUnbudgeted && (
                        <Badge variant="outline" className="shrink-0 border-transparent bg-warning/10 px-1.5 py-0 text-[10px] text-warning">
                          Não orçado
                        </Badge>
                      )}
                      {row.deallocated && <span className="shrink-0 text-[10px]">· desalocado</span>}
                    </div>
                  </div>
                </div>

                <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {formatHours(row.plannedHours)} / {formatHours(row.realizedHours)}
                </span>
                <span className="text-right font-mono text-sm tabular-nums text-foreground">
                  {formatCurrency(row.plannedCost)}
                </span>
                <span className="text-right font-mono text-sm tabular-nums text-foreground">
                  {formatCurrency(row.realizedCost)}
                </span>
                <span className={cn('text-right font-mono text-xs font-medium tabular-nums', deltaTone)}>
                  {formatDelta(row.deltaCost, row.deltaPct, formatCurrency)}
                </span>
                <span className="flex justify-end">
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                </span>
              </button>

              {isOpen && (
                <LaborCostMonthlyExpansion
                  months={row.months}
                  projectStartDate={projectStartDate}
                  projectEndDate={projectEndDate}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
