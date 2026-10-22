import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { CalendarClock, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectTeamsMeetings, useStopFollowingTeamsMeeting } from '@/hooks/useMeetingTranscriptions';
import type { ProjectTeamsMeeting } from '@/types/meetingTranscription';

/** "Verificada há 4 minutos", ou o problema que a sincronização encontrou. */
function SyncStatus(props: { meeting: ProjectTeamsMeeting }) {
  const { meeting } = props;
  if (meeting.lastError) {
    return <p className="text-sm text-warning-emphasis">{meeting.lastError}</p>;
  }
  if (!meeting.lastCheckedAt) {
    return <p className="text-xs text-muted-foreground">Aguardando a primeira verificação.</p>;
  }
  return (
    <p className="text-xs text-muted-foreground">
      Verificada {formatDistanceToNow(parseISO(meeting.lastCheckedAt), { addSuffix: true, locale: ptBR })}
    </p>
  );
}

interface MeetingRowProps {
  meeting: ProjectTeamsMeeting;
  canStop: boolean;
}

function MeetingRow(props: MeetingRowProps) {
  const { meeting, canStop } = props;
  const stop = useStopFollowingTeamsMeeting();

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium text-foreground">{meeting.eventSubject}</p>
        <p className="text-xs text-muted-foreground">
          Vinculada por {meeting.registeredByName ?? 'alguém da equipe'}
        </p>
        <SyncStatus meeting={meeting} />
      </div>
      {canStop && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label={`Parar de trazer a transcrição de ${meeting.eventSubject}`}
          onClick={() => stop.mutate(meeting.id)}
          disabled={stop.isPending}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </li>
  );
}

interface TeamsMeetingsSectionProps {
  projectId: string;
  /** GP do projeto (ou quem gere qualquer projeto): para de acompanhar qualquer reunião. */
  canManageProject: boolean;
}

/**
 * Reuniões do Teams vinculadas ao projeto. A transcrição de cada uma chega sozinha, alguns
 * minutos depois de a reunião acabar (ADR-0052).
 */
export function TeamsMeetingsSection(props: TeamsMeetingsSectionProps) {
  const { projectId, canManageProject } = props;
  const { employee } = useAuth();
  const { data: meetings, isLoading, error } = useProjectTeamsMeetings(projectId);

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Não foi possível carregar as reuniões do Teams vinculadas.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-2" aria-labelledby="teams-meetings-title">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h4 id="teams-meetings-title" className="text-sm font-semibold text-foreground">
          Reuniões do Teams vinculadas
        </h4>
      </div>
      {meetings?.length ? (
        <ul className="space-y-2">
          {meetings.map((meeting) => (
            <MeetingRow
              key={meeting.id}
              meeting={meeting}
              canStop={canManageProject || meeting.registeredById === employee?.id}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma ainda. Na <Link to="/minha-agenda" className="underline underline-offset-2">Agenda</Link>,
          crie a reunião do Teams escolhendo este projeto, ou abra uma que você organizou e use
          "Vincular a um projeto". A transcrição passa a chegar aqui sozinha.
        </p>
      )}
    </section>
  );
}
