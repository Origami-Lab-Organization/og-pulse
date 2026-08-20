import { GPO_HEALTHY_MAX, GPO_HEALTHY_MIN } from '@/lib/gpoAllocation.constants';
import type { GpoAllocation, GpoBand, GpoMonthBreakdown, GpoMonthInput } from '@/types/equipe.types';

function proRataFraction(month: GpoMonthInput): number {
  if (month.workingDays <= 0) return 0;
  return Math.min(1, Math.max(0, month.elapsedWorkingDays / month.workingDays));
}

function toBreakdown(month: GpoMonthInput): GpoMonthBreakdown {
  if (month.status !== 'current') {
    return { ...month, plannedConsidered: month.plannedHours, isProRata: false, proRataFraction: null };
  }
  const fraction = proRataFraction(month);
  return {
    ...month,
    plannedConsidered: month.plannedHours * fraction,
    isProRata: true,
    proRataFraction: fraction,
  };
}

function bandOf(percent: number | null): GpoBand {
  if (percent === null) return 'unknown';
  if (percent < GPO_HEALTHY_MIN) return 'under';
  if (percent > GPO_HEALTHY_MAX) return 'over';
  return 'healthy';
}

/** % de um mês isolado — realizado sobre o planejado já considerado, pro-rata inclusive. */
export function gpoMonthPercent(month: GpoMonthBreakdown): number | null {
  if (month.plannedConsidered <= 0) return null;
  return (month.realizedHours / month.plannedConsidered) * 100;
}

/**
 * Alocação no padrão GPO da Origami Lab — fonte única do cálculo.
 * Regra e faixa saudável em .harness/domain-glossary.md → "Alocação GPO".
 */
export function calculateGpoAllocation(months: GpoMonthInput[]): GpoAllocation {
  const considered = months.filter((m) => m.status !== 'future').map(toBreakdown);
  const plannedAccrued = considered.reduce((sum, m) => sum + m.plannedConsidered, 0);
  const realizedAccrued = considered.reduce((sum, m) => sum + m.realizedHours, 0);
  const percent = plannedAccrued > 0 ? (realizedAccrued / plannedAccrued) * 100 : null;
  return { months: considered, plannedAccrued, realizedAccrued, percent, band: bandOf(percent) };
}
