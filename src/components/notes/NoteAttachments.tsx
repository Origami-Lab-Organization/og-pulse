import { useRef } from 'react';
import { ExternalLink, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useDeleteNoteAttachment,
  useOpenNoteAttachment,
  useUploadNoteAttachment,
} from '@/hooks/useNotes';
import { NOTE_ATTACHMENT_ACCEPT } from '@/lib/notes.constants';
import type { Note, NoteAttachment } from '@/types/note';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentRowProps {
  attachment: NoteAttachment;
  canEdit: boolean;
}

function AttachmentRow(props: AttachmentRowProps) {
  const { attachment, canEdit } = props;
  const openFile = useOpenNoteAttachment();
  const remove = useDeleteNoteAttachment();

  return (
    <li className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{attachment.name}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatSize(attachment.size)}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        aria-label={`Abrir ${attachment.name}`}
        disabled={openFile.isPending}
        onClick={() => openFile.mutate(attachment)}
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </Button>
      {canEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Remover ${attachment.name}`}
          disabled={remove.isPending}
          onClick={() => remove.mutate(attachment)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </li>
  );
}

interface NoteAttachmentsProps {
  /** Nota já salva — anexo precisa do id dela para a pasta no bucket. */
  note: Note;
}

/** Anexos da nota: quem escreveu sobe e remove; quem recebeu abre. */
export function NoteAttachments(props: NoteAttachmentsProps) {
  const { note } = props;
  const upload = useUploadNoteAttachment();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!note.isMine && note.attachments.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="ui-label">Anexos</p>
      {note.attachments.length > 0 && (
        <ul className="space-y-1.5">
          {note.attachments.map((attachment) => (
            <AttachmentRow key={attachment.id} attachment={attachment} canEdit={note.isMine} />
          ))}
        </ul>
      )}
      {note.isMine && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={NOTE_ATTACHMENT_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) upload.mutate({ note, file });
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Paperclip className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            )}
            Anexar arquivo
          </Button>
          <p className="text-xs text-muted-foreground">PDF, imagem, texto, Office ou ZIP, até 10 MB.</p>
        </>
      )}
    </div>
  );
}
