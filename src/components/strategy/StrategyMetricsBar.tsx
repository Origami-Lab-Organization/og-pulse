import { Target, Flag, CheckSquare, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StrategyObjectiveWithKrs, StrategyInitiative, getKrStatus } from '@/types/strategy';

interface StrategyMetricsBarProps {
  objectives: StrategyObjectiveWithKrs[];
  initiatives: StrategyInitiative[];
}

export function StrategyMetricsBar({ objectives, initiatives }: StrategyMetricsBarProps) {
  // Cycle health — average of avgConfidence converted to 0–100 scale (confidence is 0–10)
  const cycleHealth =
    objectives.length > 0
      ? Math.round(
          (objectives.reduce((sum, o) => sum + o.avgConfidence, 0) / objectives.length) * 10,
        )
      : 0;

  const healthColor =
    cycleHealth >= 70
      ? 'text-emerald-600 dark:text-emerald-400'
      : cycleHealth >= 40
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  const healthAccent =
    cycleHealth >= 70 ? 'bg-emerald-500' : cycleHealth >= 40 ? 'bg-amber-500' : 'bg-red-500';

  // Objectives on-track = green status (avgConfidence >= 7)
  const onTrackObjectives = objectives.filter((o) => getKrStatus(o.avgConfidence) === 'green').length;

  // KRs
  const allKrs = objectives.flatMap((o) => o.keyResults);
  const krByStatus = {
    green: allKrs.filter((kr) => getKrStatus(kr.confidence) === 'green').length,
    amber: allKrs.filter((kr) => getKrStatus(kr.confidence) === 'amber').length,
    red: allKrs.filter((kr) => getKrStatus(kr.confidence) === 'red').length,
  };

  // Initiatives in progress
  const inProgressInitiatives = initiatives.filter((i) => i.status === 'in_progress').length;

  const cards = [
    {
      label: 'Saúde do Ciclo',
      icon: Zap,
      value: `${cycleHealth}%`,
      valueColor: healthColor,
      subtitle: cycleHealth >= 70 ? 'No caminho certo' : cycleHealth >= 40 ? 'Atenção necessária' : 'Em risco',
      accentColor: healthAccent,
    },
    {
      label: 'Objetivos',
      icon: Target,
      value: String(objectives.length),
      valueColor: 'text-foreground',
      subtitle: `${onTrackObjectives} no caminho certo`,
      accentColor: 'bg-blue-500',
    },
    {
      label: 'Key Results',
      icon: Flag,
      value: String(allKrs.length),
      valueColor: 'text-foreground',
      subtitle: null,
      accentColor: 'bg-violet-500',
      krCounts: krByStatus,
    },
    {
      label: 'Iniciativas',
      icon: CheckSquare,
      value: String(initiatives.length),
      valueColor: 'text-foreground',
      subtitle: `${inProgressInitiatives} em andamento`,
      accentColor: 'bg-orange-500',
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="relative overflow-hidden">
            <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-lg', c.accentColor)} />
            <CardContent className="pt-5 pb-4 pl-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {c.label}
                </span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className={cn('text-2xl font-bold', c.valueColor)}>{c.value}</div>
              {c.subtitle && <p className="text-xs text-muted-foreground mt-1">{c.subtitle}</p>}
              {c.krCounts && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    {c.krCounts.green}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    {c.krCounts.amber}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    {c.krCounts.red}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
