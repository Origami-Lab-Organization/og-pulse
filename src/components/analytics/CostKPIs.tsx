import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Props {
  totalCosts: number;
  plannedCosts: number;
  laborCost: number;
  supplierCost: number;
  materialCost: number;
  commissionCost: number;
}

function StatusAccent({ status }: { status: 'good' | 'warning' | 'danger' | 'info' }) {
  const colors = {
    good: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
  };
  return <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-lg', colors[status])} />;
}

function SmallBadge({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'good' | 'warning' | 'info' }) {
  const cls = {
    good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  };
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium', cls[variant])}>
      {children}
    </span>
  );
}

export function CostKPIs({ totalCosts, plannedCosts, laborCost, supplierCost, materialCost, commissionCost }: Props) {
  const adherence = plannedCosts > 0 ? (totalCosts / plannedCosts) * 100 : 0;
  const laborPct = totalCosts > 0 ? (laborCost / totalCosts) * 100 : 0;
  const supplierPct = totalCosts > 0 ? (supplierCost / totalCosts) * 100 : 0;
  const variableCost = materialCost + commissionCost;
  const variablePct = totalCosts > 0 ? (variableCost / totalCosts) * 100 : 0;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="relative overflow-hidden">
        <StatusAccent status={adherence <= 100 ? 'good' : 'danger'} />
        <CardContent className="pt-5 pb-4 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Custo Total Realizado
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight">{formatCurrency(totalCosts)}</span>
            <SmallBadge variant={adherence <= 100 ? 'good' : 'warning'}>{formatPercent(adherence)} do previsto</SmallBadge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Custos realizados no período</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <StatusAccent status="info" />
        <CardContent className="pt-5 pb-4 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Mão de Obra
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight">{formatCurrency(laborCost)}</span>
            <SmallBadge variant="info">{formatPercent(laborPct)} do total</SmallBadge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Principal componente</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <StatusAccent status="warning" />
        <CardContent className="pt-5 pb-4 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Custos de Terceiros
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight">{formatCurrency(supplierCost)}</span>
            <SmallBadge variant="warning">{formatPercent(supplierPct)} do total</SmallBadge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Fornecedores externos</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <StatusAccent status={variablePct > 15 ? 'warning' : 'good'} />
        <CardContent className="pt-5 pb-4 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Custos Variáveis
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight">{formatCurrency(variableCost)}</span>
            <SmallBadge variant={variablePct > 15 ? 'warning' : 'info'}>{formatPercent(variablePct)} do total</SmallBadge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Materiais e comissões</p>
        </CardContent>
      </Card>
    </div>
  );
}
