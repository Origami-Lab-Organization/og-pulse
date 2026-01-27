import { Employee } from '@/hooks/useEmployees';
import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, Crown, DollarSign } from 'lucide-react';

interface EmployeeStatsProps {
  employees: Employee[];
}

const EmployeeStats = ({ employees }: EmployeeStatsProps) => {
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === 'ativo').length;
  const managers = employees.filter((e) => e.isGerente).length;
  const totalCost = employees
    .filter((e) => e.status === 'ativo')
    .reduce((sum, e) => sum + e.salarioMensal + e.beneficios + e.encargos, 0);

  const stats = [
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
      color: 'bg-secondary/10 text-secondary',
    },
    {
      label: 'Custo Mensal Total',
      value: `R$ ${totalCost.toLocaleString('pt-BR')}`,
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default EmployeeStats;
