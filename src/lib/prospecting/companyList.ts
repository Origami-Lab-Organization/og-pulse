/**
 * Ajudas de lista da Prospecção: paginação e o texto da próxima atividade. A busca, as
 * facetas e as ordens da antiga aba de empresas (com Anel e Tier) saíram na US-0017.
 */

export function paginar<T>(itens: T[], pagina: number, tamanho: number): T[] {
  return itens.slice(pagina * tamanho, (pagina + 1) * tamanho);
}

export type NextActivityTone = 'atrasada' | 'hoje' | 'futura';

export interface NextActivityText {
  rotulo: string;
  dica: string;
  tom: NextActivityTone;
}

/** "Atrasada 2 dias", "Hoje", "Amanhã", "Em 5 dias" — a data sempre em dd/mm. */
export function descreverProximaAtividade(iso: string, hoje = new Date()): NextActivityText {
  const [, mes, dia] = iso.split('-');
  const ddmm = `${dia}/${mes}`;
  const dias = diasEntre(hoje, iso);
  if (dias < 0) return { rotulo: ddmm, dica: `Atrasada ${-dias} ${dias === -1 ? 'dia' : 'dias'}`, tom: 'atrasada' };
  if (dias === 0) return { rotulo: 'Hoje', dica: ddmm, tom: 'hoje' };
  return { rotulo: ddmm, dica: dias === 1 ? 'Amanhã' : `Em ${dias} dias`, tom: 'futura' };
}

function diasEntre(hoje: Date, iso: string): number {
  const inicio = new Date(hoje);
  inicio.setHours(0, 0, 0, 0);
  const alvo = new Date(`${iso}T00:00:00`);
  return Math.round((alvo.getTime() - inicio.getTime()) / 86400000);
}
