import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ProjectMonth } from '@/lib/projectMonths';
import { useEmployeeMonthlyLoad, monthLoadKey, MonthLoadProject } from '@/hooks/useEmployeeMonthlyLoad';

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

interface MonthStat {
  pm: ProjectMonth;
  key: string;
  capacity: number;
  others: number;
  planned: number;
  total: number;
  /** Quanto passa da capacidade (0 quando cabe ou quando não há capacidade cadastrada). */
  overflow: number;
  named: MonthLoadProject[];
  remainder: number;
}

function formatHrs(value: number) {
  return `${Math.round(value * 10) / 10}h`;
}

/** Larguras (% da barra) de cada faixa; a barra cresce além da capacidade quando estoura. */
function barSegments(stat: MonthStat) {
  const { capacity, others, planned, total, overflow } = stat;
  const scale = Math.max(capacity, total);
  if (scale <= 0) return { othersPct: 0, thisPct: 0, overPct: 0, capacityPct: 100 };
  const othersWithin = Math.min(others, capacity);
  const thisWithin = Math.min(planned, Math.max(0, capacity - othersWithin));
  return {
    othersPct: (othersWithin / scale) * 100,
    thisPct: (thisWithin / scale) * 100,
    overPct: (overflow / scale) * 100,
    capacityPct: (capacity / scale) * 100,
  };
}

function capacityLabel(capacity: number) {
  return capacity > 0 ? `capacidade ${formatHrs(capacity)}` : 'capacidade não cadastrada';
}

/** Valor da linha final: horas livres, quanto estoura ou "—" sem capacidade cadastrada. */
function balanceValue(stat: MonthStat) {
  if (stat.capacity <= 0) return '—';
  if (stat.overflow > 0) return `+${formatHrs(stat.overflow)}`;
  return formatHrs(stat.capacity - stat.total);
}

function MonthColumn({ stat }: { stat: MonthStat }) {
  const { pm, capacity, others, planned, overflow } = stat;
  const { othersPct, thisPct, overPct, capacityPct } = barSegments(stat);
  const over = overflow > 0;

  return (
    <div className="flex min-w-[112px] flex-1 flex-col gap-1.5">
      <span className="text-xs font-medium capitalize text-foreground">{pm.label}</span>
      <div
        role="img"
        aria-label={`${pm.label}: ${formatHrs(others)} em outros projetos, ${formatHrs(planned)} nesta alocação, ${capacityLabel(capacity)}`}
        className="relative flex h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <span className="h-full bg-muted-foreground/40" style={{ width: `${othersPct}%` }} />
        <span className="h-full bg-primary-deep" style={{ width: `${thisPct}%` }} />
        <span className="h-full bg-destructive" style={{ width: `${overPct}%` }} />
        {over && (
          <span
            aria-hidden
            className="absolute top-0 h-full w-px bg-foreground/70"
            style={{ left: `${capacityPct}%` }}
          />
        )}
      </div>
      <dl className="space-y-0.5 text-[11px] leading-tight">
        <div className="flex justify-between gap-2 text-muted-foreground">
          <dt>Já alocado</dt>
          <dd className="font-mono tabular-nums">{formatHrs(others)}</dd>
        </div>
        <div className="flex justify-between gap-2 text-foreground">
          <dt>Esta alocação</dt>
          <dd className="font-mono tabular-nums">{formatHrs(planned)}</dd>
        </div>
        <div
          className={cn(
            'flex justify-between gap-2 border-t pt-0.5 font-semibold',
            over ? 'text-destructive' : 'text-foreground',
          )}
        >
          <dt>{over ? 'Estoura' : 'Livre'}</dt>
          <dd className="font-mono tabular-nums">{balanceValue(stat)}</dd>
        </div>
      </dl>
      <span className="text-[10px] text-muted-foreground">{capacityLabel(capacity)}</span>
    </div>
  );
}

function ConflictItem({ stat }: { stat: MonthStat }) {
  const { pm, overflow, named, remainder } = stat;
  return (
    <li className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
      <p className="text-xs font-semibold text-destructive">
        <span className="capitalize">{pm.label}</span> — estoura {formatHrs(overflow)}
      </p>
      <ul className="mt-1 space-y-0.5 text-xs">
        {named.map((proj) => (
          <li key={proj.projectId} className="flex items-center justify-between gap-3">
            <Link
              to={`/projects/${proj.projectId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 items-center gap-1 text-foreground underline-offset-4 hover:underline focus-visible:underline"
            >
              <span className="truncate">{proj.projectName}</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="sr-only">(abre em nova aba)</span>
            </Link>
            <span className="font-mono tabular-nums text-muted-foreground">{formatHrs(proj.hours)}</span>
          </li>
        ))}
        {remainder > 0 && (
          <li className="flex justify-between gap-3 text-muted-foreground">
            <span className="truncate">Outras alocações (sem detalhe de projeto)</span>
            <span className="font-mono tabular-nums">{formatHrs(remainder)}</span>
          </li>
        )}
      </ul>
    </li>
  );
}

export function AvailabilityPanel(props: AvailabilityPanelProps) {
  const { tenantId, employeeId, projectId, projectMonths, hoursByKey, savedThisProjectHours = {} } = props;
  const years = useMemo(() => Array.from(new Set(projectMonths.map((pm) => pm.year))), [projectMonths]);
  const { data: loadByKey = {}, isLoading } = useEmployeeMonthlyLoad({
    tenantId,
    employeeId,
    years,
    excludeProjectId: projectId,
  });

  const monthStats = useMemo<MonthStat[]>(
    () =>
      projectMonths.map((pm) => {
        const key = monthLoadKey(pm.year, pm.month);
        const load = loadByKey[key];
        const capacity = load?.capacityHours ?? 0;
        const others = Math.max(0, Math.round((load?.totalPlanned ?? 0) - (savedThisProjectHours[key] ?? 0)));
        const planned = Math.max(0, hoursByKey[key] ?? 0);
        const total = others + planned;
        const overflow = capacity > 0 ? Math.max(0, total - capacity) : 0;
        const named = load?.byProject ?? [];
        const namedSum = named.reduce((sum, p) => sum + p.hours, 0);
        const remainder = Math.max(0, others - namedSum);
        return { pm, key, capacity, others, planned, total, overflow, named, remainder };
      }),
    [projectMonths, loadByKey, savedThisProjectHours, hoursByKey],
  );

  const overMonths = monthStats.filter((m) => m.overflow > 0);

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-4 py-2">
        <p className="ol-label text-muted-foreground">Disponibilidade</p>
        {overMonths.length > 0 && (
          <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-destructive">
            <TriangleAlert className="h-3 w-3" />
            {overMonths.length} {overMonths.length === 1 ? 'mês estoura' : 'meses estouram'} a capacidade
          </Badge>
        )}
      </div>

      <div className="overflow-x-auto p-3">
        <div className="flex w-max min-w-full gap-3">
          {monthStats.map((stat) => (
            <MonthColumn key={stat.key} stat={stat} />
          ))}
        </div>
      </div>

      {overMonths.length > 0 && (
        <div className="space-y-2 border-t px-3 py-3">
          <p className="text-xs text-muted-foreground">
            Projetos que já consomem a capacidade nos meses acima — abra-os para negociar a alocação:
          </p>
          <ul className="space-y-2">
            {overMonths.map((stat) => (
              <ConflictItem key={stat.key} stat={stat} />
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Outros projetos
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary-deep" /> Esta alocação
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-destructive" /> Acima da capacidade
        </span>
        {isLoading && <span className="ml-auto">Carregando…</span>}
      </div>
    </section>
  );
}
