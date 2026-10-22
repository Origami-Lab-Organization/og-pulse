import { format, parseISO } from 'date-fns';
import { Loader2, NotebookText, Repeat, RotateCcw, Users } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRequestTranscription } from '@/hooks/useMeetingTranscriptions';
import {
  LINKED_MEETING_STATUS_HINT,
  LINKED_MEETING_STATUS_LABEL,
  formatDuration,
  isTranscriptionStuck,
  participantNames,
  plainExcerpt,
} from '@/lib/meetingTranscription';
import { TranscriptionStatusBadge } from './TranscriptionStatusBadge';
import {
  LINKED_MEETING_STATUS,
  MEETING_TIMELINE_ENTRY_KIND,
  MEETING_TRANSCRIPTION_SOURCE,
  MEETING_TRANSCRIPTION_STATUS,
  type LinkedMeetingStatus,
  type MeetingTimelineEntry,
  type MeetingTranscriptionListItem,
  type ProjectTeamsMeeting,
} from '@/types/meetingTranscription';

const LINKED_STATUS_VARIANT: Record<LinkedMeetingStatus, BadgeProps['variant']> = {
  [LINKED_MEETING_STATUS.AGENDADA]: 'neutral',
  [LINKED_MEETING_STATUS.AGUARDANDO]: 'info',
  [LINKED_MEETING_STATUS.TRANSCRITA]: 'success',
  [LINKED_MEETING_STATUS.SEM_TRANSCRICAO]: 'warning',
  [LINKED_MEETING_STATUS.COM_PROBLEMA]: 'destructive',
};


export function LinkedMeetingStatusBadge(props: { status: LinkedMeetingStatus }) {
  return (
    <Badge variant={LINKED_STATUS_VARIANT[props.status]} className="shrink-0">
      {LINKED_MEETING_STATUS_LABEL[props.status]}
    </Badge>
  );
}

function clock(iso: string): string {
  return format(parseISO(iso), 'HH:mm');
}

function OriginTags(props: { item?: MeetingTranscriptionListItem; meeting: ProjectTeamsMeeting | null }) {
  const { item, meeting } = props;
  const isRecording = item?.source === MEETING_TRANSCRIPTION_SOURCE.GRAVACAO;
  return (
    <>
      <Badge variant="outline" className="font-normal">{isRecording ? 'Gravação' : 'Teams'}</Badge>
      {meeting?.isSeries && (
        <Badge variant="outline" className="gap-1 font-normal">
          <Repeat className="h-3 w-3" aria-hidden="true" />
          Série
        </Badge>
      )}
    </>
  );
}

function Participants(props: { names: string[] }) {
  if (!props.names.length) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{props.names.join(', ')}</span>
    </p>
  );
}

/** Resumo, se a equipe já trouxe; senão, as primeiras falas. */
function Excerpt(props: { summary: string | null; preview: string | null }) {
  const { summary, preview } = props;
  if (summary) {
    return (
      <div className="rounded-md bg-muted/60 px-3 py-2">
        <p className="mb-0.5 flex items-center gap-1 text-xs font-medium text-foreground">
          <NotebookText className="h-3.5 w-3.5" aria-hidden="true" />
          Resumo
        </p>
        <p className="line-clamp-3 text-sm text-foreground">{plainExcerpt(summary)}</p>
      </div>
    );
  }
  return preview ? <p className="line-clamp-2 text-sm italic text-muted-foreground">“{preview}”</p> : null;
}

function RetryButton(props: { item: MeetingTranscriptionListItem }) {
  const { item } = props;
  const request = useRequestTranscription();

  const retry = () =>
    request.mutate({
      projectId: item.projectId,
      recording: {
        driveId: item.recordingDriveId as string,
        itemId: item.recordingItemId as string,
        webUrl: item.recordingWebUrl,
      },
      eventSubject: item.eventSubject,
      occurredAt: item.occurredAt,
      icalUid: item.icalUid,
    });

  const Icon = request.isPending ? Loader2 : RotateCcw;
  return (
    <Button variant="outline" size="sm" onClick={retry} disabled={request.isPending}>
      <Icon className={`mr-2 h-4 w-4${request.isPending ? ' animate-spin' : ''}`} aria-hidden="true" />
      Pedir de novo
    </Button>
  );
}

/** Gravação enviada que falhou ou parou na fila — fora do botão do cartão, para não aninhar. */
function QueueNotice(props: { item: MeetingTranscriptionListItem; canRequest: boolean }) {
  const { item, canRequest } = props;

  if (item.status === MEETING_TRANSCRIPTION_STATUS.FALHOU) {
    return (
      <div className="flex flex-col gap-2 border-t border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-destructive-emphasis">{item.lastError ?? 'A transcrição não foi concluída.'}</p>
        {canRequest && <RetryButton item={item} />}
      </div>
    );
  }
  if (!isTranscriptionStuck(item)) return null;
  return (
    <p className="border-t border-border px-3 py-2 text-sm text-warning-emphasis">
      Parada há mais tempo que o normal. O serviço de transcrição pode estar fora do ar — avise quem
      cuida do sistema.
    </p>
  );
}

function MeetingHint(props: { meeting: ProjectTeamsMeeting; status: LinkedMeetingStatus }) {
  const { meeting, status } = props;
  if (status === LINKED_MEETING_STATUS.COM_PROBLEMA) {
    return <p className="text-sm text-warning-emphasis">{meeting.lastError}</p>;
  }
  const hint = LINKED_MEETING_STATUS_HINT[status];
  return hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null;
}

const CARD_BUTTON =
  'w-full space-y-2 rounded-lg p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface MeetingTimelineCardProps {
  entry: MeetingTimelineEntry;
  canRequest: boolean;
  onOpen: () => void;
}

/** Uma reunião na linha do tempo da aba Reuniões. */
export function MeetingTimelineCard(props: MeetingTimelineCardProps) {
  const { entry, canRequest, onOpen } = props;

  if (entry.kind === MEETING_TIMELINE_ENTRY_KIND.REUNIAO) {
    const { meeting, status } = entry;
    return (
      <li className="rounded-lg border border-border bg-card">
        <button type="button" onClick={onOpen} className={CARD_BUTTON}>
          <CardHeader title={meeting.eventSubject} time={clock(entry.when)} badge={<LinkedMeetingStatusBadge status={status} />}>
            <OriginTags meeting={meeting} />
          </CardHeader>
          <MeetingHint meeting={meeting} status={status} />
          <Excerpt summary={meeting.notes} preview={null} />
        </button>
      </li>
    );
  }

  const { item, meeting } = entry;
  const duration = formatDuration(item.durationSeconds);
  return (
    <li className="rounded-lg border border-border bg-card">
      <button type="button" onClick={onOpen} className={CARD_BUTTON}>
        <CardHeader
          title={item.eventSubject}
          time={[clock(entry.when), duration].filter(Boolean).join(' · ')}
          badge={<TranscriptionStatusBadge status={item.status} />}
        >
          <OriginTags item={item} meeting={meeting} />
        </CardHeader>
        <Participants names={participantNames(item)} />
        <Excerpt summary={item.summary} preview={item.preview} />
      </button>
      <QueueNotice item={item} canRequest={canRequest} />
    </li>
  );
}

interface CardHeaderProps {
  title: string;
  time: string;
  badge: React.ReactNode;
  children: React.ReactNode;
}

function CardHeader(props: CardHeaderProps) {
  const { title, time, badge, children } = props;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="tabular-nums">{time}</span>
          {children}
        </div>
      </div>
      {badge}
    </div>
  );
}
