import { FileText, DollarSign, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Props {
  faturado: number;
  revenueActual: number;
  revenueProjected: number;
  nfCount: number;
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

export function RevenueKPIs({ faturado, revenueActual, revenueProjected, nfCount }: Props) {
  const gap = faturado - revenueActual;
  const gapPct = faturado > 0 ? (gap / faturado) * 100 : 0;
  const receivedPct = faturado > 0 ? (revenueActual / faturado) * 100 : 0;
  const projRealizadoPct = revenueProjected > 0 ? (revenueActual / revenueProjected) * 100 : 0;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* Faturamento emitido */}
      <Card className="relative overflow-hidden">
        <StatusAccent status="good" />
        <CardContent className="pt-5 pb-4 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Faturamento Emitido
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight">{formatCurrency(faturado)}</span>
            <SmallBadge variant="info">{nfCount} notas</SmallBadge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">NFs emitidas no período</p>
        </CardContent>
      </Card>

      {/* Receita recebida */}
      <Card className="relative overflow-hidden">
        <StatusAccent status="info" />
        <CardContent className="pt-5 pb-4 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Receita Recebida
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight">{formatCurrency(revenueActual)}</span>
            <SmallBadge variant="good">{formatPercent(receivedPct)} do faturado</SmallBadge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Realizado até agora</p>
        </CardContent>
      </Card>

      {/* Gap a receber */}
      <Card className="relative overflow-hidden">
        <StatusAccent status={gapPct > 30 ? 'warning' : 'info'} />
        <CardContent className="pt-5 pb-4 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Gap a Receber
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight">{formatCurrency(gap)}</span>
            <SmallBadge variant="warning">{formatPercent(gapPct)} em aberto</SmallBadge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Emitido e ainda não recebido</p>
        </CardContent>
      </Card>

      {/* Receita projetada */}
      <Card className="relative overflow-hidden">
        <StatusAccent status={projRealizadoPct >= 80 ? 'good' : 'warning'} />
        <CardContent className="pt-5 pb-4 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Receita Projetada
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight">{formatCurrency(revenueProjected)}</span>
            <SmallBadge variant={projRealizadoPct >= 80 ? 'good' : 'warning'}>
              {formatPercent(projRealizadoPct)} realizado
            </SmallBadge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Projeção do período</p>
        </CardContent>
      </Card>
    </div>
  );
}
