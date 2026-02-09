import { FolderKanban, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations, ProjectInstallmentDB } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';

interface ProjectStatsProps {
  projects: ProjectWithRelations[];
  installments?: ProjectInstallmentDB[];
}

export function ProjectStats({ projects, installments = [] }: ProjectStatsProps) {
  const currentYear = new Date().getFullYear();
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const totalValue = projects.reduce((acc, p) => {
    const value = Number(p.total_value || 0);
    if (p.is_continuous) {
      return acc + (value * 12);
    }
    return acc + value;
  }, 0);

  const currentYearInstallments = installments.filter(
    (i) => new Date(i.due_date).getFullYear() === currentYear
  );
  const overdueInstallments = currentYearInstallments.filter(
    (i) => i.status === 'overdue'
  ).length;
  const receivedValue = currentYearInstallments
    .filter((i) => i.status === 'received')
    .reduce((acc, i) => acc + Number(i.value || 0), 0);

  const stats = [
    {
      title: 'Total de Projetos',
      value: totalProjects,
      icon: FolderKanban,
      description: 'Projetos cadastrados',
    },
    {
      title: 'Projetos Ativos',
      value: activeProjects,
      icon: Clock,
      description: 'Em andamento',
    },
    {
      title: 'Valor Contratado',
      value: formatCurrency(totalValue),
      icon: DollarSign,
      description: `Projeção ${currentYear}`,
    },
    {
      title: 'Parcelas Atrasadas',
      value: overdueInstallments,
      icon: AlertTriangle,
      description: `Recebido: ${formatCurrency(receivedValue)}`,
      variant: overdueInstallments > 0 ? 'destructive' : 'default',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon
              className={`h-4 w-4 ${
                stat.variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground'
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                stat.variant === 'destructive' ? 'text-destructive' : ''
              }`}
            >
              {stat.value}
            </div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
