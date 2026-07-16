import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';
import { useMaskedCurrency, useMaskedPercent, useHideValues } from '@/contexts/HideValuesContext';

interface FinancialKpiCardsProps {
  revenueActual: number;
  revenuePlanned: number;
  revenueExecuted: number;
  costActual: number;
  costPlanned: number;
  costExecuted: number;
  marginActual: number;
  marginPlanned: number;
  marginTarget: number;
  forecastMargin: number;
  forecastCost: number;
  onNavigateToExpenses?: () => void;
}

const cardBase =
  'rounded-xl border bg-card px-[18px] py-3.5 flex flex-col justify-between';
const eyebrow = 'ui-label truncate';
const bigNumber =
  'font-mono text-[1.625rem] font-semibold leading-none tabular-nums mt-1 truncate';
const subline = 'font-mono text-[11.5px] text-muted-foreground mt-0.5 truncate';

export function FinancialKpiCards({
  revenueActual,
  revenuePlanned,
  revenueExecuted,
  costActual,
  costPlanned,
  costExecuted,
  marginActual,
  marginPlanned,
  marginTarget,
  forecastMargin,
  forecastCost,
  onNavigateToExpenses,
}: FinancialKpiCardsProps) {
  const formatCurrency = useMaskedCurrency();
  const formatPercent = useMaskedPercent();
  const hideValues = useHideValues();

  const marginAboveTarget = marginActual >= marginTarget;
  const forecastAboveTarget = forecastMargin >= marginTarget;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.25fr]">
      {/* Receita recebida */}
      <div className={cardBase}>
        <p className={cn(eyebrow, 'text-muted-foreground')}>Receita recebida</p>
        <p className={bigNumber}>{formatCurrency(revenueActual)}</p>
        <p className={subline}>
          de {formatCurrency(revenuePlanned)} · {formatPercent(revenueExecuted)} do contrato
        </p>
      </div>

      {/* Custo incorrido */}
      <div className={cardBase}>
        <p className={cn(eyebrow, 'text-muted-foreground')}>Custo incorrido</p>
        <p className={bigNumber}>{formatCurrency(costActual)}</p>
        <p className={cn(subline, 'flex items-center gap-1.5')}>
          <span className="truncate">
            plan {formatCurrency(costPlanned)} · {formatPercent(costExecuted)} exec.
          </span>
          {onNavigateToExpenses && (
            <button
              type="button"
              onClick={onNavigateToExpenses}
              data-focus-ring
              className="inline-flex items-center gap-0.5 whitespace-nowrap font-sans font-medium text-primary-deep hover:underline"
            >
              ver Despesas
              <ArrowUpRight className="h-3 w-3" />
            </button>
          )}
        </p>
      </div>

      {/* Margem realizada */}
      <div className={cardBase}>
        <p className={cn(eyebrow, 'text-muted-foreground')}>Margem realizada</p>
        <p
          className={cn(
            bigNumber,
            marginAboveTarget ? 'text-primary-deep' : 'text-foreground',
          )}
        >
          {formatPercent(marginActual)}
        </p>
        <p className={subline}>
          plan {formatPercent(marginPlanned)} · meta {hideValues ? '•••' : `${marginTarget.toFixed(0)}%`}
        </p>
      </div>

      {/* Forecast — superfície de ênfase (petróleo) */}
      <div
        className={cn(
          cardBase,
          'border-transparent bg-[hsl(var(--brand-slate))] text-white',
        )}
      >
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
          Forecast · fim do projeto
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="font-mono text-[1.625rem] font-semibold leading-none tabular-nums text-[hsl(var(--green-300))]">
            {formatPercent(forecastMargin)}
          </span>
          <span className="min-w-0 truncate text-[11.5px] text-white/85">
            margem projetada · EAC custo{' '}
            <b className="font-mono text-white">{formatCurrency(forecastCost)}</b>
          </span>
        </div>
        <p className="mt-0.5 truncate font-mono text-[11.5px] text-white/70">
          burn-rate atual + plan restante ·{' '}
          {forecastAboveTarget ? 'acima da meta ✓' : 'abaixo da meta'}
        </p>
      </div>
    </div>
  );
}
