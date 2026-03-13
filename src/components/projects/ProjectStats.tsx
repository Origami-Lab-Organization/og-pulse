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
  const activeProjects = projects.filter(
    (p) => p.status === 'planning' || p.status === 'active'
  ).length;

  // Somar todas as parcelas do ano corrente, independente do status
  const totalYearRevenue = projects.reduce((acc, p) => {
    const yearInstallments = (p.installments || [])
      .filter((i) => new Date(i.due_date).getFullYear() === currentYear);
    return acc + yearInstallments.reduce((sum, i) => sum + Number(i.value || 0), 0);
  }, 0);

  // Recebido e atrasado: usar flatMap das parcelas dos projetos
  const allInstallments = projects.flatMap((p) => p.installments || []);

  const receivedValue = allInstallments
    .filter((i) => i.status === 'received' && i.payment_date && new Date(i.payment_date).getFullYear() === currentYear)
    .reduce((acc, i) => acc + Number(i.value || 0), 0);

  const overdueValue = allInstallments
    .filter((i) => new Date(i.due_date).getFullYear() === currentYear && i.status === 'overdue')
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
      description: 'Em planejamento ou execução',
    },
    {
      title: 'Receita no Ano',
      value: formatCurrency(totalYearRevenue),
      icon: DollarSign,
      description: `Projeção ${currentYear}`,
    },
    {
      title: 'Recebido no Ano',
      value: formatCurrency(receivedValue),
      icon: AlertTriangle,
      description: overdueValue > 0 ? `${formatCurrency(overdueValue)} em atraso` : 'Nenhum atraso',
      variant: overdueValue > 0 ? 'destructive' : 'default',
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
