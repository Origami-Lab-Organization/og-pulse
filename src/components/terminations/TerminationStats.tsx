import { Card, CardContent } from '@/components/ui/card';
import { UserMinus, CalendarDays, DollarSign, Clock } from 'lucide-react';
import { TerminationWithEmployee } from '@/services/terminationService';
import { formatCurrency } from '@/lib/formatters';

interface TerminationStatsProps {
  terminations: TerminationWithEmployee[];
}

const TerminationStats = ({ terminations }: TerminationStatsProps) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonth = terminations.filter((t) => {
    const d = new Date(t.termination_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const thisYear = terminations.filter((t) => {
    const d = new Date(t.termination_date);
    return d.getFullYear() === currentYear;
  });

  const pending = terminations.filter((t) => t.status === 'pending' || t.status === 'in_progress');

  // Sum payroll adjustments from severance_package if available
  const monthlyCost = thisMonth.reduce((sum, t) => {
    const pkg = t.severance_package as Record<string, unknown> | null;
    return sum + (pkg && typeof pkg === 'object' && 'total' in pkg ? Number(pkg.total) || 0 : 0);
  }, 0);

  const stats = [
    {
      label: 'Desligamentos (Mês)',
      value: thisMonth.length,
      icon: UserMinus,
      color: 'bg-destructive/10 text-destructive',
    },
    {
      label: 'Desligamentos (Ano)',
      value: thisYear.length,
      icon: CalendarDays,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Custo Rescisões (Mês)',
      value: formatCurrency(monthlyCost),
      icon: DollarSign,
      color: 'bg-accent/20 text-foreground',
    },
    {
      label: 'Pendentes de Finalização',
      value: pending.length,
      icon: Clock,
      color: 'bg-warning/10 text-warning',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="animate-scale-in">
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`rounded-lg p-3 ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-semibold text-foreground">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TerminationStats;
