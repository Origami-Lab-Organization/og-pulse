/**
 * Pluralização pt-BR por contagem, escolhendo a forma flexionada correta —
 * nunca concatenar sufixo a uma palavra já no singular ("alteração" + "ões").
 */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "1 alteração" / "N alterações" / "0 alterações". */
export function alteracoesLabel(count: number): string {
  return pluralize(count, 'alteração', 'alterações');
}
