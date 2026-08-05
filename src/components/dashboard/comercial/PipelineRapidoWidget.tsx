import { useNavigate } from 'react-router-dom';
import { Kanban, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { LeadWithBudget, CRM_LEAD_COLUMNS, CRMStage } from '@/types/lead';

const STAGE_COLOR: Record<CRMStage, string> = {
  screening: 'hsl(var(--chart-2))',
  qualification: 'hsl(var(--chart-5))',
  proposal: 'hsl(var(--chart-3))',
  negotiation: 'hsl(var(--chart-4))',
  closed: 'hsl(var(--success))',
  closed_lost: 'hsl(var(--destructive))',
};

const STAGE_LABEL: Record<CRMStage, string> = {
  screening: 'Prospecção/Oportunidade',
  qualification: 'Qualificação',
  proposal: 'Proposta Enviada',
  negotiation: 'Negociação',
  closed: 'Fechado - Ganho',
  closed_lost: 'Fechado - Perda',
};

const TOOLTIP_MAX = 5;

function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${Math.round(value / 1_000)}k`;
  if (value === 0) return '—';
  return `R$ ${Math.round(value)}`;
}

function getLeadValue(lead: LeadWithBudget): number {
  return (lead.budget?.final_total ?? 0) > 0 ? lead.budget!.final_total : lead.estimated_value;
}

interface StageItem {
  stage: CRMStage;
  label: string;
  count: number;
  value: number;
  leads: LeadWithBudget[];
}

function StageTooltipContent({ item }: { item: StageItem }) {
  const visible = item.leads.slice(0, TOOLTIP_MAX);
  const extra = item.leads.length - visible.length;

  return (
    <div className="min-w-[220px] max-w-[280px]">
      <p className="text-xs font-semibold text-foreground mb-2 pb-2 border-b border-border/60">
        {item.label}
        <span className="font-normal text-muted-foreground ml-1.5">
          ({item.count} oportunidade{item.count !== 1 ? 's' : ''})
        </span>
      </p>
      <div className="space-y-1.5">
        {visible.map((lead) => (
          <div key={lead.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-foreground leading-tight truncate">{lead.name}</p>
              {lead.company_name && (
                <p className="text-[10px] text-muted-foreground truncate leading-tight">{lead.company_name}</p>
              )}
            </div>
            <span className="text-xs font-medium tabular-nums text-foreground shrink-0">
              {formatCurrencyCompact(getLeadValue(lead))}
            </span>
          </div>
        ))}
        {extra > 0 && (
          <p className="text-[10px] text-muted-foreground pt-0.5">
            +{extra} oportunidade{extra !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

interface Props {
  leads: LeadWithBudget[];
  isLoading: boolean;
}

export function PipelineRapidoWidget({ leads, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="grid gap-3 items-center" style={{ gridTemplateColumns: '120px 1fr 72px' }}>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 rounded-full" />
              <Skeleton className="h-3 w-full ml-auto" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const activeLeads = leads.filter((l) => !l.archived);

  const stageData: StageItem[] = CRM_LEAD_COLUMNS.map((col) => {
    const stageLeads = activeLeads.filter((l) => l.crm_stage === col.id);
    const totalValue = stageLeads.reduce((sum, l) => sum + getLeadValue(l), 0);
    return {
      stage: col.id as CRMStage,
      label: STAGE_LABEL[col.id as CRMStage],
      count: stageLeads.length,
      value: totalValue,
      leads: stageLeads,
    };
  });

  const maxValue = Math.max(...stageData.map((s) => s.value), 1);
  const totalValue = stageData.filter((s) => s.stage !== 'closed' && s.stage !== 'closed_lost').reduce((sum, s) => sum + s.value, 0);
  const totalCount = activeLeads.filter((l) => l.crm_stage !== 'closed' && l.crm_stage !== 'closed_lost').length;
  const hasAny = activeLeads.length > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Kanban className="h-4 w-4 text-muted-foreground" />
              Pipeline
            </CardTitle>
            {hasAny && totalCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{formatCurrencyCompact(totalValue)}</span>
                {' '}em {totalCount} oportunidade{totalCount !== 1 ? 's' : ''} ativas
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground gap-1 hover:text-foreground shrink-0 mt-0.5"
            onClick={() => navigate('/pipeline')}
          >
            Abrir CRM
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col pt-0">
        {!hasAny ? (
          <div className="flex items-center justify-center h-full min-h-[160px]">
            <p className="text-sm text-muted-foreground">Nenhuma oportunidade ativa no pipeline.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stageData.map((item) => {
              const pct = item.value > 0 ? (item.value / maxValue) * 100 : 0;
              const isEmpty = item.count === 0;
              return (
                <div
                  key={item.stage}
                  className={cn('grid items-center gap-x-3', isEmpty && 'opacity-35')}
                  style={{ gridTemplateColumns: '120px 1fr 72px' }}
                >
                  {/* Etapa */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: STAGE_COLOR[item.stage] }}
                    />
                    <span className="text-xs text-foreground/80 truncate leading-none">
                      {item.label}
                    </span>
                  </div>

                  {/* Barra com tooltip */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'h-[12px] bg-muted/60 rounded-full overflow-hidden',
                          !isEmpty && 'cursor-default',
                        )}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: STAGE_COLOR[item.stage],
                            opacity: 0.85,
                          }}
                        />
                      </div>
                    </TooltipTrigger>
                    {!isEmpty && (
                      <TooltipContent side="top" align="start" className="p-3">
                        <StageTooltipContent item={item} />
                      </TooltipContent>
                    )}
                  </Tooltip>

                  {/* Valor */}
                  <span
                    className={cn(
                      'text-xs tabular-nums text-right',
                      item.value > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {formatCurrencyCompact(item.value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
