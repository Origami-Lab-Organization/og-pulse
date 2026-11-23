import { BASE_PISO } from '@/lib/prospecting/faturamentoEstimado';
import type { EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import type { TipoDeConta } from '@/types/prospect';

/**
 * Sugestão do tipo de conta pelo faturamento (US-0008): Âncora acima de R$ 300 mi, Ponte de
 * R$ 100 a 300 mi, Satélite de R$ 10 a 100 mi. Abaixo disso, ou só com o piso do porte, não há
 * sugestão: a pessoa escolhe.
 */
const FAIXAS: ReadonlyArray<[number, TipoDeConta]> = [[300_000_000, 'ancora'], [100_000_000, 'ponte'], [10_000_000, 'satelite']];

export function sugerirTipoDeConta(faturamento: number | null): TipoDeConta | null {
  if (faturamento == null) return null;
  return FAIXAS.find(([piso]) => faturamento >= piso)?.[1] ?? null;
}

/** O faturamento que vale para a sugestão: o do time, senão o estimado pela base (sem o piso). */
export function faturamentoDaSugestao(e: Pick<EmpresaReceita, 'faturamento_informado' | 'faturamento_estimado' | 'faturamento_base'>): number | null {
  if (e.faturamento_informado != null) return Number(e.faturamento_informado);
  if (e.faturamento_estimado == null || e.faturamento_base === BASE_PISO) return null;
  return Number(e.faturamento_estimado);
}

/** Por que não há sugestão, para a janela explicar. */
export function motivoSemSugestao(e: Pick<EmpresaReceita, 'faturamento_informado' | 'faturamento_estimado' | 'faturamento_base'>): string {
  const valor = faturamentoDaSugestao(e);
  return valor == null
    ? 'Sem faturamento estimado para sugerir. Escolha o tipo.'
    : 'Faturamento abaixo de R$ 10 mi: nenhuma faixa se aplica. Escolha a mais próxima.';
}
