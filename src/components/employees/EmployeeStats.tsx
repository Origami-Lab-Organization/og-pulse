import { Employee } from '@/hooks/useEmployees';
import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, Crown, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface EmployeeStatsProps {
  employees: Employee[];
}

interface StatItem {
  label: string;
  value: string | number;
  subValue?: string;
  subValue2?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const EmployeeStats = ({ employees }: EmployeeStatsProps) => {
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === 'ativo').length;
  const managers = employees.filter((e) => e.isGerente).length;
  
  // Calculate total monthly cost considering contract types
  const totalMonthlyCost = employees
    .filter((e) => e.status === 'ativo')
    .reduce((sum, e) => {
      // Use saved cost if available
      if (e.totalMonthlyCostEstimated > 0) {
        return sum + e.totalMonthlyCostEstimated;
      }
      
      // Fallback: calculate based on contract type
      let baseCost = 0;
      switch (e.tipoContratacao) {
        case 'CLT':
        case 'MENOR_APRENDIZ':
          baseCost = e.salarioMensal;
          break;
        case 'ESTAGIO':
          baseCost = e.bolsaAuxilio || e.salarioMensal;
          break;
        case 'PJ':
          baseCost = e.valorContratoPj || e.salarioMensal;
          break;
        case 'SOCIO':
          baseCost = (e.proLabore || 0) + (e.dividendos || 0) || e.salarioMensal;
          break;
        default:
          baseCost = e.salarioMensal;
      }
      
      return sum + baseCost + e.encargos + (e.totalBenefitsCost || 0) + (e.totalToolsCost || 0);
    }, 0);
  
  const totalAnnualCost = totalMonthlyCost * 12;

  // Calculate total monthly provisions
  const totalMonthlyProvision = employees
    .filter((e) => e.status === 'ativo')
    .reduce((sum, e) => {
      // Use breakdown if available
      const breakdown = e.breakdownJson;
      if (breakdown && typeof breakdown === 'object' && 'provisionsAmount' in breakdown) {
        return sum + (breakdown.provisionsAmount as number);
      }
      // Fallback: use individual fields
      return sum + (e.provisao13 || 0) + (e.provisaoFerias || 0) + (e.provisaoRecesso || 0);
    }, 0);

  const stats: StatItem[] = [
    {
      label: 'Total de Funcionários',
      value: totalEmployees,
      icon: Users,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Ativos',
      value: activeEmployees,
      icon: UserCheck,
      color: 'bg-success/10 text-success',
    },
    {
      label: 'Gerentes',
      value: managers,
      icon: Crown,
      color: 'bg-secondary/10 text-secondary-foreground',
    },
    {
      label: 'Custo Mensal Total',
      value: formatCurrency(totalMonthlyCost),
      subValue: `Anual: ${formatCurrency(totalAnnualCost)}`,
      subValue2: `Provisão Mensal: ${formatCurrency(totalMonthlyProvision)}`,
      icon: DollarSign,
      color: 'bg-accent/20 text-foreground',
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
              {stat.subValue && (
                <p className="text-xs text-muted-foreground">{stat.subValue}</p>
              )}
              {stat.subValue2 && (
                <p className="text-xs text-muted-foreground">{stat.subValue2}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default EmployeeStats;
