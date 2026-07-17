import { Banknote, Landmark, Gift, Wrench, PiggyBank } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import type { PayrollMonthPoint } from '@/lib/payrollHistory';

interface PayrollStatsCardsProps {
  point: PayrollMonthPoint | undefined;
  isLoading?: boolean;
}

interface StatItem {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export function PayrollStatsCards({ point, isLoading }: PayrollStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-lg" />
        ))}
      </div>
    );
  }

  const stats: StatItem[] = [
    { label: 'Salário Bruto', value: point?.baseAmount ?? 0, icon: Banknote, color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Encargos', value: point?.chargesAmount ?? 0, icon: Landmark, color: 'bg-red-500/10 text-red-600' },
    { label: 'Benefícios', value: point?.benefitsAmount ?? 0, icon: Gift, color: 'bg-green-500/10 text-green-600' },
    { label: 'Ferramentas', value: point?.toolsAmount ?? 0, icon: Wrench, color: 'bg-orange-500/10 text-orange-600' },
    { label: 'Provisões', value: point?.provisionsAmount ?? 0, icon: PiggyBank, color: 'bg-purple-500/10 text-purple-600' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.label} className="animate-scale-in">
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`rounded-lg p-3 ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-semibold text-foreground">{formatCurrency(stat.value)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
