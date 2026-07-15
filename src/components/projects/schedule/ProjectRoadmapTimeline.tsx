import { useMemo } from 'react';
import { eachMonthOfInterval, endOfMonth, format, getDate, getDaysInMonth, isSameMonth, max, min, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Flag, Rocket, Layers, ClipboardCheck, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEffectiveMilestoneStatus, parseLocalDate } from '@/lib/milestoneStatus';
import {
  isInternalOnly,
  MilestoneStatus,
  MilestoneType,
  ProjectMilestone,
} from '@/types/projectMilestone';

const TYPE_ICONS: Record<MilestoneType, LucideIcon> = {
  marco: Flag,
  release: Rocket,
  epico: Layers,
  entrega_interna: ClipboardCheck,
};

// Tokens tonais do tema — sem cor crua. "delayed" usa destructive por ser o
// estado que mais precisa chamar atenção do GP.
const STATUS_MARK_CLASSES: Record<MilestoneStatus, string> = {
  pending: 'bg-muted-foreground/40',
  in_progress: 'bg-primary-deep/70',
  completed: 'bg-primary-deep',
  delayed: 'bg-destructive',
};

// Largura mínima de cada coluna de mês. Acima disso as colunas se distribuem
// igualmente para preencher a largura; abaixo, a faixa rola horizontalmente.
const MIN_MONTH_COL = 96;

interface ProjectRoadmapTimelineProps {
  items: ProjectMilestone[];
  projectStartDate: string;
  projectEndDate: string | null;
  today: Date;
}

export function ProjectRoadmapTimeline({ items, projectStartDate, projectEndDate, today }: ProjectRoadmapTimelineProps) {
  const months = useMemo(() => {
    const dates: Date[] = [today, parseLocalDate(projectStartDate)];
    if (projectEndDate) dates.push(parseLocalDate(projectEndDate));
    items.forEach((item) => {
      dates.push(parseLocalDate(item.start_date), parseLocalDate(item.end_date));
    });
    return eachMonthOfInterval({ start: startOfMonth(min(dates)), end: endOfMonth(max(dates)) });
  }, [items, projectStartDate, projectEndDate, today]);

  const monthCount = months.length;

  // Posição fracionária (0..1) de uma data ao longo da faixa de meses, com
  // precisão por dia dentro de cada coluna (colunas têm largura igual).
  const offsetFor = (date: Date, inclusiveEnd = false): number => {
    if (monthCount === 0) return 0;
    if (date <= months[0]) return 0;
    if (date > endOfMonth(months[monthCount - 1])) return 1;
    const index = months.findIndex((m) => isSameMonth(m, date));
    if (index === -1) return 0;
    const dim = getDaysInMonth(date);
    const dayPart = inclusiveEnd ? getDate(date) / dim : (getDate(date) - 1) / dim;
    return (index + Math.min(1, dayPart)) / monthCount;
  };

  const todayOffsetPct = offsetFor(today) * 100;

  return (
    <div className="flex overflow-hidden rounded-lg border bg-card shadow-card">
      {/* Coluna de rótulos fixa */}
      <div className="w-[240px] shrink-0 border-r">
        <div className="flex h-10 items-center border-b bg-muted px-3">
          <span className="ol-label text-muted-foreground">Item</span>
        </div>
        {items.map((item) => {
          const Icon = TYPE_ICONS[item.milestone_type] ?? Flag;
          const start = parseLocalDate(item.start_date);
          const end = parseLocalDate(item.end_date);
          const hasDuration = item.end_date > item.start_date;
          const rangeLabel = hasDuration
            ? `${format(start, 'dd/MM', { locale: ptBR })} – ${format(end, 'dd/MM', { locale: ptBR })}`
            : format(start, 'dd/MM', { locale: ptBR });
          return (
            <div key={item.id} className="flex h-12 items-center gap-1.5 border-b px-3 last:border-b-0">
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="font-mono tabular-nums">{rangeLabel}</span>
                  {isInternalOnly(item.milestone_type) && <span className="ol-label">· interno</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Faixa de meses (Gantt) — rola horizontalmente só quando os meses não cabem */}
      <div className="flex-1 overflow-x-auto">
        {/* Track: largura = max(100% do container, monthCount * MIN_MONTH_COL) */}
        <div style={{ minWidth: monthCount * MIN_MONTH_COL }}>
          {/* Cabeçalho de meses */}
          <div className="flex h-10 border-b bg-muted">
            {months.map((month) => {
              const isCurrentMonth = isSameMonth(month, today);
              return (
                <div
                  key={month.toISOString()}
                  style={{ minWidth: MIN_MONTH_COL }}
                  className={cn('flex flex-1 items-center border-r px-2 last:border-r-0', isCurrentMonth && 'bg-primary-deep/5')}
                >
                  <span className="text-xs font-semibold uppercase tracking-normal text-foreground">
                    {format(month, 'MMM/yy', { locale: ptBR }).replace('.', '')}
                    {isCurrentMonth && <span className="ml-1 text-[10px] font-semibold normal-case text-primary-deep">hoje</span>}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Linhas de itens com barras/diamantes posicionados */}
          <div className="relative">
            {/* Linha vertical do "hoje" atravessando todas as linhas */}
            {todayOffsetPct > 0 && todayOffsetPct < 100 && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary-deep/50"
                style={{ left: `${todayOffsetPct}%` }}
                aria-hidden
              />
            )}

            {items.map((item) => {
              const effectiveStatus = getEffectiveMilestoneStatus(item, today);
              const start = parseLocalDate(item.start_date);
              const end = parseLocalDate(item.end_date);
              const hasDuration = item.end_date > item.start_date;
              const startPct = offsetFor(start) * 100;
              const endPct = offsetFor(end, true) * 100;
              const widthPct = Math.max(endPct - startPct, 1.5);

              return (
                <div key={item.id} className="group relative flex h-12 border-b last:border-b-0">
                  {/* Grade de meses (fundo) */}
                  {months.map((month) => {
                    const isCurrentMonth = isSameMonth(month, today);
                    return (
                      <div
                        key={month.toISOString()}
                        style={{ minWidth: MIN_MONTH_COL }}
                        className={cn(
                          'flex-1 border-r last:border-r-0 transition-colors group-hover:bg-accent/30',
                          isCurrentMonth && 'bg-primary-deep/5',
                        )}
                      />
                    );
                  })}

                  {/* Marcador (barra ou diamante) — posicionado sobre a mesma régua das colunas */}
                  <div className="pointer-events-none absolute inset-0 flex items-center">
                    {hasDuration ? (
                      <div
                        className={cn('absolute h-2.5 rounded-full', STATUS_MARK_CLASSES[effectiveStatus])}
                        style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                        aria-label={`${item.title} — ${format(start, 'dd/MM/yyyy', { locale: ptBR })} a ${format(end, 'dd/MM/yyyy', { locale: ptBR })}`}
                      />
                    ) : (
                      <div
                        className="absolute flex items-center"
                        style={{ left: `${startPct}%`, transform: 'translateX(-50%)' }}
                        aria-label={`${item.title} — ${format(start, 'dd/MM/yyyy', { locale: ptBR })}`}
                      >
                        <span className={cn('h-3 w-3 rotate-45 rounded-[2px]', STATUS_MARK_CLASSES[effectiveStatus])} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
