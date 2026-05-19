import { Briefcase, Activity, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AllocationTypeKpis } from '@/hooks/useAllocationTypeKpis';

interface AllocationTypeKPIRowProps {
  data: AllocationTypeKpis | null | undefined;
  isLoading?: boolean;
  capacityAnnual: number;
  capacityYtd: number;
  capacityMonth: number;
  selectedYear: number;
  currentMonth: number;
  weekCutoffDate: string;
  ytdCutoffDate: string;
}

function pct(hours: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.round((hours / capacity) * 100);
}

function colorClass(value: number): string {
  if (value === 0) return 'text-muted-foreground';
  if (value > 100) return 'text-red-600 dark:text-red-400';
  if (value >= 80) return 'text-green-600 dark:text-green-400';
  return 'text-amber-600 dark:text-amber-400';
}

function monthLabel(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), 'MMMM', { locale: ptBR });
}

function formatCutoff(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  actualPct: number;
  plannedPct: number;
  tooltipText?: string;
}

function KPICard({ icon: Icon, label, sublabel, actualPct, plannedPct, tooltipText }: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="bg-muted rounded-lg p-2 shrink-0 mt-0.5">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-3xl font-bold leading-none ${colorClass(actualPct)}`}>
                {actualPct}%
              </span>
              {tooltipText && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px] text-xs">
                      {tooltipText}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Plan: {plannedPct}%
            </p>
            <p className="text-xs font-medium text-foreground mt-1 truncate">{label}</p>
            <p className="text-[10px] text-muted-foreground truncate">{sublabel}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AllocationTypeKPIRow({
  data,
  isLoading,
  capacityAnnual,
  capacityYtd,
  capacityMonth,
  selectedYear,
  currentMonth,
  weekCutoffDate,
  ytdCutoffDate,
}: AllocationTypeKPIRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-3 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const weekCutoff = formatCutoff(weekCutoffDate);
  const ytdCutoff  = formatCutoff(ytdCutoffDate);
  const monthName  = monthLabel(currentMonth, selectedYear);
  const monthCap   = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const weekTooltip = `Considera lançamentos até ${weekCutoff} — última semana fechada. Colaboradores registram horas na sexta-feira para a semana em curso.`;
  const ytdTooltip  = `Acumulado do ano até ${ytdCutoff} — última sexta-feira antes da semana atual. Colaboradores registram horas na sexta-feira para a semana em curso.`;

  const projActualAnnual   = pct(data?.project_actual_annual    ?? 0, capacityAnnual);
  const projPlannedAnnual  = pct(data?.project_planned_annual   ?? 0, capacityAnnual);
  const actActualAnnual    = pct(data?.activity_actual_annual   ?? 0, capacityAnnual);
  const actPlannedAnnual   = pct(data?.activity_planned_annual  ?? 0, capacityAnnual);

  const projActualYtd      = pct(data?.project_actual_ytd       ?? 0, capacityYtd);
  const projPlannedYtd     = pct(data?.project_planned_ytd      ?? 0, capacityYtd);
  const actActualYtd       = pct(data?.activity_actual_ytd      ?? 0, capacityYtd);
  const actPlannedYtd      = pct(data?.activity_planned_ytd     ?? 0, capacityYtd);

  const projActualMonth    = pct(data?.project_actual_month     ?? 0, capacityMonth);
  const projPlannedMonth   = pct(data?.project_planned_month    ?? 0, capacityMonth);
  const actActualMonth     = pct(data?.activity_actual_month    ?? 0, capacityMonth);
  const actPlannedMonth    = pct(data?.activity_planned_month   ?? 0, capacityMonth);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <KPICard
        icon={Briefcase}
        label="% Projetos"
        sublabel={`Ano ${selectedYear}`}
        actualPct={projActualAnnual}
        plannedPct={projPlannedAnnual}
      />
      <KPICard
        icon={Activity}
        label="% Atividades Internas"
        sublabel={`Ano ${selectedYear}`}
        actualPct={actActualAnnual}
        plannedPct={actPlannedAnnual}
      />
      <KPICard
        icon={Briefcase}
        label="% Projetos"
        sublabel={`Ano até ${ytdCutoff}`}
        actualPct={projActualYtd}
        plannedPct={projPlannedYtd}
        tooltipText={ytdTooltip}
      />
      <KPICard
        icon={Activity}
        label="% Atividades Internas"
        sublabel={`Ano até ${ytdCutoff}`}
        actualPct={actActualYtd}
        plannedPct={actPlannedYtd}
        tooltipText={ytdTooltip}
      />
      <KPICard
        icon={Briefcase}
        label="% Projetos"
        sublabel={`${monthCap} (até ${weekCutoff})`}
        actualPct={projActualMonth}
        plannedPct={projPlannedMonth}
        tooltipText={weekTooltip}
      />
      <KPICard
        icon={Activity}
        label="% Atividades Internas"
        sublabel={`${monthCap} (até ${weekCutoff})`}
        actualPct={actActualMonth}
        plannedPct={actPlannedMonth}
        tooltipText={weekTooltip}
      />
    </div>
  );
}
