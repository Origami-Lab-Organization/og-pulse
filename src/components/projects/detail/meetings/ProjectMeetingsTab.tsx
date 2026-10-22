import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AudioLines, Loader2, RotateCcw, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuth } from '@/contexts/AuthContext';
import {
  useMeetingTranscriptions,
  useProjectTeamsMeetings,
  useRequestTranscription,
} from '@/hooks/useMeetingTranscriptions';
import { formatDuration, groupByLinkedMeeting, isTranscriptionStuck } from '@/lib/meetingTranscription';
import { MeetingTranscriptionDialog } from './MeetingTranscriptionDialog';
import { RequestTranscriptionDialog } from './RequestTranscriptionDialog';
import { TranscriptionStatusBadge } from './TranscriptionStatusBadge';
import { LinkedMeetingCard } from './LinkedMeetingCard';
import {
  MEETING_TRANSCRIPTION_SOURCE,
  MEETING_TRANSCRIPTION_STATUS,
  type MeetingTranscriptionListItem,
} from '@/types/meetingTranscription';

function rowMeta(item: MeetingTranscriptionListItem): string {
  const isTeams = item.source === MEETING_TRANSCRIPTION_SOURCE.TEAMS;
  const origin = isTeams ? 'transcrição do Teams' : 'gravação enviada';
  const who = `${isTeams ? 'vinculada' : 'pedida'} por ${item.requestedByName ?? 'alguém da equipe'}`;
  return [formatDuration(item.durationSeconds), origin, who].filter(Boolean).join(' · ');
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

  return (
    <Button variant="outline" size="sm" onClick={retry} disabled={request.isPending}>
      {request.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      Pedir de novo
    </Button>
  );
}

function RowNotice(props: { item: MeetingTranscriptionListItem; canRequest: boolean }) {
  const { item, canRequest } = props;

  if (item.status === MEETING_TRANSCRIPTION_STATUS.FALHOU) {
    return (
      <div className="flex flex-col gap-2 border-t border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-destructive-emphasis">{item.lastError ?? 'A transcrição não foi concluída.'}</p>
        {canRequest && <RetryButton item={item} />}
      </div>
    );
  }

  if (isTranscriptionStuck(item)) {
    return (
      <p className="border-t border-border px-3 py-2 text-sm text-warning-emphasis">
        Parada há mais tempo que o normal. O serviço de transcrição pode estar fora do ar — avise
        quem cuida do sistema.
      </p>
    );
  }

  return null;
}

interface TranscriptionRowProps {
  item: MeetingTranscriptionListItem;
  canRequest: boolean;
  onOpen: () => void;
}

function TranscriptionRow(props: TranscriptionRowProps) {
  const { item, canRequest, onOpen } = props;
  const when = item.occurredAt ?? item.createdAt;

  return (
    <li className="rounded-lg border border-border">
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-lg p-3 text-left transition-colors hover:bg-muted/50
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-foreground">{item.eventSubject}</p>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {format(parseISO(when), "d 'de' MMM yyyy", { locale: ptBR })}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <TranscriptionStatusBadge status={item.status} />
          <span className="text-xs text-muted-foreground">{rowMeta(item)}</span>
        </div>
      </button>
      <RowNotice item={item} canRequest={canRequest} />
    </li>
  );
}

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

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} className="h-20 w-full" />
      ))}
    </div>
  );
}

function LoadError() {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        Não foi possível carregar as reuniões do projeto. Tente de novo em instantes.
      </AlertDescription>
    </Alert>
  );
}

interface RowsProps {
  items: MeetingTranscriptionListItem[];
  canRequest: boolean;
  onOpen: (id: string) => void;
}

function TranscriptionRows(props: RowsProps) {
  const { items, canRequest, onOpen } = props;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <TranscriptionRow key={item.id} item={item} canRequest={canRequest} onOpen={() => onOpen(item.id)} />
      ))}
    </ul>
  );
}

interface SearchResultsProps {
  projectId: string;
  search: string;
  canRequest: boolean;
  onOpen: (id: string) => void;
}

/** Busca no título e no texto: aí a lista é das transcrições encontradas, não das reuniões. */
function SearchResults(props: SearchResultsProps) {
  const { projectId, search, canRequest, onOpen } = props;
  const { data: items, isLoading, error } = useMeetingTranscriptions(projectId, search);

  if (isLoading) return <LoadingRows />;
  if (error) return <LoadError />;
  if (!items?.length) return <EmptyState message={`Nenhuma reunião encontrada para "${search.trim()}".`} />;
  return <TranscriptionRows items={items} canRequest={canRequest} onOpen={onOpen} />;
}

interface MeetingsOverviewProps {
  projectId: string;
  canRequest: boolean;
  canManageProject: boolean;
  onOpen: (id: string) => void;
}

/**
 * As reuniões vinculadas ao projeto, cada uma com a situação da transcrição — inclusive a que
 * aconteceu e não foi transcrita (ADR-0052). Gravação enviada e reunião que deixou de ser
 * acompanhada ficam embaixo.
 */
function MeetingsOverview(props: MeetingsOverviewProps) {
  const { projectId, canRequest, canManageProject, onOpen } = props;
  const { employee } = useAuth();
  const meetings = useProjectTeamsMeetings(projectId);
  const transcriptions = useMeetingTranscriptions(projectId, '');
  const { groups, others } = useMemo(
    () => groupByLinkedMeeting(meetings.data ?? [], transcriptions.data ?? []),
    [meetings.data, transcriptions.data],
  );

  if (meetings.isLoading || transcriptions.isLoading) return <LoadingRows />;
  if (meetings.error || transcriptions.error) return <LoadError />;
  if (!groups.length && !others.length) {
    return (
      <EmptyState
        message="Nenhuma reunião vinculada a este projeto."
        hint='Na Agenda, crie a reunião do Teams escolhendo este projeto, ou abra uma que você organizou e use "Vincular a um projeto". Ela aparece aqui, e a transcrição chega sozinha quando a reunião acabar.'
      />
    );
  }

  return (
    <div className="space-y-6">
      {groups.length > 0 && (
        <ul className="space-y-2" aria-label="Reuniões do Teams vinculadas">
          {groups.map((group) => (
            <LinkedMeetingCard
              key={group.meeting.id}
              group={group}
              canStop={canManageProject || group.meeting.registeredById === employee?.id}
              onOpenTranscription={onOpen}
            />
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <section className="space-y-2" aria-labelledby="other-transcriptions-title">
          <div>
            <h4 id="other-transcriptions-title" className="text-sm font-semibold text-foreground">
              Outras transcrições
            </h4>
            <p className="text-sm text-muted-foreground">
              Gravações enviadas por Transcrever gravação e reuniões que deixaram de ser acompanhadas.
            </p>
          </div>
          <TranscriptionRows items={others} canRequest={canRequest} onOpen={onOpen} />
        </section>
      )}
    </div>
  );
}

interface ProjectMeetingsTabProps {
  projectId: string;
  /** Pode pedir transcrição e dar nome às vozes neste projeto. */
  canRequest: boolean;
  /** GP do projeto (ou quem gere qualquer projeto): remove transcrição e para de acompanhar reunião. */
  canManageProject: boolean;
}

/**
 * Reuniões do projeto e a transcrição de cada uma: a do próprio Teams, que chega sozinha
 * (ADR-0052), ou a de gravação do OneDrive enviada ao worker (ADR-0039, plano B).
 */
export function ProjectMeetingsTab(props: ProjectMeetingsTabProps) {
  const { projectId, canRequest, canManageProject } = props;
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [openId, setOpenId] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  const all = useMeetingTranscriptions(projectId, '');
  const sentItemIds = useMemo(
    () => new Set((all.data ?? []).flatMap((item) => (item.recordingItemId ? [item.recordingItemId] : []))),
    [all.data],
  );
  const isSearching = debouncedSearch.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Reuniões</h3>
          <p className="text-sm text-muted-foreground">
            Reuniões do Teams vinculadas ao projeto e a transcrição de cada uma, que chega sozinha
            depois que a reunião acaba. Para uma gravação avulsa do OneDrive, use Transcrever gravação.
          </p>
        </div>
        {canRequest && (
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setRequestOpen(true)}>
            <AudioLines className="mr-2 h-4 w-4" aria-hidden="true" />
            Transcrever gravação
          </Button>
        )}
      </div>

      {(all.data?.length ?? 0) > 0 && (
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(changed) => setSearch(changed.target.value)}
            placeholder="Buscar no título ou no que foi dito"
            aria-label="Buscar nas reuniões do projeto"
            className="pl-9"
          />
        </div>
      )}

      {isSearching ? (
        <SearchResults projectId={projectId} search={debouncedSearch} canRequest={canRequest} onOpen={setOpenId} />
      ) : (
        <MeetingsOverview
          projectId={projectId}
          canRequest={canRequest}
          canManageProject={canManageProject}
          onOpen={setOpenId}
        />
      )}

      <MeetingTranscriptionDialog
        transcriptionId={openId}
        projectId={projectId}
        canRequest={canRequest}
        canManageProject={canManageProject}
        onOpenChange={(open) => !open && setOpenId(null)}
      />

      {canRequest && (
        <RequestTranscriptionDialog
          open={requestOpen}
          onOpenChange={setRequestOpen}
          projectId={projectId}
          sentItemIds={sentItemIds}
        />
      )}
    </div>
  );
}
