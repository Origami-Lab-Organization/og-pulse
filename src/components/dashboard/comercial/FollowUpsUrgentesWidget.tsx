import { useNavigate } from 'react-router-dom';
import { parseISO, isToday, isTomorrow, isPast, format, differenceInDays } from 'date-fns';
import { AlertCircle, Clock, CalendarClock, CheckCheck, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadFollowUp } from '@/hooks/useLeadFollowUps';
import { LeadWithBudget } from '@/types/lead';
import { cn } from '@/lib/utils';

type Urgency = 'overdue' | 'today' | 'this-week';

interface EnrichedFollowUp {
  followUp: LeadFollowUp;
  lead: LeadWithBudget | undefined;
  urgency: Urgency;
}

function getUrgency(fu: LeadFollowUp): Urgency | null {
  const scheduled = parseISO(fu.scheduled_at);
  if (isPast(scheduled) && !isToday(scheduled)) return 'overdue';
  if (isToday(scheduled)) return 'today';
  if (differenceInDays(scheduled, new Date()) <= 6) return 'this-week';
  return null;
}

function formatDate(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Hoje';
  if (isTomorrow(d)) return 'Amanhã';
  const daysLate = differenceInDays(new Date(), d);
  if (daysLate > 0) return `${daysLate}d atrasado`;
  return format(d, 'dd/MM');
}

const URGENCY_CONFIG = {
  overdue: {
    icon: AlertCircle,
    iconClass: 'text-destructive',
    chipClass: 'bg-destructive/10 text-destructive',
    label: 'Vencido',
  },
  today: {
    icon: Clock,
    iconClass: 'text-amber-600',
    chipClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    label: 'Hoje',
  },
  'this-week': {
    icon: CalendarClock,
    iconClass: 'text-muted-foreground',
    chipClass: 'bg-muted text-muted-foreground',
    label: 'Esta semana',
  },
};

interface Props {
  followUps: LeadFollowUp[];
  leads: LeadWithBudget[];
  isLoading: boolean;
}

export function FollowUpsUrgentesWidget({ followUps, leads, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            Follow-ups Urgentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
        </CardContent>
      </Card>
    );
  }

  const leadMap = new Map(leads.map((l) => [l.id, l]));

  const urgent: EnrichedFollowUp[] = followUps
    .map((fu) => {
      const urgency = getUrgency(fu);
      if (!urgency) return null;
      return { followUp: fu, lead: leadMap.get(fu.lead_id), urgency };
    })
    .filter((x): x is EnrichedFollowUp => x !== null)
    .sort((a, b) => {
      const order = { overdue: 0, today: 1, 'this-week': 2 };
      if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency];
      return a.followUp.scheduled_at.localeCompare(b.followUp.scheduled_at);
    });

  const visible = urgent.slice(0, 5);
  const extra = urgent.length - visible.length;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            Follow-ups Urgentes
            {urgent.length > 0 && (
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                ({urgent.length})
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground gap-1 hover:text-foreground"
            onClick={() => navigate('/crm')}
          >
            Ver CRM
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <CheckCheck className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum follow-up urgente.</p>
            <p className="text-xs text-muted-foreground/70">Bom trabalho!</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {visible.map(({ followUp, lead, urgency }) => {
              const cfg = URGENCY_CONFIG[urgency];
              const Icon = cfg.icon;
              return (
                <div
                  key={followUp.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-md bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/crm?lead=${followUp.lead_id}&tab=followups`)}
                >
                  <Icon className={cn('h-3.5 w-3.5 shrink-0', cfg.iconClass)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                      {lead?.name ?? 'Oportunidade'}
                    </p>
                    {lead?.company_name && (
                      <p className="text-[11px] text-muted-foreground truncate">{lead.company_name}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                      cfg.chipClass,
                    )}
                  >
                    {formatDate(followUp.scheduled_at)}
                  </span>
                </div>
              );
            })}
            {extra > 0 && (
              <button
                className="w-full text-xs text-muted-foreground text-center py-1.5 hover:text-foreground transition-colors"
                onClick={() => navigate('/crm')}
              >
                +{extra} follow-up{extra !== 1 ? 's' : ''} no CRM
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
