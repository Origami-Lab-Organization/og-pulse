import { supabase } from '@/integrations/supabase/client';

/**
 * Anexos do registro de atividade de prospecção. Bucket privado, acesso por capacidade.
 *
 * Espelha `src/lib/leadAttachments.ts` de propósito: mesmo limite, mesmos tipos e mesma
 * convenção de path. Dois módulos com regras diferentes para a mesma coisa é como um dos
 * dois envelhece sem ninguém notar.
 */
export const PROSPECT_ATTACHMENTS_BUCKET = 'prospect-attachments';
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];
export const ALLOWED_ATTACHMENT_LABEL = 'PDF, PNG, JPG ou WebP até 10 MB';

export interface ProspectAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

/** Valida tipo e tamanho. Devolve a frase de erro, ou null quando o arquivo serve. */
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

/**
 * Sobe um anexo e devolve os metadados que ficam na atividade.
 *
 * O 1º segmento do path é o `tenant_id`: é dele que a policy de storage lê o tenant, então
 * a ordem dos segmentos não é estética.
 */
export async function uploadProspectAttachment(
  file: File,
  opts: { tenantId: string; prospectId: string },
): Promise<ProspectAttachment> {
  const erro = validateAttachment(file);
  if (erro) throw new Error(erro);

  const path = `${opts.tenantId}/${opts.prospectId}/${crypto.randomUUID()}-${sanitizeName(file.name)}`;
  const { error } = await supabase.storage
    .from(PROSPECT_ATTACHMENTS_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;

  return { path, name: file.name, size: file.size, type: file.type };
}

/** URL assinada de curta duração — a RLS continua sendo aplicada no SELECT do storage. */
export async function getProspectAttachmentUrl(path: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PROSPECT_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) throw error ?? new Error('Não foi possível gerar o link.');
  return data.signedUrl;
}

/**
 * Apaga arquivos do bucket. Chamado DEPOIS de a atividade já ter sido salva sem eles:
 * apagar antes deixaria a linha do tempo apontando para arquivo inexistente se o update
 * falhasse — e arquivo órfão é menos grave que anexo quebrado.
 */
export async function deleteProspectAttachments(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PROSPECT_ATTACHMENTS_BUCKET).remove(paths);
  if (error) throw error;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
