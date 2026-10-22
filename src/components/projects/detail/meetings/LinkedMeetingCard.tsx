import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, X } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStopFollowingTeamsMeeting } from '@/hooks/useMeetingTranscriptions';
import { LINKED_MEETING_STATUS_LABEL, formatDuration } from '@/lib/meetingTranscription';
import {
  LINKED_MEETING_STATUS,
  type LinkedMeetingGroup,
  type LinkedMeetingStatus,
  type MeetingTranscriptionListItem,
  type ProjectTeamsMeeting,
} from '@/types/meetingTranscription';

const STATUS_VARIANT: Record<LinkedMeetingStatus, BadgeProps['variant']> = {
  [LINKED_MEETING_STATUS.AGENDADA]: 'neutral',
  [LINKED_MEETING_STATUS.AGUARDANDO]: 'info',
  [LINKED_MEETING_STATUS.TRANSCRITA]: 'success',
  [LINKED_MEETING_STATUS.SEM_TRANSCRICAO]: 'warning',
  [LINKED_MEETING_STATUS.COM_PROBLEMA]: 'destructive',
};

/** O que a situação quer dizer, para quem olha a lista sem conhecer a sincronização. */
const STATUS_HINT: Record<LinkedMeetingStatus, string | null> = {
  [LINKED_MEETING_STATUS.AGENDADA]: 'A transcrição chega alguns minutos depois de a reunião acabar.',
  [LINKED_MEETING_STATUS.AGUARDANDO]:
    'A transcrição do Teams costuma chegar em até 20 minutos depois do fim da reunião.',
  [LINKED_MEETING_STATUS.TRANSCRITA]: null,
  [LINKED_MEETING_STATUS.SEM_TRANSCRICAO]:
    'A reunião aconteceu, mas nenhuma transcrição chegou. Ela pode não ter sido transcrita no Teams.',
  [LINKED_MEETING_STATUS.COM_PROBLEMA]: null,
};

function when(meeting: ProjectTeamsMeeting): string | null {
  if (!meeting.startsAt) return null;
  const day = format(parseISO(meeting.startsAt), "d 'de' MMM yyyy, HH:mm", { locale: ptBR });
  return meeting.isSeries ? `série, desde ${day}` : day;
}

function meetingMeta(meeting: ProjectTeamsMeeting): string {
  return [when(meeting), `vinculada por ${meeting.registeredByName ?? 'alguém da equipe'}`]
    .filter(Boolean)
    .join(' · ');
}

function OccurrenceRow(props: { item: MeetingTranscriptionListItem; onOpen: () => void }) {
  const { item, onOpen } = props;
  const day = item.occurredAt ?? item.createdAt;
  const details = [
    format(parseISO(day), "d 'de' MMM yyyy, HH:mm", { locale: ptBR }),
    formatDuration(item.durationSeconds),
  ].filter(Boolean).join(' · ');

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm
                   transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-foreground tabular-nums">{details}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          Ler transcrição
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </button>
    </li>
  );
}

function StatusLine(props: { group: LinkedMeetingGroup }) {
  const { group } = props;
  if (group.status === LINKED_MEETING_STATUS.COM_PROBLEMA) {
    return <p className="text-sm text-warning-emphasis">{group.meeting.lastError}</p>;
  }
  const hint = STATUS_HINT[group.status];
  return hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null;
}

interface LinkedMeetingCardProps {
  group: LinkedMeetingGroup;
  canStop: boolean;
  onOpenTranscription: (id: string) => void;
}

/**
 * Uma reunião do Teams vinculada ao projeto e a situação da transcrição dela (ADR-0052). Numa
 * série, cada ocorrência transcrita aparece embaixo.
 */
export function LinkedMeetingCard(props: LinkedMeetingCardProps) {
  const { group, canStop, onOpenTranscription } = props;
  const { meeting, transcriptions, status } = group;
  const stop = useStopFollowingTeamsMeeting();

  return (
    <li className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-medium text-foreground">{meeting.eventSubject}</p>
          <p className="text-xs text-muted-foreground">{meetingMeta(meeting)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant={STATUS_VARIANT[status]}>{LINKED_MEETING_STATUS_LABEL[status]}</Badge>
          {canStop && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={`Parar de trazer a transcrição de ${meeting.eventSubject}`}
              onClick={() => stop.mutate(meeting.id)}
              disabled={stop.isPending}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <StatusLine group={group} />

      {transcriptions.length > 0 && (
        <ul className="space-y-0.5 border-t border-border pt-2">
          {transcriptions.map((item) => (
            <OccurrenceRow key={item.id} item={item} onOpen={() => onOpenTranscription(item.id)} />
          ))}
        </ul>
      )}
    </li>
  );
}
