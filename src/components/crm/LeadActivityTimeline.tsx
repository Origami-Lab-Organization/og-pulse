import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  ArrowRight,
  Pencil,
  FileText,
  FileEdit,
  Unlink,
  Archive,
  ArchiveRestore,
  Trophy,
  MessageSquarePlus,
  Loader2,
  History,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLeadActivities } from '@/hooks/useLeadActivities';
import { LeadActivityType, LeadActivityWithCreator } from '@/services/leadActivityService';
import { cn } from '@/lib/utils';

interface LeadActivityTimelineProps {
  leadId: string;
}

const ACTIVITY_CONFIG: Record<
  LeadActivityType,
  {
    icon: typeof Plus;
    color: string;
    bgColor: string;
  }
> = {
  created: { icon: Plus, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  stage_changed: { icon: ArrowRight, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  lead_updated: { icon: Pencil, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  budget_created: { icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  budget_updated: { icon: FileEdit, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  budget_unlinked: { icon: Unlink, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  archived: { icon: Archive, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800/50' },
  unarchived: { icon: ArchiveRestore, color: 'text-teal-600', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
  closed: { icon: Trophy, color: 'text-green-700', bgColor: 'bg-green-200 dark:bg-green-900/50' },
  note_added: { icon: MessageSquarePlus, color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
};

function ActivityItem({ activity }: { activity: LeadActivityWithCreator }) {
  const config = ACTIVITY_CONFIG[activity.activity_type] || ACTIVITY_CONFIG.lead_updated;
  const Icon = config.icon;
  const createdAt = new Date(activity.created_at);
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR });

  return (
    <div className="flex gap-3 relative">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
            config.bgColor
          )}
        >
          <Icon className={cn('h-4 w-4', config.color)} />
        </div>
        <div className="w-px bg-border flex-1 min-h-[16px]" />
      </div>

      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{activity.description}</p>

        {/* Change summary for budget updates */}
        {activity.activity_type === 'budget_updated' && activity.metadata?.change_summary && (
          <p className="text-xs text-muted-foreground mt-1">
            {activity.metadata.change_summary as string}
          </p>
        )}

        {/* Stage change badges */}
        {activity.activity_type === 'stage_changed' && activity.metadata?.from_stage && (
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
              {stageLabel(activity.metadata.from_stage as string)}
            </Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">
              {stageLabel(activity.metadata.to_stage as string)}
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground" title={format(createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}>
            {timeAgo}
          </span>
          {activity.creator && (
            <span className="text-xs text-muted-foreground">
              por {activity.creator.nome}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    screening: 'Triagem',
    qualification: 'Qualificação',
    proposal: 'Proposta',
    negotiation: 'Negociação',
    closed: 'Negócio Fechado',
  };
  return labels[stage] || stage;
}

export function LeadActivityTimeline({ leadId }: LeadActivityTimelineProps) {
  const { data: activities, isLoading } = useLeadActivities(leadId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mb-2" />
        <p className="text-sm">Nenhuma atividade registrada ainda.</p>
        <p className="text-xs mt-1">O histórico começará a ser registrado automaticamente.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[400px] pr-2">
      <div className="space-y-0">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </ScrollArea>
  );
}
