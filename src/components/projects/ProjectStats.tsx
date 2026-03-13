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

  // IDs de projetos contínuos (exceto financiamento_inovacao)
  const continuousProjectIds = new Set(
    projects
      .filter((p) => p.is_continuous && p.service_line !== 'financiamento_inovacao')
      .map((p) => p.id)
  );

  // Receita de projetos NÃO contínuos = soma das parcelas do ano
  const fixedProjectRevenue = installments
    .filter((i) => new Date(i.due_date).getFullYear() === currentYear && !continuousProjectIds.has(i.project_id))
    .reduce((acc, i) => acc + Number(i.value || 0), 0);

  // Receita de projetos contínuos: projeção vs parcelas reais (o maior)
  const continuousRevenue = projects
    .filter((p) => continuousProjectIds.has(p.id) && (p.status === 'planning' || p.status === 'active'))
    .reduce((acc, p) => {
      const startDate = new Date(p.start_date);
      const startMonth = startDate.getFullYear() < currentYear ? 1 : startDate.getMonth() + 1;
      const endMonth = p.renewal_date
        ? (new Date(p.renewal_date).getFullYear() === currentYear
          ? new Date(p.renewal_date).getMonth() + 1
          : (new Date(p.renewal_date).getFullYear() > currentYear ? 12 : 0))
        : 12;
      const monthsActive = Math.max(0, endMonth - startMonth + 1);
      const projected = Number(p.total_value || 0) * monthsActive;

      const actualFromInstallments = (p.installments || [])
        .filter((i) => new Date(i.due_date).getFullYear() === currentYear)
        .reduce((sum, i) => sum + Number(i.value || 0), 0);

      return acc + Math.max(projected, actualFromInstallments);
    }, 0);

  const totalYearRevenue = fixedProjectRevenue + continuousRevenue;

  // Recebido no ano = parcelas pagas com payment_date no ano corrente
  const receivedValue = installments
    .filter((i) => i.status === 'received' && i.payment_date && new Date(i.payment_date).getFullYear() === currentYear)
    .reduce((acc, i) => acc + Number(i.value || 0), 0);

  // Atrasado = parcelas com due_date no ano corrente e status overdue
  const overdueValue = installments
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
