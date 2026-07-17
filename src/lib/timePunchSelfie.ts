import { supabase } from '@/integrations/supabase/client';

/** Selfie opcional capturada no registro de ponto. Bucket privado + RLS por tenant. */
export const TIME_PUNCH_SELFIES_BUCKET = 'time-punch-selfies';

/** Faz upload da selfie (Blob JPEG) e devolve o path a enviar para record-time-punch. */
export async function uploadPunchSelfie(
  blob: Blob,
  opts: { tenantId: string; employeeId: string },
): Promise<string> {
  const path = `${opts.tenantId}/${opts.employeeId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(TIME_PUNCH_SELFIES_BUCKET)
    .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

/** URL assinada de curta duração para exibir a selfie (RLS aplicada no SELECT do storage). */
export async function getPunchSelfieSignedUrl(path: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(TIME_PUNCH_SELFIES_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) throw error ?? new Error('Não foi possível gerar o link.');
  return data.signedUrl;
}
