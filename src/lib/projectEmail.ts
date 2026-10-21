import { format, parseISO } from 'date-fns';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';

/**
 * Regras de e-mail salvo no projeto (ADR-0047). Tudo aqui é puro — a tela e o hook
 * consomem, e nenhum dos dois reimplementa.
 */

/** Pasta, dentro da raiz do projeto no OneDrive, que recebe os anexos de e-mail. */
export const PROJECT_EMAILS_FOLDER = 'E-mails';

/**
 * Teto do corpo salvo. Imagem embutida chega como data URI (até 2 MB cada, ver
 * `resolveInlineImages`); o banco recusa acima de 5 milhões de caracteres.
 */
export const MAX_STORED_BODY_CHARS = 4_000_000;

/** Teto do resumo — o mesmo da constraint `project_emails_summary_valid`. */
export const MAX_SUMMARY_CHARS = 2000;

const DATA_IMAGE_URI = /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+/gi;

/** Pixel transparente: imagem retirada some sem deixar ícone quebrado. */
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Corpo como vai para o banco. Dentro do teto, intacto — print colado no e-mail é
 * justamente o que costuma registrar a decisão. Acima, as imagens embutidas saem e o
 * texto fica: perder o print é ruim, perder o e-mail inteiro é pior.
 */
export function bodyForStorage(body: string): string {
  if (body.length <= MAX_STORED_BODY_CHARS) return body;
  return body.replace(DATA_IMAGE_URI, TRANSPARENT_PIXEL);
}

/** Caracteres que o OneDrive não aceita em nome de pasta. */
const INVALID_DRIVE_CHARS = /["*:<>?/\\|]/g;
const MAX_FOLDER_SUBJECT_CHARS = 80;

/**
 * Subpasta dos anexos de um e-mail: "2026-10-21 Aprovação do escopo da fase 2".
 * A data na frente ordena as pastas por quando a decisão chegou.
 */
export function attachmentFolderName(receivedAt: string, subject: string): string {
  const day = format(parseISO(receivedAt), 'yyyy-MM-dd');
  const cleanSubject = subject
    .replace(INVALID_DRIVE_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FOLDER_SUBJECT_CHARS)
    .replace(/[.\s]+$/, '');
  return `${day} ${cleanSubject || 'sem assunto'}`;
}

/**
 * Link de anexo só se for https. A `webUrl` vem do Graph na hora de salvar, mas fica
 * gravada numa linha que quem salva também escreve pela API: um `javascript:` ali
 * executaria na nossa origem quando um colega clicasse. O link vale se for https.
 */
export function safeAttachmentUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** Resumo como vai para o banco: vazio é ausência, não texto vazio. */
export function normalizeSummary(summary: string): string | null {
  const trimmed = summary.trim();
  return trimmed ? trimmed.slice(0, MAX_SUMMARY_CHARS) : null;
}

/** Quem salvou e quem gere o projeto editam o resumo e removem — o mesmo da RLS. */
export function canChangeSavedEmail(
  savedById: string,
  currentEmployeeId: string | undefined,
  canManageProject: boolean,
): boolean {
  return canManageProject || (Boolean(currentEmployeeId) && savedById === currentEmployeeId);
}

/** Sem acento e sem caixa: "decisao" acha "Decisão". */
function normalizeForSearch(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Busca da aba E-mails: assunto, resumo e remetente. Termo vazio deixa tudo. */
export function filterProjectEmails<
  T extends { subject: string; summary: string | null; fromName: string | null; fromAddress: string | null },
>(emails: T[], term: string): T[] {
  const wanted = normalizeForSearch(term.trim());
  if (!wanted) return emails;
  return emails.filter((email) =>
    [email.subject, email.summary, email.fromName, email.fromAddress].some(
      (field) => field && normalizeForSearch(field).includes(wanted),
    ),
  );
}

const PG_UNIQUE_VIOLATION = '23505';
const PG_CHECK_VIOLATION = '23514';

/** Frase do erro ao salvar, com os dois casos que a pessoa consegue resolver sozinha. */
export function saveEmailErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === PG_UNIQUE_VIOLATION) return 'Este e-mail já está salvo neste projeto.';
  if (code === PG_CHECK_VIOLATION) {
    return 'O e-mail é grande demais para ser salvo. Encaminhe só a parte da decisão e salve o encaminhamento.';
  }
  return mensagemParaUsuario(error);
}
