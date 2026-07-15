import { useMemo } from 'react';
import { TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProjectMonth } from '@/lib/projectMonths';
import { useEmployeeMonthlyLoad, monthLoadKey } from '@/hooks/useEmployeeMonthlyLoad';
import { getUtilizationStatus, UTILIZATION_META } from '@/lib/utilization';

interface AvailabilityPanelProps {
  tenantId: string;
  employeeId: string | undefined;
  projectId: string;
  projectMonths: ProjectMonth[];
  /** Horas DESTA alocação em composição, por chave `${year}-${month}`. */
  hoursByKey: Record<string, number>;
  /** Horas já salvas deste funcionário NESTE projeto (edição), p/ não contar em "outros". */
  savedThisProjectHours?: Record<string, number>;
}

function formatHrs(value: number) {
  return `${Math.round(value * 10) / 10}h`;
}

export function AvailabilityPanel({
  tenantId,
  employeeId,
  projectId,
  projectMonths,
  hoursByKey,
  savedThisProjectHours = {},
}: AvailabilityPanelProps) {
  const years = useMemo(() => Array.from(new Set(projectMonths.map((pm) => pm.year))), [projectMonths]);
  const { data: loadByKey = {}, isLoading } = useEmployeeMonthlyLoad({
    tenantId,
    employeeId,
    years,
    excludeProjectId: projectId,
  });

  const monthStats = useMemo(
    () =>
      projectMonths.map((pm) => {
        const key = monthLoadKey(pm.year, pm.month);
        const load = loadByKey[key];
        const capacity = load?.capacityHours ?? 0;
        const others = Math.max(0, Math.round((load?.totalPlanned ?? 0) - (savedThisProjectHours[key] ?? 0)));
        const planned = Math.max(0, hoursByKey[key] ?? 0);
        const total = others + planned;
        const util = getUtilizationStatus(total, capacity);
        const named = load?.byProject ?? [];
        const namedSum = named.reduce((sum, p) => sum + p.hours, 0);
        const remainder = Math.max(0, others - namedSum);
        return { pm, key, capacity, others, planned, total, util, named, remainder };
      }),
    [projectMonths, loadByKey, savedThisProjectHours, hoursByKey],
  );

  const overMonths = monthStats.filter((m) => m.capacity > 0 && m.total > m.capacity);

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-4 py-2">
        <p className="ol-label text-muted-foreground">Disponibilidade</p>
        {overMonths.length > 0 && (
          <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-destructive">
            <TriangleAlert className="h-3 w-3" />
            {overMonths.length} {overMonths.length === 1 ? 'mês acima' : 'meses acima'}
          </Badge>
        )}
      </div>

      <TooltipProvider delayDuration={150}>
        <div className="overflow-x-auto p-3">
          <div className="flex w-max gap-2">
            {monthStats.map(({ pm, key, capacity, others, planned, total, util, named, remainder }) => {
              const othersPct = capacity > 0 ? Math.min(100, (others / capacity) * 100) : 0;
              const thisPct = capacity > 0 ? Math.min(100 - othersPct, (planned / capacity) * 100) : 0;
              const meta = UTILIZATION_META[util.status];
              return (
                <div key={key} className="flex min-w-[68px] flex-col items-center gap-1.5">
                  <span className="text-xs font-medium capitalize text-muted-foreground">{pm.label}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Carga de ${pm.label}`}
                        className="flex h-2 w-full cursor-help overflow-hidden rounded-full bg-muted"
                      >
                        <span className="h-full bg-muted-foreground/40" style={{ width: `${othersPct}%` }} />
                        <span className={cn('h-full', meta.dot)} style={{ width: `${thisPct}%` }} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px]">
                      <p className="font-medium">
                        {pm.label} — capacidade {capacity > 0 ? formatHrs(capacity) : 'não cadastrada'}
                      </p>
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {named.length === 0 && remainder === 0 ? (
                          <li className="text-muted-foreground">Sem outras alocações neste mês</li>
                        ) : (
                          <>
                            {named.map((proj) => (
                              <li key={proj.projectId} className="flex justify-between gap-3">
                                <span className="truncate">{proj.projectName}</span>
                                <span className="font-mono tabular-nums">{formatHrs(proj.hours)}</span>
                              </li>
                            ))}
                            {remainder > 0 && (
                              <li className="flex justify-between gap-3 text-muted-foreground">
                                <span className="truncate">Outras alocações</span>
                                <span className="font-mono tabular-nums">{formatHrs(remainder)}</span>
                              </li>
                            )}
                          </>
                        )}
                        <li className="flex justify-between gap-3 border-t pt-0.5 font-medium">
                          <span>Este projeto</span>
                          <span className="font-mono tabular-nums">{formatHrs(planned)}</span>
                        </li>
                      </ul>
                      {capacity > 0 && (
                        <p
                          className={cn(
                            'mt-1 text-xs font-semibold',
                            total > capacity ? 'text-destructive' : 'text-foreground',
                          )}
                        >
                          {total > capacity
                            ? `Excede ${formatHrs(total - capacity)}`
                            : `Livre ${formatHrs(capacity - total)}`}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                  <span
                    className={cn(
                      'text-[10px] leading-tight',
                      capacity > 0 && total > capacity ? 'font-medium text-destructive' : 'text-muted-foreground',
                    )}
                  >
                    {capacity > 0
                      ? total > capacity
                        ? `excede ${formatHrs(total - capacity)}`
                        : `livre ${formatHrs(capacity - total)}`
                      : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </TooltipProvider>

      <div className="flex items-center gap-3 border-t px-4 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Outros projetos
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary-deep" /> Esta alocação
        </span>
        {isLoading && <span className="ml-auto">Carregando…</span>}
      </div>
    </section>
  );
}
