import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle, AlertTriangle, MinusCircle } from 'lucide-react';
import { StatusDualCounts, StatusLabel } from './AllocationOverview';

interface AllocationKPIBarProps {
  counts: StatusDualCounts;
  total: number;
}

const kpis = [
  {
    key: 'total' as const,
    label: 'Total de pessoas',
    icon: Users,
    getValue: (_c: StatusDualCounts, total: number) => total,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    key: 'adequate' as const,
    label: 'Adequados',
    icon: CheckCircle,
    getValue: (c: StatusDualCounts) => c.planned.Adequado,
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    key: 'over' as const,
    label: 'Sobrealocados',
    icon: AlertTriangle,
    getValue: (c: StatusDualCounts) => c.planned.Sobrealocado,
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
  },
  {
    key: 'under' as const,
    label: 'Subalocados / Ociosos',
    icon: MinusCircle,
    getValue: (c: StatusDualCounts) => c.planned.Subalocado + c.planned.Ocioso,
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
] as const;

export function AllocationKPIBar({ counts, total }: AllocationKPIBarProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((kpi) => {
        const value = kpi.getValue(counts, total);
        return (
          <Card key={kpi.key}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`${kpi.bg} rounded-lg p-2 shrink-0`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
