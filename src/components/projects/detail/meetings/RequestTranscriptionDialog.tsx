import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, ChevronRight, FileAudio, Folder, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useDriveChildren } from '@/hooks/useDriveBrowser';
import { describeGraphError } from '@/hooks/useMicrosoftGraph';
import {
  useProjectRitoEvents,
  useRecordingStartFolder,
  useRequestTranscription,
} from '@/hooks/useMeetingTranscriptions';
import {
  isRecordingFile,
  matchRitoForRecording,
  titleFromRecordingName,
} from '@/lib/meetingTranscription';
import type { DriveEntry } from '@/types/microsoftGraph';
import type { ProjectRitoEvent, RecordingFile } from '@/types/meetingTranscription';

interface FolderRef {
  driveId: string;
  id: string;
  name: string;
}

function toRecordingFile(entry: DriveEntry): RecordingFile {
  return {
    driveId: entry.driveId,
    itemId: entry.id,
    name: entry.name,
    webUrl: entry.webUrl,
    lastModifiedAt: entry.lastModifiedAt,
    size: entry.size,
  };
}

/** Pastas para navegar e só os arquivos que o worker transcreve; gravação mais nova primeiro. */
function visibleEntries(entries: DriveEntry[]): DriveEntry[] {
  const folders = entries.filter((entry) => entry.isFolder);
  const recordings = entries
    .filter((entry) => !entry.isFolder && isRecordingFile(entry.name))
    .sort((left, right) => right.lastModifiedAt.localeCompare(left.lastModifiedAt));
  return [...folders, ...recordings];
}

function formatDay(iso: string): string {
  return iso ? format(parseISO(iso), "d 'de' MMM yyyy", { locale: ptBR }) : '';
}

interface RecordingRowProps {
  entry: DriveEntry;
  rito: ProjectRitoEvent | null;
  alreadySent: boolean;
  onOpen: () => void;
}

function RecordingRow(props: RecordingRowProps) {
  const { entry, rito, alreadySent, onOpen } = props;
  const Icon = entry.isFolder ? Folder : FileAudio;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        disabled={alreadySent}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors
                   hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                   disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-foreground">{entry.name}</span>
          {!entry.isFolder && (
            <span className="block text-xs text-muted-foreground">{formatDay(entry.lastModifiedAt)}</span>
          )}
        </span>
        {rito && !alreadySent && <Badge variant="info">Rito do projeto</Badge>}
        {alreadySent && <Badge variant="neutral">Já enviada</Badge>}
        {entry.isFolder && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      </button>
    </li>
  );
}

interface FolderListProps {
  folder: FolderRef;
  ritos: ProjectRitoEvent[];
  sentItemIds: ReadonlySet<string>;
  onEnterFolder: (folder: FolderRef) => void;
  onPick: (file: RecordingFile, rito: ProjectRitoEvent | null) => void;
}

function FolderList(props: FolderListProps) {
  const { folder, ritos, sentItemIds, onEnterFolder, onPick } = props;
  const { data: entries, isLoading, error } = useDriveChildren(folder.driveId, folder.id);
  const visible = useMemo(() => visibleEntries(entries ?? []), [entries]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{describeGraphError(error)}</AlertDescription>
      </Alert>
    );
  }

  if (!visible.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma gravação nesta pasta.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {visible.map((entry) => {
        const rito = entry.isFolder ? null : matchRitoForRecording(entry.name, ritos);
        const open = entry.isFolder
          ? () => onEnterFolder({ driveId: entry.driveId, id: entry.id, name: entry.name })
          : () => onPick(toRecordingFile(entry), rito);
        return (
          <RecordingRow
            key={entry.id}
            entry={entry}
            rito={rito}
            alreadySent={!entry.isFolder && sentItemIds.has(entry.id)}
            onOpen={open}
          />
        );
      })}
    </ul>
  );
}

interface PickerHeaderProps {
  folderName: string;
  canGoBack: boolean;
  showNoRecordingsHint: boolean;
  onBack: () => void;
}

function PickerHeader(props: PickerHeaderProps) {
  const { folderName, canGoBack, showNoRecordingsHint, onBack } = props;

  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        {canGoBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Voltar para a pasta anterior"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        <span className="truncate font-medium text-foreground">{folderName}</span>
      </div>
      {showNoRecordingsHint && (
        <p className="text-sm text-muted-foreground">
          Não achamos a pasta de gravações do Teams no seu OneDrive. Procure a gravação nas pastas abaixo.
        </p>
      )}
    </>
  );
}

interface RecordingPickerProps {
  projectId: string;
  sentItemIds: ReadonlySet<string>;
  onPick: (file: RecordingFile, rito: ProjectRitoEvent | null) => void;
}

/** Começa na pasta de gravações do Teams; dá para subir e procurar em outra pasta. */
function RecordingPicker(props: RecordingPickerProps) {
  const { projectId, sentItemIds, onPick } = props;
  const start = useRecordingStartFolder(true);
  const ritos = useProjectRitoEvents(projectId, true);
  const [stack, setStack] = useState<FolderRef[]>([]);

  if (start.isLoading) return <Skeleton className="h-48 w-full" />;
  if (start.error || !start.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{describeGraphError(start.error)}</AlertDescription>
      </Alert>
    );
  }

  const { folder, isRecordings } = start.data;
  const current = stack[stack.length - 1] ?? { driveId: folder.driveId, id: folder.id, name: folder.name };

  return (
    <div className="space-y-3">
      <PickerHeader
        folderName={current.name}
        canGoBack={stack.length > 0}
        showNoRecordingsHint={!isRecordings && stack.length === 0}
        onBack={() => setStack((previous) => previous.slice(0, -1))}
      />
      <div className="max-h-80 overflow-y-auto rounded-md border border-border p-1">
        <FolderList
          folder={current}
          ritos={ritos.data ?? []}
          sentItemIds={sentItemIds}
          onEnterFolder={(folder) => setStack((previous) => [...previous, folder])}
          onPick={onPick}
        />
      </div>
    </div>
  );
}

interface ConfirmStepProps {
  file: RecordingFile;
  rito: ProjectRitoEvent | null;
  subject: string;
  onSubjectChange: (subject: string) => void;
}

function ConfirmStep(props: ConfirmStepProps) {
  const { file, rito, subject, onSubjectChange } = props;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
        <p className="break-words font-medium text-foreground">{file.name}</p>
        <p className="text-muted-foreground">Gravação de {formatDay(file.lastModifiedAt)}</p>
        {rito && (
          <p className="mt-1 text-muted-foreground">
            Parece ser do rito "{rito.eventTitle}" deste projeto.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="transcription-subject">Título da reunião</Label>
        <Input
          id="transcription-subject"
          value={subject}
          maxLength={400}
          onChange={(changed) => onSubjectChange(changed.target.value)}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        A transcrição fica na aba Reuniões para quem tem acesso a este projeto. A gravação
        continua no seu OneDrive; o Pulse só guarda o texto.
      </p>
    </div>
  );
}

interface Selection {
  file: RecordingFile;
  rito: ProjectRitoEvent | null;
}

interface RequestTranscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Gravações que já têm transcrição neste projeto. */
  sentItemIds: ReadonlySet<string>;
}

/** Escolher a gravação no OneDrive, confirmar o projeto e o título, e enviar. */
export function RequestTranscriptionDialog(props: RequestTranscriptionDialogProps) {
  const { open, onOpenChange, projectId, sentItemIds } = props;
  const request = useRequestTranscription();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [subject, setSubject] = useState('');

  useEffect(() => {
    if (!open) setSelection(null);
  }, [open]);

  const pick = (file: RecordingFile, rito: ProjectRitoEvent | null) => {
    setSelection({ file, rito });
    setSubject(rito?.eventTitle ?? titleFromRecordingName(file.name));
  };

  const submit = () => {
    if (!selection || !subject.trim()) return;
    request.mutate(
      {
        projectId,
        recording: selection.file,
        eventSubject: subject,
        occurredAt: selection.file.lastModifiedAt || null,
        icalUid: selection.rito?.icalUid ?? null,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transcrever gravação</DialogTitle>
          <DialogDescription>
            {selection
              ? 'Confira o título antes de enviar.'
              : 'Escolha a gravação da reunião no seu OneDrive. O Teams guarda as gravações na pasta Gravações.'}
          </DialogDescription>
        </DialogHeader>

        {selection ? (
          <ConfirmStep
            file={selection.file}
            rito={selection.rito}
            subject={subject}
            onSubjectChange={setSubject}
          />
        ) : (
          <RecordingPicker projectId={projectId} sentItemIds={sentItemIds} onPick={pick} />
        )}

        {selection && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelection(null)} disabled={request.isPending}>
              Escolher outra
            </Button>
            <Button variant="gradient" onClick={submit} disabled={request.isPending || !subject.trim()}>
              {request.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Transcrever
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
