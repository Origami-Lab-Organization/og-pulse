import { supabase } from '@/integrations/supabase/client';

/** Comprovantes de ajuste de ponto/hora extra. Bucket privado + RLS por tenant. */
export const TIME_ADJUSTMENT_ATTACHMENTS_BUCKET = 'time-adjustment-attachments';
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];
export const ALLOWED_ATTACHMENT_LABEL = 'PDF, PNG, JPG ou WebP até 10 MB';

export interface TimeAdjustmentAttachment {
  path: string;
  name: string;
}

/** Valida tipo e tamanho. Retorna mensagem de erro clara ou null se válido. */
export function validateAttachment(file: File): string | null {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return `"${file.name}": tipo não permitido. Aceitos: ${ALLOWED_ATTACHMENT_LABEL}.`;
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return `"${file.name}": arquivo acima de 10 MB.`;
  }
  return null;
}

function sanitizeName(name: string): string {
  return name.normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(-120) || 'arquivo';
}

/** Faz upload do comprovante para o bucket privado e devolve os metadados a salvar na solicitação. */
export async function uploadTimeAdjustmentAttachment(
  file: File,
  opts: { tenantId: string; employeeId: string },
): Promise<TimeAdjustmentAttachment> {
  const validationError = validateAttachment(file);
  if (validationError) throw new Error(validationError);

  const path = `${opts.tenantId}/${opts.employeeId}/${crypto.randomUUID()}-${sanitizeName(file.name)}`;
  const { error } = await supabase.storage
    .from(TIME_ADJUSTMENT_ATTACHMENTS_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;

  return { path, name: file.name };
}

/** URL assinada de curta duração para download (RLS aplicada no SELECT do storage). */
export async function getTimeAdjustmentAttachmentSignedUrl(path: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(TIME_ADJUSTMENT_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) throw error ?? new Error('Não foi possível gerar o link.');
  return data.signedUrl;
}
