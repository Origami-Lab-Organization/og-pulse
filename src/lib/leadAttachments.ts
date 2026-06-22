import { supabase } from '@/integrations/supabase/client';

/** Anexos de comentários de oportunidades (GP-J5 CA-03). Bucket privado + RLS por tenant. */
export const LEAD_ATTACHMENTS_BUCKET = 'lead-attachments';
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];
export const ALLOWED_ATTACHMENT_LABEL = 'PDF, PNG, JPG ou WebP até 10 MB';

export interface LeadAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
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

/** Faz upload de um anexo para o bucket privado e devolve os metadados a guardar no comentário. */
export async function uploadLeadAttachment(
  file: File,
  opts: { tenantId: string; leadId: string },
): Promise<LeadAttachment> {
  const validationError = validateAttachment(file);
  if (validationError) throw new Error(validationError);

  const path = `${opts.tenantId}/${opts.leadId}/${crypto.randomUUID()}-${sanitizeName(file.name)}`;
  const { error } = await supabase.storage
    .from(LEAD_ATTACHMENTS_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;

  return { path, name: file.name, size: file.size, type: file.type };
}

/** URL assinada de curta duração para download (RLS aplicada no SELECT do storage). */
export async function getAttachmentSignedUrl(path: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(LEAD_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) throw error ?? new Error('Não foi possível gerar o link.');
  return data.signedUrl;
}
