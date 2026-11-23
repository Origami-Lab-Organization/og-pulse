import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';
import { useMaskedCurrency, useMaskedPercent, useHideValues } from '@/contexts/HideValuesContext';
import { forecastTone } from '@/lib/projectForecast';
import type { ForecastTone } from '@/types/projectForecast';

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
  /** Custo final estimado. Não aparece no card (os custos já estão nos outros cards). */
  forecastCost?: number;
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

const FORECAST_TONE_STYLE: Record<ForecastTone, { card: string; number: string; status: string }> = {
  ok: { card: 'bg-[hsl(var(--brand-slate))] text-white', number: 'text-[hsl(var(--green-300))]', status: 'na meta ou acima' },
  warning: { card: 'bg-warning text-warning-foreground', number: 'text-warning-foreground', status: 'até 10% abaixo da meta' },
  critical: {
    card: 'bg-destructive text-destructive-foreground',
    number: 'text-destructive-foreground',
    status: 'mais de 10% abaixo da meta',
  },
  neutral: { card: 'bg-[hsl(var(--brand-slate))] text-white', number: 'text-white/70', status: '' },
};

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
  projectEnded = false,
  hasCostPlanned = true,
  onNavigateToExpenses,
}: FinancialKpiCardsProps) {
  const formatCurrency = useMaskedCurrency();
  const formatPercent = useMaskedPercent();
  const hideValues = useHideValues();

  const marginAboveTarget = marginActual >= marginTarget;
  const plannedBelowTarget = marginPlanned < marginTarget;
  const hasMarginTarget = marginTarget > 0;
  // A cor segue só o forecast × meta, em três faixas (US-0032, decisões de 23/11).
  const tone = forecastTone(forecastMargin, marginTarget, hasCostPlanned);
  const toneStyle = FORECAST_TONE_STYLE[tone];
  // Plano abaixo da meta com forecast acima: card verde, com aviso escrito.
  const showPlanWarning = tone === 'ok' && plannedBelowTarget;
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

      {/* Forecast — superfície de ênfase: petróleo (na meta), âmbar (até 10% abaixo) ou
          destaque negativo (mais de 10% abaixo). Os valores de custo já estão nos outros
          cards; aqui só a margem projetada e o estado (US-0032). */}
      <div className={cn(cardBase, 'border-transparent', toneStyle.card)}>
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">
          Forecast · fim do projeto
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={cn('font-mono text-[1.625rem] font-semibold leading-none tabular-nums', toneStyle.number)}>
            {hasCostPlanned ? formatPercent(forecastMargin) : '—'}
          </span>
          <span className="truncate text-[11.5px] opacity-85">
            {hasCostPlanned ? 'margem projetada' : 'sem custo planejado para projetar'}
          </span>
        </div>
        {hasCostPlanned && projectEnded && (
          <p className="mt-0.5 text-[11.5px] font-semibold">Projeto encerrado</p>
        )}
        {hasCostPlanned && (
          <p className="mt-0.5 text-[11.5px] opacity-85">
            {hasMarginTarget ? (
              <>
                meta {targetText} · {toneStyle.status}
                {showPlanWarning && (
                  <>
                    {' '}· <span className="font-semibold">Plano abaixo da meta ({formatPercent(marginPlanned)})</span>
                  </>
                )}
              </>
            ) : (
              'sem meta de margem definida'
            )}
          </p>
        )}
      </div>
    </div>
  );
}
