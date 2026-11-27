import { format } from 'date-fns';

/** Formatos dos insights de IA (US-0057). */

export const quandoFoiGerado = (data: string) => format(new Date(data), 'dd/MM/yyyy HH:mm');

/** "https://www.gecal.com.br/sobre" → "gecal.com.br". */
export function dominioDaFonte(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
