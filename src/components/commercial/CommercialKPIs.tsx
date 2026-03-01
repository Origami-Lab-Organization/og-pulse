import { Percent, Receipt, Clock, TrendingUp, UserPlus, HelpCircle, ArrowUp, ArrowDown } from 'lucide-react';
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
  newLeadsThisYear: number;
  prevConversionRate: number;
  prevAvgTicket: number;
  prevAvgSalesCycleDays: number | null;
  prevActivePipeline: number;
  prevNewLeadsThisYear: number;
}

const kpis = [
  { key: 'conversionRate', prevKey: 'prevConversionRate', label: 'Taxa de Conversão', icon: Percent, format: (v: number) => `${v.toFixed(1)}%`, tooltip: 'Percentual de leads que se tornaram negócio fechado no período', invertColor: false },
  { key: 'avgTicket', prevKey: 'prevAvgTicket', label: 'Ticket Médio', icon: Receipt, format: (v: number) => formatCurrency(v), tooltip: 'Valor médio dos negócios fechados. O valor é definido na etapa Proposta, quando o orçamento é gerado', invertColor: false },
  { key: 'avgSalesCycleDays', prevKey: 'prevAvgSalesCycleDays', label: 'Ciclo Médio de Venda', icon: Clock, format: (v: number | null) => v !== null ? `${Math.round(v)} dias` : '—', tooltip: 'Tempo médio em dias desde a criação do lead até o fechamento do negócio', invertColor: true },
  { key: 'activePipeline', prevKey: 'prevActivePipeline', label: 'Pipeline Ativo', icon: TrendingUp, format: (v: number) => formatCurrency(v), tooltip: 'Soma dos orçamentos em andamento (etapas Proposta e Negociação). Leads em Triagem e Qualificação ainda não possuem valor definido', invertColor: false },
  { key: 'newLeadsThisYear', prevKey: 'prevNewLeadsThisYear', label: 'Leads Novos no Ano', icon: UserPlus, format: (v: number) => String(v), tooltip: 'Quantidade de novos leads criados no período, independente da etapa', invertColor: false },
] as const;

function getVariation(current: number | null, previous: number | null, invertColor: boolean) {
  if (current === null || previous === null || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const isPositive = pct > 0;
  const isGood = invertColor ? !isPositive : isPositive;
  return { pct, isPositive, isGood };
}

export function CommercialKPIs(props: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          const value = props[kpi.key];
          const prevValue = props[kpi.prevKey];
          const variation = getVariation(value as number | null, prevValue as number | null, kpi.invertColor);
          const showPipelineSublabel = kpi.key === 'activePipeline';
          const pipelineSublabel = showPipelineSublabel
            ? props.pipelineLeadsWithBudgetCount > 0
              ? `Baseado em ${props.pipelineLeadsWithBudgetCount} lead${props.pipelineLeadsWithBudgetCount > 1 ? 's' : ''} com orçamento definido`
              : props.pipelineHasNoProposals
                ? 'Nenhum orçamento gerado no período'
                : null
            : null;
          return (
            <Card key={kpi.key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
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
                      <div className={`flex items-center gap-0.5 text-xs ${variation.isGood ? 'text-emerald-600' : 'text-red-500'}`}>
                        {variation.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        <span>{Math.abs(variation.pct).toFixed(1)}% vs. ano anterior</span>
                      </div>
                    )}
                    {pipelineSublabel && (
                      <p className="text-[10px] leading-tight text-muted-foreground mt-0.5">
                        {pipelineSublabel}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
