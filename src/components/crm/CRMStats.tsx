import { Card, CardContent } from '@/components/ui/card';
import { Trophy, TrendingUp, Wallet, Target } from 'lucide-react';
import { LeadWithBudget } from '@/types/lead';
import { Service } from '@/types/service';
import { formatCurrency } from '@/lib/formatters';
import { resolveLeadEstimatedValue, ServiceLineAvgTicketLookup, EMPTY_AVG_TICKET_LOOKUP } from '@/lib/leadValue';
import { useCRMReceivedValue } from '@/hooks/useLeads';
import { useAuth } from '@/contexts/AuthContext';

interface CRMStatsProps {
  leads: LeadWithBudget[];
  services?: Service[];
  avgTickets?: ServiceLineAvgTicketLookup;
}

const CRMStats = ({ leads, services = [], avgTickets = EMPTY_AVG_TICKET_LOOKUP }: CRMStatsProps) => {
  const { employee } = useAuth();
  const { data: receivedValue = 0 } = useCRMReceivedValue(employee?.tenant_id);

  const currentYear = new Date().getFullYear();

  const closedLeads = leads.filter((l) => {
    if (l.crm_stage !== 'closed') return false;
    if (l.closed_at) {
      return new Date(l.closed_at).getFullYear() === currentYear;
    }
    return true; // historical data without closed_at
  });

  const totalWon = closedLeads.reduce(
    (acc, l) => acc + resolveLeadEstimatedValue(l, services, avgTickets),
    0
  );

  const pipelineLeads = leads.filter((l) =>
    ['proposal', 'negotiation'].includes(l.crm_stage)
  );
  const pipelineValue = pipelineLeads.reduce(
    (acc, l) => acc + resolveLeadEstimatedValue(l, services, avgTickets),
    0
  );

  const stats = [
    {
      label: 'Projetos Ganhos',
      value: closedLeads.length,
      icon: Trophy,
      color: 'bg-success/10 text-success',
    },
    {
      label: 'Pipeline',
      value: formatCurrency(pipelineValue),
      icon: Target,
      color: 'bg-accent/50 text-accent-foreground',
    },
    {
      label: 'Total Ganho no Ano',
      value: formatCurrency(totalWon),
      icon: TrendingUp,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Recebido no Ano',
      value: formatCurrency(receivedValue),
      icon: Wallet,
      color: 'bg-info/10 text-info',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="animate-scale-in">
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`rounded-lg p-3 ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-semibold text-foreground">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CRMStats;
