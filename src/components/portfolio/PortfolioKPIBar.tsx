import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { PortfolioProject } from '@/hooks/usePortfolioProjects';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface PortfolioKPIBarProps {
  projects: PortfolioProject[];
  hideValues?: boolean;
  isLoading?: boolean;
}

const CELL_BASE =
  'flex min-h-[104px] flex-col items-start justify-between border-b p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(n+3)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0';

export function PortfolioKPIBar({ projects, hideValues, isLoading }: PortfolioKPIBarProps) {
  const planningProjects = projects.filter(p => p.portfolio_stage === 'planning');
  const stalePlanningCount = planningProjects.filter(p => {
    if (!p.start_date) return false;
    return differenceInDays(new Date(), parseISO(p.start_date)) > 30;
  }).length;

  const portfolioValue = projects.reduce((sum, p) => {
    // Valor do contrato, coerente com o cartão e o detalhe do projeto.
    return sum + (p.total_value || 0);
  }, 0);

  const totalReceived = projects.reduce((sum, p) => {
    const installments = p.installments || [];
    return sum + installments
      .filter(i => i.status === 'received')
      .reduce((s, i) => s + Number(i.value), 0);
  }, 0);

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-lg border bg-card sm:grid-cols-2 lg:grid-cols-4">
      <div className={cn(CELL_BASE)}>
        <div className="flex w-full items-center justify-between gap-3">
          <span className="ol-label text-muted-foreground">Em Planejamento</span>
          <span className="h-2 w-2 rounded-full bg-warning" />
        </div>
        {isLoading ? (
          <div className="w-full space-y-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-end gap-2">
              <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">
                {planningProjects.length}
              </p>
              {stalePlanningCount > 0 && (
                <Badge
                  variant="outline"
                  className="mb-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 text-[10px] px-1.5 py-0"
                >
                  {stalePlanningCount} &gt; 30 dias
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">aguardando início</p>
          </div>
        )}
      </div>

      <div className={cn(CELL_BASE)}>
        <div className="flex w-full items-center justify-between gap-3">
          <span className="ol-label text-muted-foreground">Total de Projetos</span>
          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
        </div>
        {isLoading ? (
          <div className="w-full space-y-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">
              {projects.length}
            </p>
            <p className="text-xs text-muted-foreground">no portfólio</p>
          </div>
        )}
      </div>

      <div className={cn(CELL_BASE)}>
        <div className="flex w-full items-center justify-between gap-3">
          <span className="ol-label text-muted-foreground">Valor do Portfólio</span>
          <span className="h-2 w-2 rounded-full bg-primary" />
        </div>
        {isLoading ? (
          <div className="w-full space-y-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">
              {hideValues ? '•••••' : formatCurrency(portfolioValue)}
            </p>
            <p className="text-xs text-muted-foreground">valor total contratado</p>
          </div>
        )}
      </div>

      <div className={cn(CELL_BASE)}>
        <div className="flex w-full items-center justify-between gap-3">
          <span className="ol-label text-muted-foreground">Recebidos</span>
          <span className="h-2 w-2 rounded-full bg-success" />
        </div>
        {isLoading ? (
          <div className="w-full space-y-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">
              {hideValues ? '•••••' : formatCurrency(totalReceived)}
            </p>
            <p className="text-xs text-muted-foreground">até o momento</p>
          </div>
        )}
      </div>
    </div>
  );
}
