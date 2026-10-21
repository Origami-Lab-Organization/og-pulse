import { NOTE_TAB } from '@/lib/notes.constants';
import type { Note, NoteDraft, NoteTab } from '@/types/note';

/**
 * Regras das notas (ADR-0051). Puras: o painel e o editor consomem, nenhum dos dois decide
 * sozinho a ordem, o título exibido ou em que aba a nota cai.
 */

/** Título da lista: o título, ou a primeira linha do texto, ou "Sem título". */
export function noteDisplayTitle(note: Pick<Note, 'title' | 'content'>): string {
  const title = note.title.trim();
  if (title) return title;
  const firstLine = note.content.trim().split('\n')[0]?.trim();
  return firstLine ? firstLine.slice(0, 80) : 'Sem título';
}

/** Trecho do texto para a lista, numa linha só. */
export function notePreview(content: string, max = 120): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/** Trecho da nota na lista. Sem título, a primeira linha já virou título: o trecho começa depois. */
export function noteListPreview(note: Pick<Note, 'title' | 'content'>): string {
  if (note.title.trim()) return notePreview(note.content);
  return notePreview(note.content.trim().split('\n').slice(1).join('\n'));
}

/** Minhas: as que escrevi. Compartilhadas: as que outra pessoa abriu para mim ou para a empresa. */
export function notesForTab(notes: Note[], tab: NoteTab): Note[] {
  return notes.filter((note) => (tab === NOTE_TAB.MINE ? note.isMine : !note.isMine));
}

/** Fixadas primeiro, depois a mais recente. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((left, right) => {
    if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Busca por título, texto e autor, sem acento e sem caixa. */
export function filterNotes(notes: Note[], term: string): Note[] {
  const wanted = normalize(term.trim());
  if (!wanted) return notes;
  return notes.filter((note) =>
    [note.title, note.content, note.authorName].some((field) => normalize(field).includes(wanted)),
  );
}

/** Nome de arquivo seguro para o caminho do storage: sem barra, sem acento, sem espaço. */
export function safeFileName(name: string): string {
  const cleaned = normalize(name).replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-');
  return cleaned.replace(/^-|-$/g, '') || 'arquivo';
}

/** Com quem a nota está aberta, em uma frase — para a lista e o editor. */
export function shareSummary(note: Pick<Note, 'sharedWithCompany' | 'sharedWith'>): string | null {
  if (note.sharedWithCompany) return 'Aberta para a empresa';
  const count = note.sharedWith.length;
  if (count === 0) return null;
  return count === 1 ? 'Compartilhada com 1 pessoa' : `Compartilhada com ${count} pessoas`;
}

const EMPTY_DRAFT: NoteDraft = { title: '', content: '', sharedWithCompany: false, isPinned: false, sharedWith: [] };

/** Rascunho inicial do editor: a nota como está, ou em branco. */
export function draftFrom(note: Note | null): NoteDraft {
  if (!note) return EMPTY_DRAFT;
  return {
    title: note.title,
    content: note.content,
    sharedWithCompany: note.sharedWithCompany,
    isPinned: note.isPinned,
    sharedWith: note.sharedWith,
  };
}

function sameMembers(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
}

/** Há algo para salvar? Decide o botão Salvar e o aviso de descartar ao voltar. */
export function isDraftDirty(draft: NoteDraft, note: Note | null): boolean {
  const original = draftFrom(note);
  return (
    draft.title !== original.title ||
    draft.content !== original.content ||
    draft.sharedWithCompany !== original.sharedWithCompany ||
    draft.isPinned !== original.isPinned ||
    !sameMembers(draft.sharedWith, original.sharedWith)
  );
}

/** Nota vazia não se salva: precisa de título ou de texto. */
export function hasDraftContent(draft: NoteDraft): boolean {
  return Boolean(draft.title.trim() || draft.content.trim());
}
