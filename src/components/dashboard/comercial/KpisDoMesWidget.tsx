import { useMemo } from 'react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Percent, Target, UserPlus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCommercialDashboard } from '@/hooks/useCommercialDashboard';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function Variation({ current, prev, invert = false }: { current: number; prev: number; invert?: boolean }) {
  if (prev === 0) {
    return (
      <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        Sem dado anterior
      </span>
    );
  }
  if (current === prev) {
    return (
      <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        Igual ao mês anterior
      </span>
    );
  }
  const pct = ((current - prev) / Math.abs(prev)) * 100;
  const isGood = invert ? pct < 0 : pct >= 0;
  const Icon = pct >= 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'text-[11px] flex items-center gap-1 tabular-nums font-medium',
        isGood ? 'text-emerald-600' : 'text-destructive',
      )}
    >
      <Icon className="h-3 w-3" />
      {pct >= 0 ? '+' : ''}{pct.toFixed(0)}% vs mês anterior
    </span>
  );
}

export function KpisDoMesWidget() {
  const today = useMemo(() => new Date(), []);
  const dateFrom = useMemo(() => startOfMonth(today), [today]);
  const dateTo = useMemo(() => endOfMonth(today), [today]);
  const periodoLabel = capitalize(format(today, 'MMMM \'de\' yyyy', { locale: ptBR }));

  const { data, isLoading } = useCommercialDashboard(dateFrom, dateTo, 'all', 'all');

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-4 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Taxa de Conversão',
      icon: Percent,
      value: data ? `${data.conversionRate.toFixed(1)}%` : '—',
      description: 'Oportunidades ganhas ÷ total encerrado no mês',
      tooltip: 'Proporção de oportunidades que resultaram em negócio fechado entre todas as que foram encerradas (ganhas + perdidas) no período.',
      current: data?.conversionRate ?? 0,
      prev: data?.prevConversionRate ?? 0,
    },
    {
      label: 'Previsão de Receita',
      icon: Target,
      value: data ? formatCurrency(data.forecast) : '—',
      description: data && data.forecastLeadsCount > 0
        ? `${data.forecastLeadsCount} oportunidade${data.forecastLeadsCount !== 1 ? 's' : ''} ponderada${data.forecastLeadsCount !== 1 ? 's' : ''} por etapa`
        : 'Nenhuma oportunidade ativa no pipeline',
      tooltip: 'Soma do valor das oportunidades ativas, ponderada pela probabilidade de fechamento de cada etapa do pipeline (Prospecção/Oportunidade 10%, Qualificação 25%, Proposta Enviada 50%, Negociação 75%).',
      current: data?.forecast ?? 0,
      prev: data?.prevForecast ?? 0,
    },
    {
      label: 'Novas Oportunidades',
      icon: UserPlus,
      value: data ? String(data.newLeadsThisYear) : '—',
      description: 'Entradas no pipeline neste mês',
      tooltip: 'Total de oportunidades criadas no pipeline durante o período selecionado, independentemente do estágio atual.',
      current: data?.newLeadsThisYear ?? 0,
      prev: data?.prevNewLeadsThisYear ?? 0,
    },
  ];

  return (
    <div className="space-y-2">
      {/* Período de referência */}
      <div className="flex items-center gap-2 px-0.5">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Indicadores · {periodoLabel}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.map(({ label, icon: Icon, value, description, tooltip, current, prev }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xs text-muted-foreground cursor-default underline decoration-dotted underline-offset-2 w-fit">
                        {label}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
                      {tooltip}
                    </TooltipContent>
                  </Tooltip>

                  <p className="text-xl font-bold text-foreground tabular-nums leading-tight">
                    {value}
                  </p>

                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {description}
                  </p>

                  <Variation current={current} prev={prev} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
