import { supabase } from '@/integrations/supabase/client';
import { fetchEmployeeDirectoryMap } from '@/services/employeeDirectoryService';
import { NOTE_ATTACHMENTS_BUCKET } from '@/lib/notes.constants';
import { safeFileName } from '@/lib/notes';
import type { Note, NoteAttachment, NoteAuthor, NoteDraft } from '@/types/note';

/**
 * Notas do cabeçalho (ADR-0051). A autorização é da RLS: `readable_note_ids()` decide o que
 * a pessoa lê, `is_note_author()` decide o que ela escreve. Nada aqui substitui isso.
 */

const NOTE_COLUMNS =
  'id, tenant_id, author_id, title, content, shared_with_company, is_pinned, updated_at, ' +
  'note_shares(employee_id), note_attachments(id, note_id, path, name, size, type)';

interface NoteRow {
  id: string;
  tenant_id: string;
  author_id: string;
  title: string;
  content: string;
  shared_with_company: boolean;
  is_pinned: boolean;
  updated_at: string;
  note_shares: { employee_id: string }[] | null;
  note_attachments: { id: string; note_id: string; path: string; name: string; size: number; type: string }[] | null;
}

function toAttachment(row: NonNullable<NoteRow['note_attachments']>[number]): NoteAttachment {
  return { id: row.id, noteId: row.note_id, path: row.path, name: row.name, size: Number(row.size), type: row.type };
}

function toNote(row: NoteRow, myEmployeeId: string, names: Map<string, string>): Note {
  const isMine = row.author_id === myEmployeeId;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    authorId: row.author_id,
    authorName: names.get(row.author_id) ?? 'Alguém da equipe',
    title: row.title,
    content: row.content,
    sharedWithCompany: row.shared_with_company,
    isPinned: row.is_pinned,
    updatedAt: row.updated_at,
    // Quem recebeu só enxerga a própria linha de compartilhamento: a lista é só do autor.
    sharedWith: isMine ? (row.note_shares ?? []).map((share) => share.employee_id) : [],
    attachments: (row.note_attachments ?? []).map(toAttachment),
    isMine,
  };
}

async function syncShares(noteId: string, wanted: string[], current: string[]): Promise<void> {
  const removed = current.filter((id) => !wanted.includes(id));
  const added = wanted.filter((id) => !current.includes(id));

  if (removed.length) {
    const { error } = await supabase.from('note_shares').delete().eq('note_id', noteId).in('employee_id', removed);
    if (error) throw error;
  }
  if (added.length) {
    // `tenant_id` vem da nota, pelo trigger `note_shares_guard`.
    const { error } = await supabase
      .from('note_shares')
      .insert(added.map((employeeId) => ({ note_id: noteId, employee_id: employeeId })));
    if (error) throw error;
  }
}

export const noteService = {
  async list(myEmployeeId: string): Promise<Note[]> {
    const { data, error } = await supabase.from('notes').select(NOTE_COLUMNS).order('updated_at', { ascending: false });
    if (error) throw error;

    const directory = await fetchEmployeeDirectoryMap();
    const names = new Map([...directory].map(([id, entry]) => [id, entry.nome]));
    return ((data ?? []) as unknown as NoteRow[]).map((row) => toNote(row, myEmployeeId, names));
  },

  async create(draft: NoteDraft, author: NoteAuthor): Promise<string> {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        tenant_id: author.tenantId,
        author_id: author.employeeId,
        title: draft.title.trim(),
        content: draft.content,
        shared_with_company: draft.sharedWithCompany,
        is_pinned: draft.isPinned,
      })
      .select('id')
      .single();
    if (error) throw error;

    await syncShares(data.id, draft.sharedWith, []);
    return data.id;
  },

  async update(noteId: string, draft: NoteDraft, currentShares: string[]): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .update({
        title: draft.title.trim(),
        content: draft.content,
        shared_with_company: draft.sharedWithCompany,
        is_pinned: draft.isPinned,
      })
      .eq('id', noteId);
    if (error) throw error;

    await syncShares(noteId, draft.sharedWith, currentShares);
  },

  /** Os arquivos saem do bucket antes: a linha some em cascata, o objeto não. */
  async remove(note: Note): Promise<void> {
    if (note.attachments.length) {
      await supabase.storage.from(NOTE_ATTACHMENTS_BUCKET).remove(note.attachments.map((file) => file.path));
    }
    const { error } = await supabase.from('notes').delete().eq('id', note.id);
    if (error) throw error;
  },

  async uploadAttachment(note: Pick<Note, 'id' | 'tenantId'>, file: File): Promise<void> {
    const path = `${note.tenantId}/${note.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(NOTE_ATTACHMENTS_BUCKET)
      .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (uploadError) throw uploadError;

    const { error } = await supabase.from('note_attachments').insert({
      note_id: note.id,
      path,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
    });
    if (error) {
      // Sem a linha, o arquivo ficaria órfão no bucket.
      await supabase.storage.from(NOTE_ATTACHMENTS_BUCKET).remove([path]);
      throw error;
    }
  },

  async removeAttachment(attachment: NoteAttachment): Promise<void> {
    const { error: storageError } = await supabase.storage.from(NOTE_ATTACHMENTS_BUCKET).remove([attachment.path]);
    if (storageError) throw storageError;
    const { error } = await supabase.from('note_attachments').delete().eq('id', attachment.id);
    if (error) throw error;
  },

  /** Link de um minuto: o bucket é privado, e quem abre passa pela mesma regra de leitura da nota. */
  async attachmentUrl(attachment: NoteAttachment): Promise<string> {
    const { data, error } = await supabase.storage.from(NOTE_ATTACHMENTS_BUCKET).createSignedUrl(attachment.path, 60);
    if (error) throw error;
    return data.signedUrl;
  },
};
