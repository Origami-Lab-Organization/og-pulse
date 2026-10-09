/**
 * Datas e prazos da ficha da oportunidade (09/10/2026): uma regra só para "venceu há 4 dias",
 * "vence amanhã" e "19 anos de empresa", em vez de uma cópia por componente.
 */

/** YYYY-MM-DD → DD/MM/YYYY, sem passar por fuso: a data é do dia de quem olha. */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Dias entre hoje e a data: negativo = já passou. */
export function diasAte(iso: string, hoje = new Date()): number {
  const inicio = new Date(hoje);
  inicio.setHours(0, 0, 0, 0);
  const alvo = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Math.round((alvo.getTime() - inicio.getTime()) / 86400000);
}

export function descreverPrazo(dias: number): string {
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'há 1 dia';
  if (dias > 1) return `em ${dias} dias`;
  return `há ${Math.abs(dias)} dias`;
}

/** Anos completos desde a data — a idade da empresa. */
export function anosDesde(iso: string, hoje = new Date()): number {
  const inicio = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Math.floor((hoje.getTime() - inicio.getTime()) / (365.25 * 86400000));
}
