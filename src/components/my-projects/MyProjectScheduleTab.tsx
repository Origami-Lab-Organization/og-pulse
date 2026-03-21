import { CalendarDays, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface SchedulePhase {
  title: string;
  deliverables: string | null;
  startDate: string;
  endDate: string;
  status: string;
  completedDate: string | null;
}

interface MyProjectScheduleTabProps {
  phases: SchedulePhase[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  delayed: 'Atrasado',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  delayed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function DotIndicator({ status }: { status: string }) {
  return (
    <div
      className={cn(
        'h-3 w-3 rounded-full shrink-0 mt-1',
        status === 'completed' && 'bg-emerald-500',
        status === 'in_progress' && 'bg-primary ring-2 ring-primary/30',
        status === 'delayed' && 'bg-destructive',
        status !== 'completed' && status !== 'in_progress' && status !== 'delayed' &&
          'bg-muted-foreground/30'
      )}
    />
  );
}

export function MyProjectScheduleTab({ phases }: MyProjectScheduleTabProps) {
  if (phases.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarDays className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium text-foreground">Nenhuma fase no cronograma</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            O cronograma de fases deste projeto ainda não foi configurado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-0">
      {phases.map((phase, idx) => {
        const isLast = idx === phases.length - 1;
        const statusLabel = STATUS_LABELS[phase.status] ?? phase.status;
        const badgeClass = STATUS_BADGE[phase.status] ?? STATUS_BADGE.pending;

        return (
          <div key={idx} className="flex gap-4">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <DotIndicator status={phase.status} />
              {!isLast && (
                <div className="w-0.5 flex-1 bg-border mt-1 mb-0 min-h-[1.5rem]" />
              )}
            </div>

            {/* Content */}
            <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <p className="text-sm font-semibold leading-snug">{phase.title}</p>
                <Badge className={cn('text-xs border-0 shrink-0', badgeClass)}>
                  {statusLabel}
                </Badge>
              </div>

              {phase.deliverables && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {phase.deliverables}
                </p>
              )}

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span>{formatDate(phase.startDate)}</span>
                <ArrowRight className="h-3 w-3" />
                <span>{formatDate(phase.endDate)}</span>
              </div>

              {phase.status === 'in_progress' && (
                <div className="mt-2 h-1.5 w-32 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-1/2 rounded-full bg-primary animate-pulse" />
                </div>
              )}

              {phase.completedDate && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Concluído em {formatDate(phase.completedDate)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
