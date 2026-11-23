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
  /** Custo já realizado, parcela do custo final estimado (US-0032). Padrão: o custo final. */
  forecastSpent?: number;
  /** O que ainda falta do plano, parcela do custo final estimado (US-0032). Padrão: 0. */
  forecastRemaining?: number;
  /** A data de fim já passou: o custo final é o realizado. */
  projectEnded?: boolean;
  /** Indica se o projeto tem custo planejado (totalPlanned > 0). Sem custo planejado, o forecast não pode ser projetado. */
  hasCostPlanned?: boolean;
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
  forecastSpent = forecastCost,
  forecastRemaining = 0,
  projectEnded = false,
  hasCostPlanned = true,
  onNavigateToExpenses,
}: FinancialKpiCardsProps) {
  const formatCurrency = useMaskedCurrency();
  const formatPercent = useMaskedPercent();
  const hideValues = useHideValues();

  const marginAboveTarget = marginActual >= marginTarget;
  const forecastAboveTarget = forecastMargin >= marginTarget;
  const plannedBelowTarget = marginPlanned < marginTarget;
  const hasMarginTarget = marginTarget > 0;
  // A cor segue só o forecast × meta (US-0032). Sem custo planejado não há o que julgar.
  const forecastBelowTarget = hasCostPlanned && hasMarginTarget && !forecastAboveTarget;
  // Plano abaixo da meta com forecast acima: card verde, com aviso escrito (decisão de 23/11).
  const showPlanWarning = hasCostPlanned && hasMarginTarget && forecastAboveTarget && plannedBelowTarget;
  const targetText = hideValues ? '•••' : `${marginTarget.toFixed(0)}%`;

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

      {/* Forecast — superfície de ênfase (petróleo ou destaque negativo) */}
      <div
        className={cn(
          cardBase,
          'border-transparent',
          forecastBelowTarget
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-[hsl(var(--brand-slate))] text-white',
        )}
      >
        <p
          className={cn(
            'truncate text-[10px] font-semibold uppercase tracking-[0.12em]',
            forecastBelowTarget ? 'text-destructive-foreground/70' : 'text-white/70',
          )}
        >
          Forecast · fim do projeto
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span
            className={cn(
              'font-mono text-[1.625rem] font-semibold leading-none tabular-nums',
              !hasCostPlanned
                ? 'text-white/70'
                : forecastBelowTarget
                  ? 'text-destructive-foreground'
                  : 'text-[hsl(var(--green-300))]',
            )}
          >
            {hasCostPlanned ? formatPercent(forecastMargin) : '—'}
          </span>
          <span
            className={cn(
              'text-[11.5px]',
              forecastBelowTarget ? 'text-destructive-foreground/85' : 'text-white/85',
            )}
          >
            {hasCostPlanned ? 'margem projetada no fim do projeto' : 'sem custo planejado para projetar'}
          </span>
        </div>
        {hasCostPlanned && (
          <p
            className={cn(
              'mt-1 text-[11.5px] leading-snug',
              forecastBelowTarget ? 'text-destructive-foreground/85' : 'text-white/85',
            )}
          >
            Custo final estimado{' '}
            <b className="font-mono">{formatCurrency(forecastCost)}</b> ={' '}
            <span className="font-mono">{formatCurrency(forecastSpent)}</span> já gasto
            {projectEnded ? (
              ' · projeto encerrado'
            ) : (
              <>
                {' '}+ <span className="font-mono">{formatCurrency(forecastRemaining)}</span> ainda planejado
              </>
            )}
          </p>
        )}
        <p
          className={cn(
            'mt-0.5 text-[11.5px]',
            forecastBelowTarget ? 'text-destructive-foreground/70' : 'text-white/70',
          )}
        >
          {hasCostPlanned && hasMarginTarget && (
            <>
              meta {targetText} · {forecastAboveTarget ? 'na meta ou acima' : 'abaixo da meta'}
              {showPlanWarning && (
                <>
                  {' '}· <span className="font-semibold text-white">Plano abaixo da meta ({formatPercent(marginPlanned)})</span>
                </>
              )}
            </>
          )}
          {hasCostPlanned && !hasMarginTarget && 'sem meta de margem definida'}
        </p>
      </div>
    </div>
  );
}
