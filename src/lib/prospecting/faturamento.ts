import { formatCurrency } from '@/lib/formatters';
import { getFaturamentoBaseLabel, type ProspectCompanyDB } from '@/types/prospect';

type ComFaturamento = Pick<ProspectCompanyDB, 'faturamento_anual' | 'faturamento_anual_base'>;

/** "R$ 12.000.000,00 · estimado" — a base vai junto sempre: palpite não pode passar por dado. */
export function descreverFaturamento(empresa?: ComFaturamento | null): string | null {
  if (empresa?.faturamento_anual == null) return null;
  const base = getFaturamentoBaseLabel(empresa.faturamento_anual_base)?.toLowerCase();
  return [formatCurrency(empresa.faturamento_anual), base].filter(Boolean).join(' · ');
}

/**
 * "R$ 7,4 mi" — o faturamento para leitura rápida na ficha da oportunidade (09/10/2026).
 * Trunca em vez de arredondar (ADR-0011): R$ 7,49 mi aparece como 7,4, nunca como 7,5.
 */
export function faturamentoCompacto(valor: number): string {
  const casa = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  if (valor >= 1_000_000) return `R$ ${casa(Math.floor(valor / 100_000) / 10)} mi`;
  if (valor >= 1_000) return `R$ ${casa(Math.floor(valor / 1_000))} mil`;
  return formatCurrency(valor);
}
