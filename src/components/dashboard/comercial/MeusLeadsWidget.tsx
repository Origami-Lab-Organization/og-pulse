import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';
import { User, ArrowRight, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { LeadWithBudget, CRM_LEAD_COLUMNS, CRMStage } from '@/types/lead';
import { cn } from '@/lib/utils';

const STAGE_ORDER: Record<CRMStage, number> = {
  negotiation: 0,
  proposal: 1,
  qualification: 2,
  screening: 3,
  closed: 4,
};

function getStageBadgeClass(stage: CRMStage): string {
  return CRM_LEAD_COLUMNS.find((c) => c.id === stage)?.color ?? 'bg-muted text-muted-foreground';
}

function getStageLabel(stage: CRMStage): string {
  return CRM_LEAD_COLUMNS.find((c) => c.id === stage)?.label ?? stage;
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${Math.round(value / 1_000)}k`;
  if (value === 0) return '—';
  return `R$ ${Math.round(value)}`;
}

function getLeadValue(lead: LeadWithBudget): number {
  return (lead.budget?.final_total ?? 0) > 0 ? lead.budget!.final_total : lead.estimated_value;
}

interface Props {
  leads: LeadWithBudget[];
  isLoading: boolean;
}

export function MeusLeadsWidget({ leads, isLoading }: Props) {
  const navigate = useNavigate();
  const { employee } = useAuth();

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Meus Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
        </CardContent>
      </Card>
    );
  }

  const myLeads = leads
    .filter((l) => !l.archived && l.crm_stage !== 'closed' && l.responsible_id === employee?.id)
    .sort((a, b) => STAGE_ORDER[a.crm_stage] - STAGE_ORDER[b.crm_stage]);

  const visible = myLeads.slice(0, 3);
  const extra = myLeads.length - visible.length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
            <User className="h-4 w-4 text-muted-foreground" />
            Meus Leads
          </CardTitle>
          <div className="flex items-center gap-2">
            {myLeads.length > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {myLeads.length} ativo{myLeads.length !== 1 ? 's' : ''}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground gap-1 hover:text-foreground"
              onClick={() => navigate('/crm')}
            >
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-1.5">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Layers className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma oportunidade atribuída a você.</p>
          </div>
        ) : (
          <>
            {visible.map((lead) => {
              const daysSince = differenceInDays(new Date(), parseISO(lead.created_at));
              return (
                <div
                  key={lead.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-md bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/crm?lead=${lead.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                      {lead.name}
                    </p>
                    {lead.company_name && (
                      <p className="text-[11px] text-muted-foreground truncate">{lead.company_name}</p>
                    )}
                    <Badge
                      className={cn(
                        'text-[10px] border-0 font-medium mt-1 pointer-events-none',
                        getStageBadgeClass(lead.crm_stage),
                      )}
                    >
                      {getStageLabel(lead.crm_stage)}
                    </Badge>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium tabular-nums">{formatCurrencyCompact(getLeadValue(lead))}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">{daysSince}d</p>
                  </div>
                </div>
              );
            })}
            {extra > 0 && (
              <button
                className="w-full text-xs text-muted-foreground text-center py-1.5 hover:text-foreground transition-colors"
                onClick={() => navigate('/crm')}
              >
                +{extra} no CRM
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
