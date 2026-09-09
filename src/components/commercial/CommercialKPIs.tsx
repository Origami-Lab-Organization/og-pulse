import { Percent, Receipt, Clock, TrendingUp, UserPlus, HelpCircle, ArrowUp, ArrowDown, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/formatters';

interface Props {
  conversionRate: number;
  avgTicket: number;
  avgSalesCycleDays: number | null;
  activePipeline: number;
  pipelineLeadsWithBudgetCount: number;
  pipelineHasNoProposals: boolean;
  forecast: number;
  forecastLeadsCount: number;
  newLeadsThisYear: number;
  prevConversionRate: number;
  prevAvgTicket: number;
  prevAvgSalesCycleDays: number | null;
  prevForecast: number;
  prevNewLeadsThisYear: number;
}

interface KPIConfig {
  key: string;
  /** Ausente em KPI de estoque (pipeline em aberto é retrato de agora, sem "período anterior"). */
  prevKey?: string;
  label: string;
  icon: typeof Percent;
  format: (v: any) => string;
  tooltip: string;
  invertColor: boolean;
}

const row1: KPIConfig[] = [
  { key: 'conversionRate', prevKey: 'prevConversionRate', label: 'Taxa de Conversão', icon: Percent, format: (v: number) => `${v.toFixed(1)}%`, tooltip: 'Percentual de oportunidades criadas no período que se tornaram negócio fechado', invertColor: false },
  { key: 'avgTicket', prevKey: 'prevAvgTicket', label: 'Ticket Médio', icon: Receipt, format: (v: number) => formatCurrency(v), tooltip: 'Valor médio dos negócios fechados. Vale o orçamento vinculado quando existe; sem orçamento, o valor estimado informado na oportunidade', invertColor: false },
  { key: 'forecast', prevKey: 'prevForecast', label: 'Receita Prevista (Forecast)', icon: Target, format: (v: number) => formatCurrency(v), tooltip: 'Estimativa ponderada de receita com base nos orçamentos em andamento e probabilidade de fechamento por etapa: Proposta Enviada 50%, Negociação 75%, Fechado 100%', invertColor: false },
];

const row2: KPIConfig[] = [
  { key: 'activePipeline', label: 'Pipeline Ativo', icon: TrendingUp, format: (v: number) => formatCurrency(v), tooltip: 'Soma do valor das oportunidades em aberto hoje, independente de quando foram criadas (exclui Fechado, Perdido e Stand By). Vale o orçamento vinculado quando existe; sem orçamento, o valor estimado informado na oportunidade. Oportunidades sem valor não entram na conta', invertColor: false },
  { key: 'avgSalesCycleDays', prevKey: 'prevAvgSalesCycleDays', label: 'Ciclo Médio de Venda', icon: Clock, format: (v: number | null) => v !== null ? `${Math.round(v)} dias` : '—', tooltip: 'Tempo médio em dias desde a criação da oportunidade até o fechamento do negócio', invertColor: true },
  { key: 'newLeadsThisYear', prevKey: 'prevNewLeadsThisYear', label: 'Oportunidades no Período', icon: UserPlus, format: (v: number) => String(v), tooltip: 'Quantidade de oportunidades criadas no período, independente da etapa', invertColor: false },
];

function getVariation(current: number | null, previous: number | null, invertColor: boolean) {
  if (current === null || previous === null || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const isPositive = pct > 0;
  const isGood = invertColor ? !isPositive : isPositive;
  return { pct, isPositive, isGood };
}

function KPICard({ kpi, props }: { kpi: KPIConfig; props: Props }) {
  const Icon = kpi.icon;
  const value = (props as any)[kpi.key];
  const prevValue = kpi.prevKey ? (props as any)[kpi.prevKey] : null;
  const variation = getVariation(value as number | null, prevValue as number | null, kpi.invertColor);

  const showPipelineSublabel = kpi.key === 'activePipeline';
  const pipelineSublabel = showPipelineSublabel
    ? props.pipelineLeadsWithBudgetCount > 0
      ? `${props.pipelineLeadsWithBudgetCount} oportunidade${props.pipelineLeadsWithBudgetCount > 1 ? 's' : ''} em aberto com valor`
      : props.pipelineHasNoProposals
        ? 'Oportunidades em aberto ainda sem valor informado'
        : null
    : null;

  const showForecastSublabel = kpi.key === 'forecast';
  const forecastSublabel = showForecastSublabel
    ? props.forecastLeadsCount > 0
      ? `Baseado em ${props.forecastLeadsCount} orçamento${props.forecastLeadsCount > 1 ? 's' : ''} ativo${props.forecastLeadsCount > 1 ? 's' : ''}`
      : 'Nenhum orçamento ativo no período'
    : null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-[11px] leading-tight text-muted-foreground">{kpi.label}</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  {kpi.tooltip}
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-bold text-foreground">{kpi.format(value)}</p>
            {variation && (
              <div className={`flex items-center gap-0.5 text-xs ${variation.isGood ? 'text-success-emphasis' : 'text-destructive'}`}>
                {variation.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                <span>{Math.abs(variation.pct).toFixed(1)}% vs. período anterior</span>
              </div>
            )}
            {pipelineSublabel && (
              <p className="text-[10px] leading-tight text-muted-foreground mt-0.5">{pipelineSublabel}</p>
            )}
            {forecastSublabel && (
              <p className="text-[10px] leading-tight text-muted-foreground mt-0.5">{forecastSublabel}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CommercialKPIs(props: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {row1.map(kpi => <KPICard key={kpi.key} kpi={kpi} props={props} />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {row2.map(kpi => <KPICard key={kpi.key} kpi={kpi} props={props} />)}
        </div>
      </div>
    </TooltipProvider>
  );
}
