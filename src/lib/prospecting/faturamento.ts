import { formatCurrency } from '@/lib/formatters';
import { getFaturamentoBaseLabel, type ProspectCompanyDB } from '@/types/prospect';

type ComFaturamento = Pick<ProspectCompanyDB, 'faturamento_anual' | 'faturamento_anual_base'>;

/** "R$ 12.000.000,00 · estimado" — a base vai junto sempre: palpite não pode passar por dado. */
export function descreverFaturamento(empresa?: ComFaturamento | null): string | null {
  if (empresa?.faturamento_anual == null) return null;
  const base = getFaturamentoBaseLabel(empresa.faturamento_anual_base)?.toLowerCase();
  return [formatCurrency(empresa.faturamento_anual), base].filter(Boolean).join(' · ');
}
