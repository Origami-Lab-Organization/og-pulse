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

  // Calcular receita iterando por projeto (evita depender de project_id nas parcelas)
  const totalYearRevenue = projects.reduce((acc, p) => {
    const isContinuous = p.is_continuous && p.service_line !== 'financiamento_inovacao';
    const projectInstallments = (p.installments || [])
      .filter((i) => new Date(i.due_date).getFullYear() === currentYear);
    const installmentsSum = projectInstallments.reduce((sum, i) => sum + Number(i.value || 0), 0);

    if (isContinuous && (p.status === 'planning' || p.status === 'active')) {
      const startDate = new Date(p.start_date);
      const startMonth = startDate.getFullYear() < currentYear ? 1 : startDate.getMonth() + 1;
      const endMonth = p.renewal_date
        ? (new Date(p.renewal_date).getFullYear() === currentYear
          ? new Date(p.renewal_date).getMonth() + 1
          : (new Date(p.renewal_date).getFullYear() > currentYear ? 12 : 0))
        : 12;
      const monthsActive = Math.max(0, endMonth - startMonth + 1);
      const projected = Number(p.total_value || 0) * monthsActive;
      return acc + Math.max(projected, installmentsSum);
    }

    return acc + installmentsSum;
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
