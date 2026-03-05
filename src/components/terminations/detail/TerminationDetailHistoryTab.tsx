import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, FileText, PlayCircle, CheckCircle, XCircle } from 'lucide-react';
import { TerminationWithEmployee } from '@/services/terminationService';
import { TERMINATION_STATUS_LABELS, TerminationStatus } from '@/types/termination';

interface Props {
  termination: TerminationWithEmployee;
}

interface TimelineEvent {
  date: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  in_progress: <PlayCircle className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  cancelled: <XCircle className="h-4 w-4 text-muted-foreground" />,
};

export const TerminationDetailHistoryTab = ({ termination }: Props) => {
  // Build timeline from available data
  const events: TimelineEvent[] = [];

  events.push({
    date: termination.created_at,
    icon: <Clock className="h-4 w-4 text-primary" />,
    title: 'Registro criado',
    description: `Processo de desligamento iniciado com status "${TERMINATION_STATUS_LABELS[termination.status as TerminationStatus]}".`,
  });

  if (termination.notification_date) {
    events.push({
      date: termination.notification_date,
      icon: <FileText className="h-4 w-4 text-blue-500" />,
      title: 'Comunicação ao funcionário',
      description: `Funcionário comunicado sobre o desligamento.`,
    });
  }

  if (termination.status === 'in_progress' || termination.status === 'completed') {
    events.push({
      date: termination.updated_at,
      icon: statusIcon[termination.status],
      title: termination.status === 'completed' ? 'Processo concluído' : 'Processo em andamento',
      description: termination.status === 'completed'
        ? 'Desligamento concluído e finalizado.'
        : 'Processo de desligamento está sendo processado.',
    });
  }

  if (termination.status === 'cancelled') {
    events.push({
      date: termination.updated_at,
      icon: statusIcon.cancelled,
      title: 'Processo cancelado',
      description: 'O desligamento foi cancelado e o funcionário reativado.',
    });
  }

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Histórico de Eventos</CardTitle>
      </CardHeader>
      <CardContent>
        {!events.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento registrado.</p>
        ) : (
          <div className="relative pl-6 space-y-6">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
            {events.map((ev, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background border border-border">
                  {ev.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{ev.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(ev.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
