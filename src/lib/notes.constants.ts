/** Limites das notas — os mesmos CHECKs e o mesmo bucket de 20261021170000 (ADR-0051). */
export const NOTE_TITLE_MAX = 200;
export const NOTE_CONTENT_MAX = 50000;
export const NOTE_ATTACHMENTS_BUCKET = 'note-attachments';
export const NOTE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const NOTE_ATTACHMENT_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip';

/** Parâmetro da URL que abre uma nota direto — vem da notificação de compartilhamento. */
export const NOTE_URL_PARAM = 'nota';

export const NOTE_TAB = {
  MINE: 'minhas',
  SHARED: 'compartilhadas',
} as const;

/** Qual confirmação o editor está pedindo. */
export const NOTE_CONFIRM = {
  DISCARD: 'descartar',
  DELETE: 'apagar',
} as const;
