import { useNavigate } from 'react-router-dom';
import { parseISO, differenceInDays } from 'date-fns';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadFollowUp } from '@/hooks/useLeadFollowUps';
import { LeadWithBudget, CRM_LEAD_COLUMNS, CRMStage } from '@/types/lead';
import { cn } from '@/lib/utils';

const STALL_THRESHOLDS: Partial<Record<CRMStage, number>> = {
  qualification: 14,
  proposal: 7,
  negotiation: 3,
};

type RiskReason = 'overdue' | 'stalled' | 'both';

interface RiskyLead {
  lead: LeadWithBudget;
  reason: RiskReason;
  daysSinceUpdate: number;
  hasOverdueFollowUp: boolean;
}

function isFollowUpOverdue(fu: LeadFollowUp): boolean {
  return fu.status !== 'done' && new Date(fu.scheduled_at) < new Date();
}

function getStageBadgeClass(stage: CRMStage): string {
  return CRM_LEAD_COLUMNS.find((c) => c.id === stage)?.color ?? 'bg-muted text-muted-foreground';
}

function getStageLabel(stage: CRMStage): string {
  return CRM_LEAD_COLUMNS.find((c) => c.id === stage)?.label ?? stage;
}

function getRiskLabel(reason: RiskReason, days: number): string {
  if (reason === 'overdue') return 'Follow-up vencido';
  if (reason === 'stalled') return `${days}d sem movimento`;
  return `Follow-up vencido · ${days}d parado`;
}

interface Props {
  leads: LeadWithBudget[];
  followUps: LeadFollowUp[];
  isLoading: boolean;
}

export function OportunidadesRiscoWidget({ leads, followUps, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            Oportunidades em Risco
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
        </CardContent>
      </Card>
    );
  }

  const overdueLeadIds = new Set(
    followUps.filter(isFollowUpOverdue).map((fu) => fu.lead_id),
  );

  const riskyLeads: RiskyLead[] = leads
    .filter((l) => !l.archived && l.crm_stage !== 'closed' && l.crm_stage !== 'screening')
    .map((lead) => {
      const daysSinceUpdate = differenceInDays(new Date(), parseISO(lead.updated_at));
      const threshold = STALL_THRESHOLDS[lead.crm_stage];
      const isStalled = !!threshold && daysSinceUpdate > threshold;
      const hasOverdue = overdueLeadIds.has(lead.id);
      if (!isStalled && !hasOverdue) return null;
      const reason: RiskReason = isStalled && hasOverdue ? 'both' : hasOverdue ? 'overdue' : 'stalled';
      return { lead, reason, daysSinceUpdate, hasOverdueFollowUp: hasOverdue };
    })
    .filter((x): x is RiskyLead => x !== null)
    .sort((a, b) => {
      const order: Record<RiskReason, number> = { both: 0, overdue: 1, stalled: 2 };
      if (order[a.reason] !== order[b.reason]) return order[a.reason] - order[b.reason];
      return b.daysSinceUpdate - a.daysSinceUpdate;
    });

  if (riskyLeads.length === 0) return null;

  const visible = riskyLeads.slice(0, 5);
  const extra = riskyLeads.length - visible.length;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            Oportunidades em Risco
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              ({riskyLeads.length})
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground gap-1 hover:text-foreground"
            onClick={() => navigate('/pipeline')}
          >
            Ver CRM
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-1.5">
        {visible.map(({ lead, reason, daysSinceUpdate }) => (
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
            <span className="text-[10px] text-muted-foreground shrink-0 text-right whitespace-nowrap self-start mt-1">
              {getRiskLabel(reason, daysSinceUpdate)}
            </span>
          </div>
        ))}
        {extra > 0 && (
          <button
            className="w-full text-xs text-muted-foreground text-center py-1.5 hover:text-foreground transition-colors"
            onClick={() => navigate('/pipeline')}
          >
            +{extra} oportunidade{extra !== 1 ? 's' : ''} em risco
          </button>
        )}
      </CardContent>
    </Card>
  );
}
