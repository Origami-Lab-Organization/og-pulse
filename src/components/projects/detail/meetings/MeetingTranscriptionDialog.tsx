import { useEffect, useId, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BellOff,
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory';
import {
  useDeleteTranscription,
  useMeetingTranscriptionDetail,
  useStopFollowingTeamsMeeting,
  useUpdateMeetingSummary,
  useUpdateTranscriptionSpeakers,
  useUpdateTranscriptionSubject,
} from '@/hooks/useMeetingTranscriptions';
import {
  buildSummaryPrompt,
  downloadTextFile,
  formatDuration,
  groupSegments,
  highlightParts,
  initialsOf,
  meetingTimeRange,
  participantNames,
  speakerDisplayName,
  speakerLabels,
  speechTime,
  transcriptAsText,
  transcriptFileName,
} from '@/lib/meetingTranscription';
import { cn } from '@/lib/utils';
import { MeetingNotesEditor } from './MeetingNotesEditor';
import { TranscriptionStatusBadge } from './TranscriptionStatusBadge';
import {
  MEETING_TRANSCRIPTION_SOURCE,
  MEETING_TRANSCRIPTION_STATUS,
  type MeetingTranscriptionDetail,
  type ProjectTeamsMeeting,
  type SpeakerName,
  type TranscriptBlock,
} from '@/types/meetingTranscription';

const TAB = { RESUMO: 'resumo', TRANSCRICAO: 'transcricao' } as const;

/** Mesma aba sublinhada do detalhe do projeto: o diálogo parece parte da mesma tela. */
const TAB_TRIGGER =
  'relative rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary-deep data-[state=active]:bg-transparent data-[state=active]:text-primary-deep data-[state=active]:shadow-none';

/** Uma cor por pessoa, a mesma no cabeçalho e em cada fala — só tokens do tema. */
const SPEAKER_TONES = [
  'bg-primary/15 text-primary-deep',
  'bg-info-subtle text-info-emphasis',
  'bg-success-subtle text-success-emphasis',
  'bg-warning-subtle text-warning-emphasis',
  'bg-muted text-foreground',
];

const AI_HINT = 'Cole na IA que você usa (ChatGPT, Claude, Copilot) e traga as notas para "Resumo e notas".';

/**
 * Início da transcrição, para mostrar a hora real de cada fala. Só no Teams: na gravação
 * enviada, `occurredAt` é quando o arquivo foi salvo, não quando a conversa começou.
 */
function clockStart(transcription: MeetingTranscriptionDetail): string | null {
  return transcription.source === MEETING_TRANSCRIPTION_SOURCE.TEAMS ? transcription.occurredAt : null;
}

/** Texto inteiro como vai para a IA, para o .txt e para a área de transferência. */
function fullText(transcription: MeetingTranscriptionDetail): string {
  return transcription.segments.length
    ? transcriptAsText(transcription.segments, transcription.speakers, clockStart(transcription))
    : transcription.transcriptText ?? '';
}

/** Instruções de notas por assunto + dados da reunião + transcrição, para colar na IA. */
function promptForAi(transcription: MeetingTranscriptionDetail): string {
  return buildSummaryPrompt({
    subject: transcription.eventSubject,
    when: transcription.occurredAt ?? transcription.createdAt,
    durationSeconds: transcription.durationSeconds,
    participants: participantNames(transcription),
    transcript: fullText(transcription),
  });
}

/** "quinta-feira, 22 de outubro · 08:24–08:26 · 1 min · Teams". */
function metaLine(transcription: MeetingTranscriptionDetail): string {
  const when = transcription.occurredAt ?? transcription.createdAt;
  const isTeams = transcription.source === MEETING_TRANSCRIPTION_SOURCE.TEAMS;
  return [
    format(parseISO(when), "EEEE, d 'de' MMMM", { locale: ptBR }),
    isTeams ? meetingTimeRange(when, transcription.durationSeconds) : null,
    formatDuration(transcription.durationSeconds),
    isTeams ? 'Teams' : `gravação enviada por ${transcription.requestedByName ?? 'alguém da equipe'}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

async function copyToClipboard(text: string, hint?: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    if (hint) toast.success('Copiado.', { description: hint });
    return true;
  } catch {
    toast.error('O navegador não deixou copiar. Use Baixar .txt.');
    return false;
  }
}

function downloadTranscript(transcription: MeetingTranscriptionDetail) {
  downloadTextFile(
    transcriptFileName(transcription.eventSubject, transcription.occurredAt ?? transcription.createdAt),
    fullText(transcription),
  );
}

// ── Pessoas ────────────────────────────────────────────────────────────────────────────────

const AVATAR_SIZE = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs' } as const;

function SpeakerAvatar(props: { name: string; tone: string; size?: keyof typeof AVATAR_SIZE }) {
  const { name, tone, size = 'md' } = props;
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', AVATAR_SIZE[size], tone)}
    >
      {initialsOf(name)}
    </span>
  );
}

function Participants(props: { names: string[]; toneOf: (name: string) => string }) {
  const { names, toneOf } = props;
  if (!names.length) return null;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Participantes">
      {names.map((name) => (
        <li key={name} className="flex items-center gap-1.5 text-sm text-foreground">
          <SpeakerAvatar name={name} tone={toneOf(name)} size="sm" />
          {name}
        </li>
      ))}
    </ul>
  );
}

// ── Cabeçalho e ações ──────────────────────────────────────────────────────────────────────

function CopyForAiButton(props: { transcription: MeetingTranscriptionDetail; variant?: 'outline' | 'default' }) {
  const { transcription, variant = 'default' } = props;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!(await copyToClipboard(promptForAi(transcription), AI_HINT))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const Icon = copied ? Check : Sparkles;
  return (
    <Button variant={variant} size="sm" onClick={copy}>
      <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
      {copied ? 'Copiado' : 'Copiar para a IA'}
    </Button>
  );
}

interface MoreActionsProps {
  transcription: MeetingTranscriptionDetail;
  canRequest: boolean;
  canManageProject: boolean;
  stopMeetingId: string | null;
  onEditTitle: () => void;
  onRemove: () => void;
}

/** O que se faz de vez em quando fica no menu; remover, por último e com confirmação. */
function MoreActions(props: MoreActionsProps) {
  const { transcription, canRequest, canManageProject, stopMeetingId, onEditTitle, onRemove } = props;
  const stop = useStopFollowingTeamsMeeting();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Mais ações da reunião">
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {canRequest && (
          <DropdownMenuItem onSelect={onEditTitle}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Editar título
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => copyToClipboard(fullText(transcription), 'Transcrição copiada.')}>
          <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
          Copiar transcrição
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => downloadTranscript(transcription)}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Baixar .txt
        </DropdownMenuItem>
        {transcription.recordingWebUrl && (
          <DropdownMenuItem asChild>
            <a href={transcription.recordingWebUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Abrir gravação
            </a>
          </DropdownMenuItem>
        )}
        {(stopMeetingId || canManageProject) && <DropdownMenuSeparator />}
        {stopMeetingId && (
          <DropdownMenuItem onSelect={() => stop.mutate(stopMeetingId)}>
            <BellOff className="mr-2 h-4 w-4" aria-hidden="true" />
            Parar de trazer as próximas
          </DropdownMenuItem>
        )}
        {canManageProject && (
          <DropdownMenuItem onSelect={onRemove} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Remover transcrição
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SubjectEditor(props: { transcription: MeetingTranscriptionDetail; onDone: () => void }) {
  const { transcription, onDone } = props;
  const update = useUpdateTranscriptionSubject(transcription.projectId);
  const [draft, setDraft] = useState(transcription.eventSubject);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        autoFocus
        aria-label="Título da reunião"
        value={draft}
        maxLength={400}
        onChange={(changed) => setDraft(changed.target.value)}
      />
      <div className="flex shrink-0 justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onDone} disabled={update.isPending}>
          Cancelar
        </Button>
        <Button
          size="sm"
          disabled={update.isPending || !draft.trim()}
          onClick={() => update.mutate({ id: transcription.id, eventSubject: draft }, { onSuccess: onDone })}
        >
          {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

function StatusNotice(props: { transcription: MeetingTranscriptionDetail }) {
  const { transcription } = props;
  if (transcription.status === MEETING_TRANSCRIPTION_STATUS.CONCLUIDA) return null;

  if (transcription.status === MEETING_TRANSCRIPTION_STATUS.FALHOU) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {transcription.lastError ?? 'A transcrição não foi concluída.'} Use "Pedir de novo" na
          lista de reuniões.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="info">
      <AlertDescription>
        A transcrição ainda não terminou. Quem pediu recebe um aviso no sino quando ela ficar pronta.
      </AlertDescription>
    </Alert>
  );
}

// ── Resumo ─────────────────────────────────────────────────────────────────────────────────

function SummaryTab(props: { transcription: MeetingTranscriptionDetail; canRequest: boolean }) {
  const { transcription, canRequest } = props;
  const save = useUpdateMeetingSummary(transcription.projectId);

  return (
    <MeetingNotesEditor
      recordId={transcription.id}
      value={transcription.summary}
      updatedAt={transcription.summaryUpdatedAt}
      updatedByName={transcription.summaryUpdatedByName}
      canEdit={canRequest}
      isSaving={save.isPending}
      onSave={(summary, done) => save.mutate({ id: transcription.id, summary }, { onSuccess: done })}
      emptyState={
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Sem resumo ainda</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>"Copiar para a IA" leva a transcrição com as instruções para notas por assunto.</li>
            <li>Cole na IA que você usa — ChatGPT, Claude, Copilot.</li>
            <li>Traga as notas que ela devolver para cá, ou importe o arquivo .md/.txt.</li>
          </ol>
          <CopyForAiButton transcription={transcription} variant="outline" />
        </div>
      }
    />
  );
}

// ── Transcrição ────────────────────────────────────────────────────────────────────────────

/**
 * A gravação enviada separa as vozes, mas não sabe de quem são. Quem participou dá o nome — o
 * Pulse não adivinha (ADR-0039). A do Teams já vem com nomes.
 */
function SpeakersEditor(props: { transcription: MeetingTranscriptionDetail; labels: string[] }) {
  const { transcription, labels } = props;
  const update = useUpdateTranscriptionSpeakers(transcription.projectId);
  const { data: directory = [] } = useEmployeeDirectory();
  const listId = useId();
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    setNames(Object.fromEntries(transcription.speakers.map((speaker) => [speaker.label, speaker.name])));
  }, [transcription.id, transcription.speakers]);

  const save = () => {
    const speakers: SpeakerName[] = labels.map((label) => ({ label, name: names[label] ?? '' }));
    update.mutate({ id: transcription.id, speakers });
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
      <div>
        <p className="text-sm font-medium text-foreground">Quem falou</p>
        <p className="text-sm text-muted-foreground">
          A transcrição separa as vozes, mas não sabe de quem são. Dê o nome de cada uma.
        </p>
      </div>
      <datalist id={listId}>
        {directory.map((entry) => (
          <option key={entry.id} value={entry.nome} />
        ))}
      </datalist>
      <div className="grid gap-3 sm:grid-cols-2">
        {labels.map((label, index) => (
          <div key={label} className="space-y-1">
            <Label htmlFor={`${listId}-${label}`}>Voz {index + 1}</Label>
            <Input
              id={`${listId}-${label}`}
              list={listId}
              value={names[label] ?? ''}
              maxLength={120}
              placeholder="Nome de quem falou"
              onChange={(changed) => setNames((previous) => ({ ...previous, [label]: changed.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={update.isPending}>
          {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Salvar nomes
        </Button>
      </div>
    </div>
  );
}

function Highlighted(props: { text: string; term: string }) {
  return (
    <>
      {highlightParts(props.text, props.term).map((part, index) =>
        part.match ? (
          <mark key={index} className="rounded bg-warning-subtle px-0.5 text-foreground">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

function blockMatches(block: TranscriptBlock, who: string, term: string): boolean {
  return highlightParts(`${who} ${block.text}`, term).some((part) => part.match);
}

interface TranscriptBodyProps {
  transcription: MeetingTranscriptionDetail;
  labels: string[];
  term: string;
  toneOf: (name: string) => string;
}

function TranscriptBody(props: TranscriptBodyProps) {
  const { transcription, labels, term, toneOf } = props;
  const blocks = useMemo(() => groupSegments(transcription.segments), [transcription.segments]);
  const start = clockStart(transcription);
  const nameOf = (block: TranscriptBlock) => speakerDisplayName(block.speaker, transcription.speakers, labels);
  const visible = term.trim() ? blocks.filter((block) => blockMatches(block, nameOf(block), term)) : blocks;

  if (!blocks.length) {
    return transcription.transcriptText ? (
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
        {transcription.transcriptText}
      </p>
    ) : null;
  }
  if (!visible.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nada encontrado para "{term.trim()}".</p>;
  }

  return (
    <ol className="space-y-5">
      {visible.map((block) => {
        const name = nameOf(block);
        return (
          <li key={`${block.start}-${block.speaker ?? ''}`} className="flex gap-3">
            <SpeakerAvatar name={name} tone={toneOf(name)} />
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">
                  <Highlighted text={name} term={term} />
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">{speechTime(start, block.start)}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                <Highlighted text={block.text} term={term} />
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

interface TranscriptTabProps {
  transcription: MeetingTranscriptionDetail;
  canRequest: boolean;
  toneOf: (name: string) => string;
}

function TranscriptTab(props: TranscriptTabProps) {
  const { transcription, canRequest, toneOf } = props;
  const [term, setTerm] = useState('');
  const labels = useMemo(() => speakerLabels(transcription.segments), [transcription.segments]);
  const canNameSpeakers =
    canRequest && labels.length > 0 && transcription.source === MEETING_TRANSCRIPTION_SOURCE.GRAVACAO;

  return (
    <>
      <div className="border-b border-border px-6 py-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={term}
            onChange={(changed) => setTerm(changed.target.value)}
            placeholder="Buscar nesta reunião"
            aria-label="Buscar no texto da reunião"
            className="pl-9"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {canNameSpeakers && <SpeakersEditor transcription={transcription} labels={labels} />}
        <TranscriptBody transcription={transcription} labels={labels} term={term} toneOf={toneOf} />
      </div>
    </>
  );
}

// ── Diálogo ────────────────────────────────────────────────────────────────────────────────

function RemoveConfirm(props: { id: string; projectId: string; open: boolean; onOpenChange: (open: boolean) => void; onRemoved: () => void }) {
  const { id, projectId, open, onOpenChange, onRemoved } = props;
  const remove = useDeleteTranscription(projectId);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover esta transcrição?</AlertDialogTitle>
          <AlertDialogDescription>
            O texto e o resumo saem do projeto para toda a equipe. Depois que o Teams expira a
            reunião, esta transcrição pode ser o único registro dela.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => remove.mutate(id, { onSuccess: onRemoved })}
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Mesma cor para a mesma pessoa no cabeçalho e nas falas, na ordem em que aparecem. */
function useSpeakerTones(names: string[]) {
  return useMemo(() => {
    const tones = new Map(names.map((name, index) => [name, SPEAKER_TONES[index % SPEAKER_TONES.length]]));
    return (name: string) => tones.get(name) ?? SPEAKER_TONES[SPEAKER_TONES.length - 1];
  }, [names]);
}

interface TranscriptionViewProps {
  transcription: MeetingTranscriptionDetail;
  canRequest: boolean;
  canManageProject: boolean;
  stopMeetingId: string | null;
  onRemoved: () => void;
}

function TranscriptionView(props: TranscriptionViewProps) {
  const { transcription, canRequest, canManageProject, stopMeetingId, onRemoved } = props;
  const names = useMemo(() => participantNames(transcription), [transcription]);
  const toneOf = useSpeakerTones(names);
  const isReady = transcription.status === MEETING_TRANSCRIPTION_STATUS.CONCLUIDA;
  // Abre no resumo quando já existe; só na montagem — salvar não tira a pessoa da aba.
  const [tab, setTab] = useState<string>(() => (transcription.summary ? TAB.RESUMO : TAB.TRANSCRICAO));
  const [editingTitle, setEditingTitle] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <>
      <header className="space-y-3 border-b border-border px-6 pb-4 pt-6">
        <div className="flex items-start justify-between gap-4 pr-8">
          <div className="min-w-0 space-y-1">
            <DialogTitle className="break-words text-xl">{transcription.eventSubject}</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-2">
                {!isReady && <TranscriptionStatusBadge status={transcription.status} />}
                <span className="first-letter:uppercase">{metaLine(transcription)}</span>
              </div>
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isReady && <CopyForAiButton transcription={transcription} />}
            <MoreActions
              transcription={transcription}
              canRequest={canRequest}
              canManageProject={canManageProject}
              stopMeetingId={stopMeetingId}
              onEditTitle={() => setEditingTitle(true)}
              onRemove={() => setConfirmRemove(true)}
            />
          </div>
        </div>
        {editingTitle && <SubjectEditor transcription={transcription} onDone={() => setEditingTitle(false)} />}
        <Participants names={names} toneOf={toneOf} />
        <StatusNotice transcription={transcription} />
      </header>

      {isReady && (
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0 px-6">
            <TabsTrigger value={TAB.TRANSCRICAO} className={TAB_TRIGGER}>
              Transcrição
            </TabsTrigger>
            <TabsTrigger value={TAB.RESUMO} className={TAB_TRIGGER}>
              Resumo e notas
              {transcription.summary && <Badge variant="success" className="ml-2 px-1.5 py-0 text-[10px]">pronto</Badge>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value={TAB.TRANSCRICAO} className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <TranscriptTab transcription={transcription} canRequest={canRequest} toneOf={toneOf} />
          </TabsContent>
          <TabsContent value={TAB.RESUMO} className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <SummaryTab transcription={transcription} canRequest={canRequest} />
          </TabsContent>
        </Tabs>
      )}

      {canManageProject && (
        <RemoveConfirm
          id={transcription.id}
          projectId={transcription.projectId}
          open={confirmRemove}
          onOpenChange={setConfirmRemove}
          onRemoved={onRemoved}
        />
      )}
    </>
  );
}

function LoadingOrError(props: { isLoading: boolean }) {
  return (
    <div className="space-y-3 p-6">
      <DialogTitle className="sr-only">Reunião</DialogTitle>
      {props.isLoading ? (
        <>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-48 w-full" />
        </>
      ) : (
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível abrir esta transcrição. Ela pode ter sido removida do projeto.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface MeetingTranscriptionDialogProps {
  transcriptionId: string | null;
  projectId: string;
  /** Pode pedir transcrição neste projeto: edita título, resumo e nome das vozes. */
  canRequest: boolean;
  /** GP do projeto (ou quem gere qualquer projeto): remove. */
  canManageProject: boolean;
  /** Reunião do Teams de onde veio, se ainda acompanhada, e se quem vê pode parar. */
  linkedMeeting: ProjectTeamsMeeting | null;
  canStopFollowing: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MeetingTranscriptionDialog(props: MeetingTranscriptionDialogProps) {
  const { transcriptionId, canRequest, canManageProject, linkedMeeting, canStopFollowing, onOpenChange } = props;
  const { data: transcription, isLoading } = useMeetingTranscriptionDetail(transcriptionId);
  const stopMeetingId = canStopFollowing ? linkedMeeting?.id ?? null : null;

  return (
    <Dialog open={Boolean(transcriptionId)} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] flex-col gap-0 p-0 sm:max-w-4xl">
        {transcription ? (
          <TranscriptionView
            key={transcription.id}
            transcription={transcription}
            canRequest={canRequest}
            canManageProject={canManageProject}
            stopMeetingId={stopMeetingId}
            onRemoved={() => onOpenChange(false)}
          />
        ) : (
          <LoadingOrError isLoading={isLoading} />
        )}
      </DialogContent>
    </Dialog>
  );
}
