import { Eye, EyeOff, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { forecastTone } from '@/lib/projectForecast';
import { useHideValuesPreference } from '@/contexts/HideValuesContext';
import type { PortfolioGoals, PortfolioKpis, PortfolioMargin } from '@/types/portfolio';
import type { ForecastTone } from '@/types/projectForecast';

interface PortfolioKPIBarProps {
  kpis: PortfolioKpis;
  year: number;
  /** "Meus projetos" ou "Todos os projetos": o alcance dos números. */
  scopeLabel: string;
  /** Metas do ano; `null` = não definidas (US-0036). */
  goals: PortfolioGoals | null;
  /** Margem bruta do portfólio; `null` = nenhum projeto com custo planejado. */
  margin: PortfolioMargin | null;
  isLoading?: boolean;
  isMarginLoading?: boolean;
}

interface KpiCellProps {
  label: string;
  info: string;
  value: string;
  valueClassName?: string;
  line: string;
  lineClassName?: string;
  isLoading?: boolean;
}

const TONE_TEXT: Record<ForecastTone, string> = {
  ok: 'text-success-emphasis',
  warning: 'text-warning-emphasis',
  critical: 'text-destructive-emphasis',
  neutral: 'text-muted-foreground',
};

const CELL_BASE =
  'flex min-w-0 flex-col items-start gap-0.5 border-b px-5 py-3.5 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(n+3)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0';

/** Um indicador: rótulo com o "i" que explica, valor e uma linha com o dado principal. */
function Cell(props: KpiCellProps) {
  const { label, info, value, valueClassName, line, lineClassName, isLoading } = props;
  return (
    <div className={CELL_BASE}>
      <div className="flex items-center gap-1">
        <span className="ol-label text-muted-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Sobre ${label}`}
              className="rounded-full p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[260px] text-xs">{info}</TooltipContent>
        </Tooltip>
      </div>
      {isLoading ? (
        <div className="w-full space-y-2 pt-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      ) : (
        <>
          <p className={cn('max-w-full truncate font-mono text-[1.6rem] font-semibold leading-tight tabular-nums text-foreground', valueClassName)}>
            {value}
          </p>
          <p className={cn('max-w-full truncate text-xs text-muted-foreground', lineClassName)}>{line}</p>
        </>
      )}
    </div>
  );
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function revenueLine(expected: number, goals: PortfolioGoals | null, hide: boolean) {
  if (!goals) return { line: 'Meta não definida', tone: 'neutral' as ForecastTone };
  return {
    line: `${hide ? '•••' : pct(expected, goals.revenueTarget) + '%'} da meta`,
    tone: forecastTone(expected, goals.revenueTarget, true),
  };
}

const formatPct = (value: number) => `${value.toFixed(1).replace('.', ',')}%`;

/** Card da margem: valor colorido pela meta do portfólio, a meta e a explicação. */
function marginCell(margin: PortfolioMargin | null, goals: PortfolioGoals | null, hide: boolean) {
  const tone = margin && goals ? forecastTone(margin.percent, goals.grossMarginTargetPercent, true) : 'neutral';
  const info = margin
    ? `Margem projetada no fim dos projetos ativos, ponderada pelo valor de cada um. ${margin.inTargetCount} de ${margin.projectCount} projetos estão na meta de margem deles.`
    : 'Nenhum projeto ativo com custo planejado para projetar a margem.';
  let value = '—';
  if (margin) value = hide ? '•••' : formatPct(margin.percent);
  let line = 'Meta não definida';
  if (goals) line = `meta ${hide ? '•••' : `${goals.grossMarginTargetPercent}%`}`;
  return { info, value, line, valueClassName: TONE_TEXT[tone] };
}

/**
 * Indicadores do portfólio (US-0034): Carteira ativa (hoje), Receita esperada e Recebido no
 * ano filtrado, e Margem bruta do portfólio. Uma linha por card e o resto no "i"; cor só onde
 * há meta (US-0036). O olho de ocultar valores fica aqui, junto do que ele esconde.
 */
export function PortfolioKPIBar(props: PortfolioKPIBarProps) {
  const { kpis, year, scopeLabel, goals, margin, isLoading, isMarginLoading } = props;
  const [hideValues, setHideValues] = useHideValuesPreference();
  const money = (value: number) => (hideValues ? '•••••' : formatCurrency(value));
  const revenue = revenueLine(kpis.expectedRevenue, goals, hideValues);
  const marginProps = marginCell(margin, goals, hideValues);
  const goalText = goals
    ? `Meta do ano: ${money(goals.revenueTarget)}, definida em Configurações › Financeiro.`
    : 'Sem meta definida para o ano em Configurações › Financeiro.';
  const receivedShare = hideValues ? '•••' : `${pct(kpis.receivedRevenue, kpis.expectedRevenue)}%`;
  const activeLine = `${kpis.activeCount} ${kpis.activeCount === 1 ? 'projeto em andamento' : 'projetos em andamento'}`;

  return (
    <section aria-label="Indicadores do portfólio" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="ol-label text-muted-foreground">
          {scopeLabel} · {year}
        </span>
        <button
          type="button"
          aria-pressed={hideValues}
          onClick={() => setHideValues((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {hideValues ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {hideValues ? 'Mostrar valores' : 'Ocultar valores'}
        </button>
      </div>
      <div className="grid grid-cols-1 overflow-hidden rounded-lg border bg-card sm:grid-cols-2 lg:grid-cols-4">
        <Cell
          label="Carteira ativa"
          info="Contrato total dos projetos em Planejamento, Entrega de Valor e Encerramento. Não depende do ano."
          value={money(kpis.activeContract)}
          line={activeLine}
          isLoading={isLoading}
        />
        <Cell
          label={`Receita esperada em ${year}`}
          info={`Parcelas que vencem em ${year}. ${goalText}`}
          value={money(kpis.expectedRevenue)}
          line={revenue.line}
          lineClassName={cn(goals && 'font-semibold', TONE_TEXT[revenue.tone])}
          isLoading={isLoading}
        />
        <Cell
          label={`Recebido em ${year}`}
          info={`Das parcelas que vencem em ${year}, as já recebidas. Ainda falta receber ${money(Math.max(0, kpis.expectedRevenue - kpis.receivedRevenue))} em ${year}.`}
          value={money(kpis.receivedRevenue)}
          line={`${receivedShare} do esperado`}
          isLoading={isLoading}
        />
        <Cell label="Margem bruta do portfólio" {...marginProps} isLoading={isLoading || isMarginLoading} />
      </div>
    </section>
  );
}
