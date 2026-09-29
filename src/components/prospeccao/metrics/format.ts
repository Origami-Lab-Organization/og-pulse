import type { StageRate } from '@/types/prospectMetrics';

/** "1 conta", "41 contas". */
export function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

export const formatNumber = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** Gargalo em alerta; amostra pequena ou sem base em cinza — a taxa aparece, e diz quanto confiar nela. */
export function corDaTaxa(rate: StageRate, gargalo: boolean): string {
  if (gargalo) return 'text-warning-emphasis';
  return rate.small || rate.rate === null ? 'text-muted-foreground' : 'text-foreground';
}
