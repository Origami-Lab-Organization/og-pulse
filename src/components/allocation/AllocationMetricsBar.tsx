import { AlertTriangle, BatteryMedium, Clock3, Users, UserX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AllocationMetrics, AllocationStatusFilter } from '@/types/allocation';

interface AllocationMetricsBarProps {
  metrics: AllocationMetrics;
  referenceLabel: string;
  isLoading: boolean;
  onStatusSelect: (status: AllocationStatusFilter) => void;
}

const metricItems = [
  {
    key: 'plannedHours',
    title: 'Planejado total',
    icon: Clock3,
    dot: 'bg-muted-foreground',
    status: null,
    format: (value: number | null) => (value === null ? '—' : `${value}h`),
  },
  {
    key: 'loggedHours',
    title: 'Lançado total',
    icon: BatteryMedium,
    dot: 'bg-success',
    status: null,
    format: (value: number | null) => (value === null ? '—' : `${value}h`),
  },
  {
    key: 'varianceHours',
    title: 'Desvio total',
    icon: AlertTriangle,
    dot: 'bg-warning',
    status: null,
    format: (value: number | null) => {
      if (value === null) return '—';
      if (value > 0) return `+${value}h`;
      return `${value}h`;
    },
  },
  {
    key: 'offPlanMembers',
    title: 'Fora do plano',
    icon: Users,
    dot: 'bg-primary',
    status: null,
    format: (value: number | null) => value?.toString() ?? '—',
  },
  {
    key: 'missingLogs',
    title: 'Sem lançamento',
    icon: UserX,
    dot: 'bg-destructive',
    status: 'missingLogs' as const,
    format: (value: number | null) => value?.toString() ?? '—',
  },
] as const;

export function AllocationMetricsBar({ metrics, referenceLabel, isLoading, onStatusSelect }: AllocationMetricsBarProps) {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-lg border bg-card shadow-card sm:grid-cols-2 lg:grid-cols-5">
      {metricItems.map((item) => {
        const Icon = item.icon;
        const value = metrics[item.key];
        const subtitle =
          item.key === 'varianceHours'
            ? 'lançado - planejado'
            : item.key === 'offPlanMembers'
              ? 'com qualquer desvio'
              : referenceLabel.toLocaleLowerCase('pt-BR');

        return (
          <button
            key={item.key}
            type="button"
            disabled={isLoading || !item.status}
            onClick={() => item.status && onStatusSelect(item.status)}
            className={cn(
              'flex min-h-[104px] flex-col items-start justify-between border-b p-5 text-left transition-[background,border-color,box-shadow] duration-200 last:border-b-0 disabled:cursor-default sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0',
              item.status && 'hover:bg-accent/60 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <span className="ol-label text-muted-foreground">{item.title}</span>
              <span className={cn('h-2 w-2 rounded-full', item.dot)} />
            </div>
            {isLoading ? (
              <div className="w-full space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-end gap-2">
                  <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">
                    {item.format(value)}
                  </p>
                  <Icon className="mb-1 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
