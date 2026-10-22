import { useMemo, useState } from 'react';
import { AudioLines, Loader2, RefreshCw, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/contexts/AuthContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useMeetingTranscriptions,
  useProjectTeamsMeetings,
  useSyncTeamsTranscripts,
} from '@/hooks/useMeetingTranscriptions';
import {
  TRANSCRIPTION_WORKER_ENABLED,
  buildMeetingTimeline,
  filterMeetingTimeline,
  groupTimelineByDay,
} from '@/lib/meetingTranscription';
import { LinkedMeetingDialog } from './LinkedMeetingDialog';
import { MeetingTimelineCard } from './MeetingTimelineCard';
import { MeetingTranscriptionDialog } from './MeetingTranscriptionDialog';
import { RequestTranscriptionDialog } from './RequestTranscriptionDialog';
import {
  MEETING_TIMELINE_ENTRY_KIND,
  MEETING_TIMELINE_FILTER,
  type MeetingTimelineEntry,
  type MeetingTimelineFilter,
  type ProjectTeamsMeeting,
} from '@/types/meetingTranscription';

const FILTER_LABEL: Record<MeetingTimelineFilter, string> = {
  [MEETING_TIMELINE_FILTER.TODAS]: 'Todas',
  [MEETING_TIMELINE_FILTER.TRANSCRITAS]: 'Transcritas',
  [MEETING_TIMELINE_FILTER.SEM_RESUMO]: 'Sem resumo',
  [MEETING_TIMELINE_FILTER.PENDENTES]: 'Pendentes',
};

const FILTERS = Object.keys(FILTER_LABEL) as MeetingTimelineFilter[];

type PendingMeetingEntry = Extract<MeetingTimelineEntry, { kind: typeof MEETING_TIMELINE_ENTRY_KIND.REUNIAO }>;

function EmptyState(props: { message: string; hint?: string }) {
  const { message, hint } = props;
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        <AudioLines className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">{message}</p>
        {hint && <p className="max-w-md text-sm text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Não espera o cron de 10 minutos: busca já as transcrições das reuniões vinculadas. */
function SyncNowButton(props: { projectId: string }) {
  const { projectId } = props;
  const { data: meetings } = useProjectTeamsMeetings(projectId);
  const sync = useSyncTeamsTranscripts(projectId);
  if (!meetings?.length) return null;

  const Icon = sync.isPending ? Loader2 : RefreshCw;
  return (
    <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
      <Icon className={`mr-2 h-4 w-4${sync.isPending ? ' animate-spin' : ''}`} aria-hidden="true" />
      Buscar transcrições agora
    </Button>
  );
}

interface ToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  filter: MeetingTimelineFilter;
  onFilter: (value: MeetingTimelineFilter) => void;
  counts: Record<MeetingTimelineFilter, number>;
}

function Toolbar(props: ToolbarProps) {
  const { search, onSearch, filter, onFilter, counts } = props;
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(changed) => onSearch(changed.target.value)}
          placeholder="Buscar no título, no que foi dito ou no resumo"
          aria-label="Buscar nas reuniões do projeto"
          className="pl-9"
        />
      </div>
      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(value) => value && onFilter(value as MeetingTimelineFilter)}
        aria-label="Filtrar reuniões"
        className="flex-wrap justify-start"
      >
        {FILTERS.map((key) => (
          <ToggleGroupItem key={key} value={key} size="sm" className="gap-1.5">
            {FILTER_LABEL[key]}
            <span className="tabular-nums text-muted-foreground">{counts[key]}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

interface TimelineProps {
  entries: MeetingTimelineEntry[];
  canRequest: boolean;
  emptyMessage: string;
  onOpen: (entry: MeetingTimelineEntry) => void;
}

function Timeline(props: TimelineProps) {
  const { entries, canRequest, emptyMessage, onOpen } = props;
  const days = useMemo(() => groupTimelineByDay(entries), [entries]);
  if (!days.length) return <EmptyState message={emptyMessage} />;

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section key={day.label} className="space-y-2" aria-label={day.label}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day.label}</h4>
          <ul className="space-y-2">
            {day.entries.map((entry) => (
              <MeetingTimelineCard key={entry.key} entry={entry} canRequest={canRequest} onOpen={() => onOpen(entry)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function countByFilter(entries: MeetingTimelineEntry[]): Record<MeetingTimelineFilter, number> {
  return Object.fromEntries(
    FILTERS.map((key) => [key, filterMeetingTimeline(entries, key).length]),
  ) as Record<MeetingTimelineFilter, number>;
}

/**
 * Todas as reuniões do projeto numa linha do tempo, ou — com busca — só as transcrições que
 * batem com o termo (no título, no texto ou no resumo).
 */
function useTimeline(projectId: string, search: string) {
  const meetings = useProjectTeamsMeetings(projectId);
  const transcriptions = useMeetingTranscriptions(projectId, search);
  const isSearching = search.trim().length > 0;

  const entries = useMemo(
    () => buildMeetingTimeline(isSearching ? [] : meetings.data ?? [], transcriptions.data ?? []),
    [isSearching, meetings.data, transcriptions.data],
  );
  return {
    entries,
    isLoading: meetings.isLoading || transcriptions.isLoading,
    hasError: Boolean(meetings.error || transcriptions.error),
  };
}

interface OpenState {
  transcriptionId: string | null;
  linkedMeeting: ProjectTeamsMeeting | null;
  pendingMeeting: PendingMeetingEntry | null;
}

const CLOSED: OpenState = { transcriptionId: null, linkedMeeting: null, pendingMeeting: null };

function openStateFor(entry: MeetingTimelineEntry): OpenState {
  if (entry.kind === MEETING_TIMELINE_ENTRY_KIND.REUNIAO) return { ...CLOSED, pendingMeeting: entry };
  return { ...CLOSED, transcriptionId: entry.item.id, linkedMeeting: entry.meeting };
}

function sentRecordingIds(entries: MeetingTimelineEntry[]): Set<string> {
  return new Set(
    entries.flatMap((entry) =>
      entry.kind === MEETING_TIMELINE_ENTRY_KIND.TRANSCRICAO && entry.item.recordingItemId
        ? [entry.item.recordingItemId]
        : [],
    ),
  );
}

interface TimelineBodyProps {
  timeline: ReturnType<typeof useTimeline>;
  filter: MeetingTimelineFilter;
  isSearching: boolean;
  canRequest: boolean;
  onOpen: (entry: MeetingTimelineEntry) => void;
}

function TimelineBody(props: TimelineBodyProps) {
  const { timeline, filter, isSearching, canRequest, onOpen } = props;

  if (timeline.isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  if (timeline.hasError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Não foi possível carregar as reuniões do projeto. Tente de novo em instantes.</AlertDescription>
      </Alert>
    );
  }
  if (!timeline.entries.length && !isSearching) {
    return (
      <EmptyState
        message="Nenhuma reunião vinculada a este projeto."
        hint='Na Agenda, crie a reunião do Teams escolhendo este projeto, ou abra uma que você organizou e use "Vincular a um projeto". A transcrição chega aqui sozinha quando a reunião acaba.'
      />
    );
  }
  return (
    <Timeline
      entries={filterMeetingTimeline(timeline.entries, filter)}
      canRequest={canRequest}
      emptyMessage={isSearching ? 'Nenhuma reunião encontrada para essa busca.' : 'Nenhuma reunião neste filtro.'}
      onOpen={onOpen}
    />
  );
}

interface TabHeaderProps {
  projectId: string;
  canRequest: boolean;
  onRequestRecording: () => void;
}

function TabHeader(props: TabHeaderProps) {
  const { projectId, canRequest, onRequestRecording } = props;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="text-base font-semibold text-foreground">Reuniões</h3>
        <p className="text-sm text-muted-foreground">
          A transcrição das reuniões do Teams vinculadas ao projeto chega aqui sozinha. A equipe
          completa com o resumo.
        </p>
      </div>
      {canRequest && (
        <div className="flex shrink-0 flex-wrap gap-2">
          <SyncNowButton projectId={projectId} />
          {TRANSCRIPTION_WORKER_ENABLED && (
            <Button variant="outline" size="sm" onClick={onRequestRecording}>
              <AudioLines className="mr-2 h-4 w-4" aria-hidden="true" />
              Transcrever gravação
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface ProjectMeetingsTabProps {
  projectId: string;
  /** Pode pedir transcrição e editar título, resumo e notas neste projeto. */
  canRequest: boolean;
  /** GP do projeto (ou quem gere qualquer projeto): remove transcrição e para de acompanhar reunião. */
  canManageProject: boolean;
}

/**
 * Reuniões do projeto numa linha do tempo, com a situação da transcrição de cada uma e o
 * resumo que a equipe trouxe (ADR-0052). A transcrição do Teams chega sozinha; a gravação
 * enviada ao worker (ADR-0039) só aparece com ele no ar.
 */
export function ProjectMeetingsTab(props: ProjectMeetingsTabProps) {
  const { projectId, canRequest, canManageProject } = props;
  const { employee } = useAuth();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [filter, setFilter] = useState<MeetingTimelineFilter>(MEETING_TIMELINE_FILTER.TODAS);
  const [open, setOpen] = useState<OpenState>(CLOSED);
  const [requestOpen, setRequestOpen] = useState(false);

  const isSearching = debouncedSearch.trim().length > 0;
  const timeline = useTimeline(projectId, debouncedSearch);
  const counts = useMemo(() => countByFilter(timeline.entries), [timeline.entries]);
  const canStop = (meeting: ProjectTeamsMeeting | null) =>
    Boolean(meeting) && (canManageProject || meeting?.registeredById === employee?.id);
  const close = (isOpen: boolean) => !isOpen && setOpen(CLOSED);

  return (
    <div className="space-y-4">
      <TabHeader projectId={projectId} canRequest={canRequest} onRequestRecording={() => setRequestOpen(true)} />

      <Toolbar search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} counts={counts} />

      <TimelineBody
        timeline={timeline}
        filter={filter}
        isSearching={isSearching}
        canRequest={canRequest}
        onOpen={(entry) => setOpen(openStateFor(entry))}
      />

      <MeetingTranscriptionDialog
        transcriptionId={open.transcriptionId}
        projectId={projectId}
        canRequest={canRequest}
        canManageProject={canManageProject}
        linkedMeeting={open.linkedMeeting}
        canStopFollowing={canStop(open.linkedMeeting)}
        onOpenChange={close}
      />

      <LinkedMeetingDialog
        meeting={open.pendingMeeting?.meeting ?? null}
        status={open.pendingMeeting?.status ?? null}
        canEdit={canRequest}
        canStop={canStop(open.pendingMeeting?.meeting ?? null)}
        onOpenChange={close}
      />

      {canRequest && TRANSCRIPTION_WORKER_ENABLED && (
        <RequestTranscriptionDialog
          open={requestOpen}
          onOpenChange={setRequestOpen}
          projectId={projectId}
          sentItemIds={sentRecordingIds(timeline.entries)}
        />
      )}
    </div>
  );
}
