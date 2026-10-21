import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteForm, NoteReader } from '@/components/notes/NoteEditor';
import { NoteList } from '@/components/notes/NoteList';
import { useNotes } from '@/hooks/useNotes';
import type { Note } from '@/types/note';

/** Nota nova no editor. */
const NEW_NOTE = 'nova';

interface MissingNoteProps {
  isFetching: boolean;
  onBack: () => void;
}

/** A nota pedida não está na lista: ainda chegando, ou não é mais visível para quem abriu. */
function MissingNote(props: MissingNoteProps) {
  const { isFetching, onBack } = props;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="space-y-1 border-b border-border px-5 pb-4 pr-12 pt-5 text-left">
        <SheetTitle>Nota</SheetTitle>
        <SheetDescription>
          {isFetching ? 'Carregando a nota…' : 'Esta nota foi apagada ou não está mais compartilhada com você.'}
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-3 px-5 py-4">
        {isFetching ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Ver as notas
          </Button>
        )}
      </div>
    </div>
  );
}

interface PanelBodyProps {
  editing: string | null;
  notes: Note[];
  isLoading: boolean;
  isFetching: boolean;
  hasError: boolean;
  onEdit: (noteId: string | null) => void;
}

function PanelBody(props: PanelBodyProps) {
  const { editing, notes, isLoading, isFetching, hasError, onEdit } = props;
  const backToList = () => onEdit(null);

  if (!editing) {
    return (
      <NoteList
        notes={notes}
        isLoading={isLoading}
        hasError={hasError}
        onOpen={onEdit}
        onNew={() => onEdit(NEW_NOTE)}
      />
    );
  }
  if (editing === NEW_NOTE) return <NoteForm note={null} onBack={backToList} onSaved={onEdit} />;

  const note = notes.find((candidate) => candidate.id === editing);
  if (!note) return <MissingNote isFetching={isLoading || isFetching} onBack={backToList} />;
  return note.isMine ? (
    <NoteForm key={note.id} note={note} onBack={backToList} onSaved={onEdit} />
  ) : (
    <NoteReader note={note} onBack={backToList} />
  );
}

interface NotesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Abre direto nesta nota — vem da notificação de compartilhamento. */
  focusNoteId: string | null;
  onFocusHandled: () => void;
}

/** Painel lateral das notas (ADR-0051): lista, edição da própria nota e leitura das recebidas. */
export function NotesPanel(props: NotesPanelProps) {
  const { open, onOpenChange, focusNoteId, onFocusHandled } = props;
  const { data: notes = [], isLoading, isFetching, error } = useNotes(open);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !focusNoteId) return;
    setEditing(focusNoteId);
    onFocusHandled();
  }, [open, focusNoteId, onFocusHandled]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <PanelBody
          editing={editing}
          notes={notes}
          isLoading={isLoading}
          isFetching={isFetching}
          hasError={Boolean(error)}
          onEdit={setEditing}
        />
      </SheetContent>
    </Sheet>
  );
}
