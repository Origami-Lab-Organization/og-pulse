import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { NOTE_ATTACHMENT_MAX_BYTES } from '@/lib/notes.constants';
import { noteService } from '@/services/noteService';
import type { Note, NoteAttachment, SaveNoteVariables } from '@/types/note';

const NOTES_KEY = 'notes';

/** Notas que a pessoa lê: as dela, as compartilhadas com ela e as abertas para a empresa. */
export function useNotes(enabled: boolean) {
  const { employee } = useAuth();
  return useQuery({
    queryKey: [NOTES_KEY, employee?.id],
    enabled: enabled && Boolean(employee?.id),
    queryFn: () => noteService.list(employee?.id as string),
  });
}

/** Cria ou atualiza; devolve o id da nota salva. */
export function useSaveNote() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async (variables: SaveNoteVariables): Promise<string> => {
      const { note, draft } = variables;
      if (note) {
        await noteService.update(note.id, draft, note.sharedWith);
        return note.id;
      }
      if (!employee?.id || !employee.tenant_id) throw new Error('Sessão sem funcionário identificado.');
      return noteService.create(draft, { tenantId: employee.tenant_id, employeeId: employee.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] });
      toast.success('Nota salva.');
    },
    onError: (error) => toast.error(mensagemParaUsuario(error)),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: Note) => noteService.remove(note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_KEY] });
      toast.success('Nota apagada.');
    },
    onError: (error) => toast.error(mensagemParaUsuario(error, 'Não foi possível apagar a nota. Tente de novo.')),
  });
}

export function useUploadNoteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { note: Pick<Note, 'id' | 'tenantId'>; file: File }) => {
      const { note, file } = variables;
      if (file.size > NOTE_ATTACHMENT_MAX_BYTES) throw new Error('O arquivo passa de 10 MB.');
      return noteService.uploadAttachment(note, file);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [NOTES_KEY] }),
    onError: (error) =>
      toast.error(mensagemParaUsuario(error, 'Não foi possível anexar. Confira o tipo e o tamanho do arquivo.')),
  });
}

export function useDeleteNoteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachment: NoteAttachment) => noteService.removeAttachment(attachment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [NOTES_KEY] }),
    onError: (error) => toast.error(mensagemParaUsuario(error, 'Não foi possível remover o anexo.')),
  });
}

/** Abre o anexo em aba nova, por link temporário do bucket privado. */
export function useOpenNoteAttachment() {
  return useMutation({
    mutationFn: async (attachment: NoteAttachment) => {
      const url = await noteService.attachmentUrl(attachment);
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    onError: (error) => toast.error(mensagemParaUsuario(error, 'Não foi possível abrir o anexo.')),
  });
}
