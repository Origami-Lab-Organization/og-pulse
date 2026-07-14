/** Formata BRL inteiro (sem centavos): 55000 → "R$ 55.000". */
export function fmtBRL0(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formata BRL compacto em milhares: 34500 → "R$ 34,5k". */
export function fmtBRLk(value: number): string {
  const k = value / 1000;
  const n = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: k % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(k);
  return `R$ ${n}k`;
}

/** Percentual pt-BR com 1 casa: 40.3 → "40,3%". */
export function fmtPct(value: number, decimals = 1): string {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}%`;
}

/** Pontos percentuais com sinal: 16.1 → "+16,1 pp". */
export function fmtPp(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)} pp`;
}
