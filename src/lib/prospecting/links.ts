/** Links de empresa e contato da prospecção: o que foi digitado vira endereço abrível. */

export function comProtocolo(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Aceita o que as pessoas colam: "@perfil", "perfil" ou o link inteiro. Guardamos como foi
 * digitado; só o link de abertura é normalizado.
 */
export function urlDoInstagram(valor?: string | null): string | null {
  const texto = valor?.trim();
  if (!texto) return null;
  if (/instagram\.com/i.test(texto)) return comProtocolo(texto);
  return `https://instagram.com/${texto.replace(/^@/, '')}`;
}

/** Para exibir: sem "https://www." e sem barra final. */
export function urlCurta(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}
