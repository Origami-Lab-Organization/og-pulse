import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { PortfolioProject } from '@/hooks/usePortfolioProjects';
import { differenceInDays, parseISO } from 'date-fns';

interface PortfolioKPIBarProps {
  projects: PortfolioProject[];
}

export function PortfolioKPIBar({ projects }: PortfolioKPIBarProps) {
  const planningProjects = projects.filter(p => p.portfolio_stage === 'planning');
  const stalePlanningCount = planningProjects.filter(p => {
    if (!p.start_date) return false;
    return differenceInDays(new Date(), parseISO(p.start_date)) > 30;
  }).length;

  const totalProjects = projects.length;

  const portfolioValue = projects.reduce((sum, p) => {
    const installments = p.installments || [];
    const installmentsSum = installments.reduce((s, i) => s + Number(i.value), 0);
    return sum + (installmentsSum > 0 ? installmentsSum : (p.total_value || 0));
  }, 0);

  const totalReceived = projects.reduce((sum, p) => {
    const installments = p.installments || [];
    return sum + installments
      .filter(i => i.status === 'received')
      .reduce((s, i) => s + Number(i.value), 0);
  }, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {/* Em Planejamento */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="bg-primary/10 rounded-lg p-2 shrink-0">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">{planningProjects.length}</p>
              {stalePlanningCount > 0 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] px-1.5 py-0">
                  {stalePlanningCount} &gt; 30 dias
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Em Planejamento</p>
          </div>
        </CardContent>
      </Card>

      {/* Total de Projetos */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="bg-primary/10 rounded-lg p-2 shrink-0">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalProjects}</p>
            <p className="text-xs text-muted-foreground">Total de Projetos</p>
          </div>
        </CardContent>
      </Card>

      {/* Valor do Portfólio */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="bg-primary/10 rounded-lg p-2 shrink-0">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(portfolioValue)}</p>
            <p className="text-xs text-muted-foreground">Valor do Portfólio</p>
          </div>
        </CardContent>
      </Card>

      {/* Recebidos até o momento */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="bg-primary/10 rounded-lg p-2 shrink-0">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalReceived)}</p>
            <p className="text-xs text-muted-foreground">Recebidos até o momento</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
