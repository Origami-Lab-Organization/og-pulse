import { Employee } from '@/hooks/useEmployees';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Banknote, Gift, Wrench, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

const getBaseSalary = (e: Employee): number => {
  switch (e.tipoContratacao) {
    case 'CLT':
    case 'MENOR_APRENDIZ':
      return e.salarioMensal;
    case 'ESTAGIO':
      return e.bolsaAuxilio || e.salarioMensal;
    case 'PJ':
      return e.valorContratoPj || e.salarioMensal;
    case 'SOCIO':
      return (e.proLabore || 0) + (e.dividendos || 0) || e.salarioMensal;
    default:
      return e.salarioMensal;
  }
};

const getProvisoes = (e: Employee): number => {
  if (e.breakdownJson) return e.breakdownJson.provisionsAmount;
  return (e.provisao13 || 0) + (e.provisaoFerias || 0) + (e.provisaoRecesso || 0);
};

interface EmployeeStatsProps {
  employees: Employee[];
  hideValues?: boolean;
}

interface StatItem {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const EmployeeStats = ({ employees, hideValues }: EmployeeStatsProps) => {
  const activeList = employees.filter(
    (e) => e.status !== 'arquivado' && e.status !== 'bloqueado',
  );

  const totalMonthlyCost = activeList.reduce((sum, e) => {
    if (e.totalMonthlyCostEstimated > 0) return sum + e.totalMonthlyCostEstimated;
    return sum + getBaseSalary(e) + e.encargos + (e.totalBenefitsCost || 0) + (e.totalToolsCost || 0);
  }, 0);

  const totalSalario = activeList.reduce((sum, e) => sum + getBaseSalary(e), 0);
  const totalBeneficios = activeList.reduce((sum, e) => sum + (e.totalBenefitsCost || 0), 0);
  const totalFerramentas = activeList.reduce((sum, e) => sum + (e.totalToolsCost || 0), 0);
  const totalProvisoes = activeList.reduce((sum, e) => sum + getProvisoes(e), 0);

  const fmt = (v: number) => (hideValues ? '•••••' : formatCurrency(v));

  const stats: StatItem[] = [
    {
      label: 'Total da Folha',
      value: fmt(totalMonthlyCost),
      icon: Wallet,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Salário',
      value: fmt(totalSalario),
      icon: Banknote,
      color: 'bg-blue-500/10 text-blue-600',
    },
    {
      label: 'Benefícios',
      value: fmt(totalBeneficios),
      icon: Gift,
      color: 'bg-green-500/10 text-green-600',
    },
    {
      label: 'Ferramentas',
      value: fmt(totalFerramentas),
      icon: Wrench,
      color: 'bg-orange-500/10 text-orange-600',
    },
    {
      label: 'Provisões',
      value: fmt(totalProvisoes),
      icon: PiggyBank,
      color: 'bg-purple-500/10 text-purple-600',
    },
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
              <p className="text-xl font-semibold text-foreground">{stat.value}</p>
              {stat.subValue && (
                <p className="text-xs text-muted-foreground">{stat.subValue}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default EmployeeStats;
