import type { NOTE_CONFIRM, NOTE_TAB } from '@/lib/notes.constants';

/** Notas do cabeçalho (ADR-0051). */

export interface NoteAttachment {
  id: string;
  noteId: string;
  /** Caminho no bucket note-attachments: {tenant_id}/{note_id}/{uuid}-{arquivo}. */
  path: string;
  name: string;
  size: number;
  type: string;
}

export interface Note {
  id: string;
  tenantId: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  sharedWithCompany: boolean;
  isPinned: boolean;
  updatedAt: string;
  /** Pessoas com quem foi compartilhada. Só quem escreveu recebe a lista. */
  sharedWith: string[];
  attachments: NoteAttachment[];
  /** Quem está vendo escreveu a nota — o único que edita. */
  isMine: boolean;
}

/** O que o editor manda salvar. */
export interface NoteDraft {
  title: string;
  content: string;
  sharedWithCompany: boolean;
  isPinned: boolean;
  sharedWith: string[];
}

export type NoteTab = (typeof NOTE_TAB)[keyof typeof NOTE_TAB];

/** Quem cria a nota: a pessoa logada, na empresa dela. */
export interface NoteAuthor {
  tenantId: string;
  employeeId: string;
}

export interface SaveNoteVariables {
  /** Ausente = nota nova. */
  note?: Note;
  draft: NoteDraft;
}

export type NoteConfirm = (typeof NOTE_CONFIRM)[keyof typeof NOTE_CONFIRM];
