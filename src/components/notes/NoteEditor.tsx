import { useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { NoteAttachments } from '@/components/notes/NoteAttachments';
import { NoteSharePicker } from '@/components/notes/NoteSharePicker';
import { useDeleteNote, useSaveNote } from '@/hooks/useNotes';
import { NOTE_CONFIRM, NOTE_CONTENT_MAX, NOTE_TITLE_MAX } from '@/lib/notes.constants';
import { draftFrom, hasDraftContent, isDraftDirty, noteDisplayTitle } from '@/lib/notes';
import type { Note, NoteConfirm, NoteDraft } from '@/types/note';

interface EditorHeaderProps {
  title: string;
  description: string;
  onBack: () => void;
}

function EditorHeader(props: EditorHeaderProps) {
  const { title, description, onBack } = props;
  return (
    <SheetHeader className="space-y-1 border-b border-border px-5 pb-4 pr-12 pt-5 text-left">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Notas
      </Button>
      <SheetTitle className="truncate">{title}</SheetTitle>
      <SheetDescription>{description}</SheetDescription>
    </SheetHeader>
  );
}

interface SwitchRowProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function SwitchRow(props: SwitchRowProps) {
  const { id, label, checked, onChange } = props;
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="font-normal leading-snug">{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function ConfirmDialog(props: ConfirmDialogProps) {
  const { open, title, description, confirmLabel, onOpenChange, onConfirm } = props;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface NoteFormProps {
  /** Nula = nota nova. */
  note: Note | null;
  onBack: () => void;
  onSaved: (noteId: string) => void;
}

/** Edição da própria nota: texto, fixar, compartilhar e anexos. */
export function NoteForm(props: NoteFormProps) {
  const { note, onBack, onSaved } = props;
  const save = useSaveNote();
  const remove = useDeleteNote();
  const [draft, setDraft] = useState<NoteDraft>(() => draftFrom(note));
  const [confirm, setConfirm] = useState<NoteConfirm | null>(null);

  const dirty = isDraftDirty(draft, note);
  const update = (patch: Partial<NoteDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const handleBack = () => (dirty ? setConfirm(NOTE_CONFIRM.DISCARD) : onBack());
  const handleSave = () => save.mutate({ note: note ?? undefined, draft }, { onSuccess: onSaved });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorHeader
        title={note ? 'Editar nota' : 'Nova nota'}
        description="Só você edita. Quem recebe a nota lê."
        onBack={handleBack}
      />

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="space-y-2">
          <Input
            value={draft.title}
            onChange={(changed) => update({ title: changed.target.value })}
            maxLength={NOTE_TITLE_MAX}
            placeholder="Título"
            aria-label="Título da nota"
          />
          <Textarea
            value={draft.content}
            onChange={(changed) => update({ content: changed.target.value })}
            maxLength={NOTE_CONTENT_MAX}
            rows={12}
            placeholder="Escreva aqui…"
            aria-label="Texto da nota"
          />
        </div>

        <SwitchRow
          id="note-pinned"
          label="Fixar no topo das minhas notas"
          checked={draft.isPinned}
          onChange={(checked) => update({ isPinned: checked })}
        />

        <div className="space-y-3 rounded-md border border-border p-3">
          <p className="ui-label">Compartilhar</p>
          <SwitchRow
            id="note-company"
            label="Abrir para toda a empresa"
            checked={draft.sharedWithCompany}
            onChange={(checked) => update({ sharedWithCompany: checked })}
          />
          <NoteSharePicker value={draft.sharedWith} onChange={(sharedWith) => update({ sharedWith })} />
          <p className="text-xs text-muted-foreground">
            Quem recebe lê, mas não edita. Ao compartilhar com uma pessoa, ela é avisada no sino.
          </p>
        </div>

        {note ? (
          <NoteAttachments note={note} />
        ) : (
          <p className="text-xs text-muted-foreground">Salve a nota para anexar arquivos.</p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border px-5 py-3">
        {note && (
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setConfirm(NOTE_CONFIRM.DELETE)}
            disabled={remove.isPending}
          >
            <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Apagar
          </Button>
        )}
        <Button className="ml-auto" onClick={handleSave} disabled={!dirty || !hasDraftContent(draft) || save.isPending}>
          {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
          Salvar
        </Button>
      </div>

      <ConfirmDialog
        open={confirm === NOTE_CONFIRM.DISCARD}
        title="Descartar as alterações?"
        description="O que você escreveu desde a última vez que salvou será perdido."
        confirmLabel="Descartar"
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={onBack}
      />
      <ConfirmDialog
        open={confirm === NOTE_CONFIRM.DELETE}
        title="Apagar esta nota?"
        description="A nota e os anexos somem para você e para quem a recebeu."
        confirmLabel="Apagar"
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => note && remove.mutate(note, { onSuccess: onBack })}
      />
    </div>
  );
}

interface NoteReaderProps {
  note: Note;
  onBack: () => void;
}

/** Nota de outra pessoa: só leitura. */
export function NoteReader(props: NoteReaderProps) {
  const { note, onBack } = props;
  const updated = formatDistanceToNow(parseISO(note.updatedAt), { addSuffix: true, locale: ptBR });
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorHeader
        title={noteDisplayTitle(note)}
        description={`De ${note.authorName} · atualizada ${updated}. Só quem escreveu edita.`}
        onBack={onBack}
      />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
          {note.content || 'Esta nota não tem texto.'}
        </p>
        <NoteAttachments note={note} />
      </div>
    </div>
  );
}
