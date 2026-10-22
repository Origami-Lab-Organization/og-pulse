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
import { useMeetingTranscriptions, useRequestTranscription } from '@/hooks/useMeetingTranscriptions';
import { formatDuration, isTranscriptionStuck } from '@/lib/meetingTranscription';
import { MeetingTranscriptionDialog } from './MeetingTranscriptionDialog';
import { RequestTranscriptionDialog } from './RequestTranscriptionDialog';
import { TranscriptionStatusBadge } from './TranscriptionStatusBadge';
import { TeamsMeetingsSection } from './TeamsMeetingsSection';
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

interface TranscriptionListProps {
  items: MeetingTranscriptionListItem[] | undefined;
  isLoading: boolean;
  hasError: boolean;
  search: string;
  canRequest: boolean;
  onOpen: (id: string) => void;
}

function TranscriptionList(props: TranscriptionListProps) {
  const { items, isLoading, hasError, search, canRequest, onOpen } = props;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (hasError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível carregar as reuniões do projeto. Tente de novo em instantes.
        </AlertDescription>
      </Alert>
    );
  }

  if (!items?.length) {
    return search.trim() ? (
      <EmptyState message={`Nenhuma reunião encontrada para "${search.trim()}".`} />
    ) : (
      <EmptyState
        message="Nenhuma reunião transcrita neste projeto."
        hint="Reunião do Teams vinculada ao projeto traz a transcrição sozinha, alguns minutos depois de acabar. Para uma gravação avulsa, use Transcrever gravação."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <TranscriptionRow key={item.id} item={item} canRequest={canRequest} onOpen={() => onOpen(item.id)} />
      ))}
    </ul>
  );
}

interface ProjectMeetingsTabProps {
  projectId: string;
  /** Pode pedir transcrição e dar nome às vozes neste projeto. */
  canRequest: boolean;
  /** GP do projeto (ou quem gere qualquer projeto): remove transcrição. */
  canManageProject: boolean;
}

/**
 * Reuniões do projeto transcritas: pela transcrição do próprio Teams, que chega sozinha
 * (ADR-0052), ou por gravação do OneDrive enviada ao worker (ADR-0039, plano B).
 */
export function ProjectMeetingsTab(props: ProjectMeetingsTabProps) {
  const { projectId, canRequest, canManageProject } = props;
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [openId, setOpenId] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  const all = useMeetingTranscriptions(projectId, '');
  const filtered = useMeetingTranscriptions(projectId, debouncedSearch);
  const sentItemIds = useMemo(
    () => new Set((all.data ?? []).flatMap((item) => (item.recordingItemId ? [item.recordingItemId] : []))),
    [all.data],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Reuniões</h3>
          <p className="text-sm text-muted-foreground">
            A transcrição das reuniões do Teams vinculadas ao projeto chega aqui sozinha. Para
            uma gravação avulsa do OneDrive, use Transcrever gravação.
          </p>
        </div>
        {canRequest && (
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setRequestOpen(true)}>
            <AudioLines className="mr-2 h-4 w-4" aria-hidden="true" />
            Transcrever gravação
          </Button>
        )}
      </div>

      <TeamsMeetingsSection projectId={projectId} canManageProject={canManageProject} />

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

      <TranscriptionList
        items={filtered.data}
        isLoading={filtered.isLoading}
        hasError={Boolean(filtered.error)}
        search={debouncedSearch}
        canRequest={canRequest}
        onOpen={setOpenId}
      />

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
