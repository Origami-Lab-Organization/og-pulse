import { useEffect, useId, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BellOff, Check, Copy, Download, ExternalLink, Loader2, Pencil, Search, Trash2, Users } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  downloadTextFile,
  formatDuration,
  groupSegments,
  highlightParts,
  participantNames,
  speakerDisplayName,
  speakerLabels,
  speechTime,
  transcriptAsText,
  transcriptFileName,
} from '@/lib/meetingTranscription';
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

/** "quinta-feira, 22 de outubro às 08:24 · 1 min · transcrição do Teams". */
function metaLine(transcription: MeetingTranscriptionDetail): string {
  const when = transcription.occurredAt ?? transcription.createdAt;
  const origin =
    transcription.source === MEETING_TRANSCRIPTION_SOURCE.TEAMS
      ? 'transcrição do Teams'
      : `gravação enviada por ${transcription.requestedByName ?? 'alguém da equipe'}`;
  return [
    format(parseISO(when), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR }),
    formatDuration(transcription.durationSeconds),
    origin,
  ]
    .filter(Boolean)
    .join(' · ');
}

interface SubjectEditorProps {
  transcription: MeetingTranscriptionDetail;
  onDone: () => void;
}

function SubjectEditor(props: SubjectEditorProps) {
  const { transcription, onDone } = props;
  const update = useUpdateTranscriptionSubject(transcription.projectId);
  const [draft, setDraft] = useState(transcription.eventSubject);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
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

interface SpeakersEditorProps {
  transcription: MeetingTranscriptionDetail;
  labels: string[];
}

/**
 * A gravação enviada separa as vozes, mas não sabe de quem são. Quem participou dá o nome — o
 * Pulse não adivinha (ADR-0039). A do Teams já vem com nomes.
 */
function SpeakersEditor(props: SpeakersEditorProps) {
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
}

function TranscriptBody(props: TranscriptBodyProps) {
  const { transcription, labels, term } = props;
  const blocks = useMemo(() => groupSegments(transcription.segments), [transcription.segments]);
  const start = clockStart(transcription);
  const nameOf = (block: TranscriptBlock) => speakerDisplayName(block.speaker, transcription.speakers, labels);
  const visible = term.trim() ? blocks.filter((block) => blockMatches(block, nameOf(block), term)) : blocks;

  if (!blocks.length) {
    return transcription.transcriptText ? (
      <p className="whitespace-pre-wrap break-words text-sm text-foreground">{transcription.transcriptText}</p>
    ) : null;
  }
  if (!visible.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Nada encontrado para "{term.trim()}".</p>;
  }

  return (
    <ol className="space-y-3">
      {visible.map((block) => (
        <li key={`${block.start}-${block.speaker ?? ''}`} className="text-sm">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              <Highlighted text={nameOf(block)} term={term} />
            </span>{' '}
            <span className="tabular-nums">{speechTime(start, block.start)}</span>
          </p>
          <p className="whitespace-pre-wrap break-words text-foreground">
            <Highlighted text={block.text} term={term} />
          </p>
        </li>
      ))}
    </ol>
  );
}

function CopyTranscriptButton(props: { transcription: MeetingTranscriptionDetail; label?: string }) {
  const { transcription, label = 'Copiar' } = props;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText(transcription));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('O navegador não deixou copiar. Use Baixar .txt.');
    }
  };

  const Icon = copied ? Check : Copy;
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
      {copied ? 'Copiado' : label}
    </Button>
  );
}

function TranscriptActions(props: { transcription: MeetingTranscriptionDetail }) {
  const { transcription } = props;
  const download = () =>
    downloadTextFile(
      transcriptFileName(transcription.eventSubject, transcription.occurredAt ?? transcription.createdAt),
      fullText(transcription),
    );

  return (
    <div className="flex flex-wrap gap-2">
      <CopyTranscriptButton transcription={transcription} />
      <Button variant="outline" size="sm" onClick={download}>
        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
        Baixar .txt
      </Button>
      {transcription.recordingWebUrl && (
        <Button asChild variant="outline" size="sm">
          <a href={transcription.recordingWebUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
            Abrir gravação
          </a>
        </Button>
      )}
    </div>
  );
}

function TranscriptTab(props: { transcription: MeetingTranscriptionDetail; canRequest: boolean }) {
  const { transcription, canRequest } = props;
  const [term, setTerm] = useState('');
  const labels = useMemo(() => speakerLabels(transcription.segments), [transcription.segments]);
  const canNameSpeakers =
    canRequest && labels.length > 0 && transcription.source === MEETING_TRANSCRIPTION_SOURCE.GRAVACAO;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
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
        <TranscriptActions transcription={transcription} />
      </div>
      {canNameSpeakers && <SpeakersEditor transcription={transcription} labels={labels} />}
      <TranscriptBody transcription={transcription} labels={labels} term={term} />
    </div>
  );
}

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
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Sem resumo ainda</p>
          <p className="text-sm text-muted-foreground">
            Copie a transcrição, peça à sua IA um resumo com as decisões e os próximos passos, e
            cole aqui — ou importe o arquivo que ela gerou.
          </p>
          <CopyTranscriptButton transcription={transcription} label="Copiar transcrição" />
        </div>
      }
    />
  );
}

function ParticipantChips(props: { names: string[] }) {
  if (!props.names.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      {props.names.map((name) => (
        <Badge key={name} variant="secondary" className="font-normal">
          {name}
        </Badge>
      ))}
    </div>
  );
}

function DetailHeader(props: { transcription: MeetingTranscriptionDetail; canRequest: boolean }) {
  const { transcription, canRequest } = props;
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-2">
      {editing && <SubjectEditor transcription={transcription} onDone={() => setEditing(false)} />}
      <div className="flex flex-wrap items-center gap-2">
        <TranscriptionStatusBadge status={transcription.status} />
        <p className="text-xs text-muted-foreground">{metaLine(transcription)}</p>
        {canRequest && !editing && (
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Editar título
          </Button>
        )}
      </div>
      <ParticipantChips names={participantNames(transcription)} />
    </div>
  );
}

function DetailContent(props: { transcription: MeetingTranscriptionDetail; canRequest: boolean }) {
  const { transcription, canRequest } = props;
  const isReady = transcription.status === MEETING_TRANSCRIPTION_STATUS.CONCLUIDA;
  // Abre no resumo quando já existe. Só na montagem (o pai remonta por reunião, via `key`):
  // salvar o resumo não pode tirar a pessoa da aba em que está.
  const [tab, setTab] = useState<string>(() => (transcription.summary ? TAB.RESUMO : TAB.TRANSCRICAO));

  return (
    <div className="space-y-4">
      <DetailHeader transcription={transcription} canRequest={canRequest} />
      <StatusNotice transcription={transcription} />
      {isReady && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value={TAB.RESUMO}>Resumo e notas</TabsTrigger>
            <TabsTrigger value={TAB.TRANSCRICAO}>Transcrição</TabsTrigger>
          </TabsList>
          <TabsContent value={TAB.RESUMO} className="mt-4">
            <SummaryTab transcription={transcription} canRequest={canRequest} />
          </TabsContent>
          <TabsContent value={TAB.TRANSCRICAO} className="mt-4">
            <TranscriptTab transcription={transcription} canRequest={canRequest} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface DialogStateProps {
  transcription: MeetingTranscriptionDetail | undefined;
  isLoading: boolean;
  hasError: boolean;
  canRequest: boolean;
}

function DialogState(props: DialogStateProps) {
  const { transcription, isLoading, hasError, canRequest } = props;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (hasError || !transcription) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível abrir esta transcrição. Ela pode ter sido removida do projeto.
        </AlertDescription>
      </Alert>
    );
  }

  return <DetailContent key={transcription.id} transcription={transcription} canRequest={canRequest} />;
}

function RemoveTranscriptionButton(props: { id: string; projectId: string; onRemoved: () => void }) {
  const { id, projectId, onRemoved } = props;
  const remove = useDeleteTranscription(projectId);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Remover transcrição
        </Button>
      </AlertDialogTrigger>
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

function StopFollowingButton(props: { meetingId: string }) {
  const stop = useStopFollowingTeamsMeeting();
  return (
    <Button variant="ghost" onClick={() => stop.mutate(props.meetingId)} disabled={stop.isPending}>
      <BellOff className="mr-2 h-4 w-4" aria-hidden="true" />
      Parar de trazer as próximas
    </Button>
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

interface FooterActionsProps {
  transcription: MeetingTranscriptionDetail;
  projectId: string;
  canManageProject: boolean;
  stopMeetingId: string | null;
  onRemoved: () => void;
}

function FooterActions(props: FooterActionsProps) {
  const { transcription, projectId, canManageProject, stopMeetingId, onRemoved } = props;
  if (!stopMeetingId && !canManageProject) return null;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {stopMeetingId && <StopFollowingButton meetingId={stopMeetingId} />}
      {canManageProject && (
        <RemoveTranscriptionButton id={transcription.id} projectId={projectId} onRemoved={onRemoved} />
      )}
    </div>
  );
}

export function MeetingTranscriptionDialog(props: MeetingTranscriptionDialogProps) {
  const { transcriptionId, projectId, canRequest, canManageProject, linkedMeeting, canStopFollowing, onOpenChange } =
    props;
  const { data: transcription, isLoading, error } = useMeetingTranscriptionDetail(transcriptionId);
  const stopMeetingId = canStopFollowing ? linkedMeeting?.id ?? null : null;

  return (
    <Dialog open={Boolean(transcriptionId)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl flex max-h-[90vh] flex-col">
        <DialogHeader>
          <DialogTitle className="pr-6">{transcription?.eventSubject ?? 'Reunião'}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <DialogState
            transcription={transcription}
            isLoading={isLoading}
            hasError={Boolean(error)}
            canRequest={canRequest}
          />
        </div>

        {transcription && (
          <FooterActions
            transcription={transcription}
            projectId={projectId}
            canManageProject={canManageProject}
            stopMeetingId={stopMeetingId}
            onRemoved={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
