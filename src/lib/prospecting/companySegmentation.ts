/**
 * Segmentação da empresa lida do texto livre (24/09/2026).
 *
 * `segment` continua texto livre no banco: a tela precisa de Setor/Subsetor, e esta leitura
 * resolve isso sem migration. A escrita (`formatSegmentInput`) grava sempre "Setor / Subsetor",
 * que é o formato que a leitura reconhece primeiro.
 */

export interface Segmento {
  setor: string | null;
  subsetor: string | null;
}

/**
 * Separadores, na ordem em que são tentados. A barra com espaço vem antes do travessão, e
 * o travessão antes da barra solta: "Associação empresarial – Divinópolis/MG" é setor
 * "Associação empresarial", subsetor "Divinópolis/MG" — não um setor que termina em
 * "Divinópolis".
 */
const SEPARADORES = [/\s+\/\s+/, /\s+[–—-]\s+/, /\//];

export function parseSegment(texto: string | null | undefined): Segmento {
  const limpo = texto?.trim();
  if (!limpo) return { setor: null, subsetor: null };

  const separador = SEPARADORES.find((re) => re.test(limpo));
  if (!separador) return { setor: limpo, subsetor: null };

  const [setor, ...resto] = limpo.split(separador);
  return { setor: setor.trim() || null, subsetor: resto.join(' / ').trim() || null };
}

/** Para o campo "Segmento" da edição: o inverso de `parseSegment`. */
export function segmentToInput({ setor, subsetor }: Segmento): string {
  return [setor, subsetor].filter(Boolean).join(' / ');
}

/** O que a pessoa digitou → texto guardado. A 1ª barra separa setor do resto. */
export function formatSegmentInput(entrada: string): string | null {
  const [setor, ...resto] = entrada.split('/');
  const sub = resto.join('/').trim();
  const principal = setor.trim();
  if (!principal) return sub || null;
  return sub ? `${principal} / ${sub}` : principal;
}
