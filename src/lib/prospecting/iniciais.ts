/**
 * Iniciais para o avatar: primeira letra do primeiro e do último nome.
 *
 * Vive fora dos componentes porque o card do contato e a assinatura de cada atividade
 * precisam da mesma regra — duas cópias divergiriam no primeiro nome composto.
 */
export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}
