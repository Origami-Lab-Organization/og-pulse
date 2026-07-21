import { MetricCard } from '@/components/ui/metric-card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import type { PayrollMonthPoint } from '@/lib/payrollHistory';

interface PayrollStatsCardsProps {
  point: PayrollMonthPoint | undefined;
  isLoading?: boolean;
}

export function PayrollStatsCards({ point, isLoading }: PayrollStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-xl" />
        ))}
      </div>
    );
  }

  const stats = [
    { label: 'Salário Bruto', value: point?.baseAmount ?? 0 },
    { label: 'Encargos', value: point?.chargesAmount ?? 0 },
    { label: 'Benefícios', value: point?.benefitsAmount ?? 0 },
    { label: 'Ferramentas', value: point?.toolsAmount ?? 0 },
    { label: 'Provisões', value: point?.provisionsAmount ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <MetricCard key={stat.label} label={stat.label} value={formatCurrency(stat.value)} />
      ))}
    </div>
  );
}
