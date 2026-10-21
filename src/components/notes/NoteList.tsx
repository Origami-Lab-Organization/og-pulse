import { useMemo, useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NotebookPen, Paperclip, Pin, Plus, Search, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NOTE_TAB } from '@/lib/notes.constants';
import { filterNotes, noteDisplayTitle, noteListPreview, notesForTab, shareSummary, sortNotes } from '@/lib/notes';
import type { Note, NoteTab } from '@/types/note';

const EMPTY_MESSAGE: Record<NoteTab, string> = {
  [NOTE_TAB.MINE]: 'Você ainda não tem notas. Use "Nova nota" para anotar algo.',
  [NOTE_TAB.SHARED]: 'Ninguém compartilhou uma nota com você ainda.',
};

/** "de Fulano" nas compartilhadas; com quem está aberta, nas minhas. */
function noteContext(note: Note): string | null {
  return note.isMine ? shareSummary(note) : `de ${note.authorName}`;
}

interface NoteRowProps {
  note: Note;
  onOpen: () => void;
}

function NoteRow(props: NoteRowProps) {
  const { note, onOpen } = props;
  const context = noteContext(note);
  const preview = noteListPreview(note);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-md border border-border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {note.isPinned && note.isMine && <Pin className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Fixada" />}
          <span className="truncate">{noteDisplayTitle(note)}</span>
        </p>
        {preview && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{preview}</p>}
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span>{formatDistanceToNow(parseISO(note.updatedAt), { addSuffix: true, locale: ptBR })}</span>
          {context && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden="true" />
              {context}
            </span>
          )}
          {note.attachments.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="h-3 w-3" aria-hidden="true" />
              {note.attachments.length}
            </span>
          )}
        </p>
      </button>
    </li>
  );
}

interface NoteListBodyProps {
  notes: Note[];
  tab: NoteTab;
  isLoading: boolean;
  hasError: boolean;
  onOpen: (noteId: string) => void;
}

function NoteListBody(props: NoteListBodyProps) {
  const { notes, tab, isLoading, hasError, onOpen } = props;
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (hasError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Não foi possível carregar as notas. Feche e abra de novo em instantes.</AlertDescription>
      </Alert>
    );
  }
  if (!notes.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <NotebookPen className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        <p className="max-w-[16rem] text-sm text-muted-foreground">{EMPTY_MESSAGE[tab]}</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {notes.map((note) => (
        <NoteRow key={note.id} note={note} onOpen={() => onOpen(note.id)} />
      ))}
    </ul>
  );
}

interface NoteListProps {
  notes: Note[];
  isLoading: boolean;
  hasError: boolean;
  onOpen: (noteId: string) => void;
  onNew: () => void;
}

/** Lista do painel: as minhas e as compartilhadas comigo, com busca. */
export function NoteList(props: NoteListProps) {
  const { notes, isLoading, hasError, onOpen, onNew } = props;
  const [tab, setTab] = useState<NoteTab>(NOTE_TAB.MINE);
  const [search, setSearch] = useState('');

  const visible = useMemo(() => sortNotes(filterNotes(notesForTab(notes, tab), search)), [notes, tab, search]);
  const sharedCount = useMemo(() => notesForTab(notes, NOTE_TAB.SHARED).length, [notes]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="space-y-1 border-b border-border px-5 pb-4 pr-12 pt-5 text-left">
        <div className="flex items-center justify-between gap-2">
          <SheetTitle>Notas</SheetTitle>
          <Button size="sm" onClick={onNew}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Nova nota
          </Button>
        </div>
        <SheetDescription>Anotações suas, e as que o time compartilhou com você.</SheetDescription>
      </SheetHeader>

      <div className="space-y-3 border-b border-border px-5 py-3">
        <Tabs value={tab} onValueChange={(next) => setTab(next as NoteTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value={NOTE_TAB.MINE}>Minhas</TabsTrigger>
            <TabsTrigger value={NOTE_TAB.SHARED}>
              Compartilhadas{sharedCount > 0 ? ` (${sharedCount})` : ''}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(changed) => setSearch(changed.target.value)}
            placeholder="Buscar nas notas"
            aria-label="Buscar nas notas"
            className="pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        <NoteListBody notes={visible} tab={tab} isLoading={isLoading} hasError={hasError} onOpen={onOpen} />
      </div>
    </div>
  );
}
