import { useEffect, useId, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Copy, ExternalLink, Loader2, Pencil, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory';
import {
  useDeleteTranscription,
  useMeetingTranscriptionDetail,
  useUpdateTranscriptionSpeakers,
  useUpdateTranscriptionSubject,
} from '@/hooks/useMeetingTranscriptions';
import {
  formatDuration,
  formatTimestamp,
  groupSegments,
  speakerDisplayName,
  speakerLabels,
  transcriptAsText,
} from '@/lib/meetingTranscription';
import { TranscriptionStatusBadge } from './TranscriptionStatusBadge';
import {
  MEETING_TRANSCRIPTION_SOURCE,
  MEETING_TRANSCRIPTION_STATUS,
  type MeetingTranscriptionDetail,
  type SpeakerName,
} from '@/types/meetingTranscription';

/** "20 de outubro de 2026 · 42 min · pedida por Fulana". */
function metaLine(transcription: MeetingTranscriptionDetail): string {
  const when = transcription.occurredAt ?? transcription.createdAt;
  const parts = [
    format(parseISO(when), "d 'de' MMMM 'de' yyyy", { locale: ptBR }),
    formatDuration(transcription.durationSeconds),
    `pedida por ${transcription.requestedByName ?? 'alguém da equipe'}`,
  ];
  return parts.filter(Boolean).join(' · ');
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
 * O WhisperX separa as vozes, mas não sabe de quem são. Quem participou dá o nome — o
 * Pulse não adivinha (ADR-0039).
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

function TranscriptBody(props: { transcription: MeetingTranscriptionDetail; labels: string[] }) {
  const { transcription, labels } = props;
  const blocks = useMemo(() => groupSegments(transcription.segments), [transcription.segments]);

  if (!blocks.length) {
    return transcription.transcriptText ? (
      <p className="whitespace-pre-wrap break-words text-sm text-foreground">{transcription.transcriptText}</p>
    ) : null;
  }

  return (
    <ol className="space-y-3">
      {blocks.map((block) => (
        <li key={`${block.start}-${block.speaker ?? ''}`} className="text-sm">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {speakerDisplayName(block.speaker, transcription.speakers, labels)}
            </span>{' '}
            <span className="tabular-nums">{formatTimestamp(block.start)}</span>
          </p>
          <p className="whitespace-pre-wrap break-words text-foreground">{block.text}</p>
        </li>
      ))}
    </ol>
  );
}

function CopyTranscriptButton(props: { transcription: MeetingTranscriptionDetail }) {
  const { transcription } = props;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = transcription.segments.length
      ? transcriptAsText(transcription.segments, transcription.speakers)
      : transcription.transcriptText ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('O navegador não deixou copiar. Selecione o texto e copie manualmente.');
    }
  };

  const Icon = copied ? Check : Copy;
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
      {copied ? 'Copiado' : 'Copiar texto'}
    </Button>
  );
}

interface DetailHeaderProps {
  transcription: MeetingTranscriptionDetail;
  canRequest: boolean;
}

function DetailHeader(props: DetailHeaderProps) {
  const { transcription, canRequest } = props;
  const [editing, setEditing] = useState(false);
  const isReady = transcription.status === MEETING_TRANSCRIPTION_STATUS.CONCLUIDA;

  useEffect(() => setEditing(false), [transcription.id]);

  return (
    <div className="space-y-2">
      {editing && <SubjectEditor transcription={transcription} onDone={() => setEditing(false)} />}
      <p className="text-xs text-muted-foreground">{metaLine(transcription)}</p>
      <div className="flex flex-wrap items-center gap-2">
        <TranscriptionStatusBadge status={transcription.status} />
        {isReady && <CopyTranscriptButton transcription={transcription} />}
        {transcription.recordingWebUrl && (
          <Button asChild variant="outline" size="sm">
            <a href={transcription.recordingWebUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Abrir gravação
            </a>
          </Button>
        )}
        {canRequest && !editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Editar título
          </Button>
        )}
      </div>
    </div>
  );
}

function DetailContent(props: { transcription: MeetingTranscriptionDetail; canRequest: boolean }) {
  const { transcription, canRequest } = props;
  const labels = useMemo(() => speakerLabels(transcription.segments), [transcription.segments]);
  // A transcrição do Teams já vem com o nome de quem falou; só a da gravação precisa de nome.
  const canNameSpeakers =
    canRequest && labels.length > 0 && transcription.source === MEETING_TRANSCRIPTION_SOURCE.GRAVACAO;

  return (
    <div className="space-y-4">
      <DetailHeader transcription={transcription} canRequest={canRequest} />
      <StatusNotice transcription={transcription} />
      {canNameSpeakers && <SpeakersEditor transcription={transcription} labels={labels} />}
      <TranscriptBody transcription={transcription} labels={labels} />
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

  return <DetailContent transcription={transcription} canRequest={canRequest} />;
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
            O texto sai do projeto para toda a equipe. A gravação continua no OneDrive enquanto
            o Teams guardar — depois disso, esta transcrição pode ser o único registro da reunião.
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

interface MeetingTranscriptionDialogProps {
  transcriptionId: string | null;
  projectId: string;
  /** Pode pedir transcrição neste projeto: edita título e nome das vozes. */
  canRequest: boolean;
  /** GP do projeto (ou quem gere qualquer projeto): remove. */
  canManageProject: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MeetingTranscriptionDialog(props: MeetingTranscriptionDialogProps) {
  const { transcriptionId, projectId, canRequest, canManageProject, onOpenChange } = props;
  const { data: transcription, isLoading, error } = useMeetingTranscriptionDetail(transcriptionId);

  return (
    <Dialog open={Boolean(transcriptionId)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex max-h-[85vh] flex-col">
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

        {canManageProject && transcription && (
          <div className="flex justify-end">
            <RemoveTranscriptionButton
              id={transcription.id}
              projectId={projectId}
              onRemoved={() => onOpenChange(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
