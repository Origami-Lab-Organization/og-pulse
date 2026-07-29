import { truncateToCents } from '@/lib/formatters';

// Tabela INSS - Progressivo
interface INSSBracket {
  min: number;
  max: number;
  rate: number;
}

// Tabela IRRF 2024
interface IRRFBracket {
  min: number;
  max: number;
  rate: number;
  deduction: number;
}

// Faixas INSS (progressivo)
const INSS_BRACKETS: INSSBracket[] = [
  { min: 0, max: 1621.00, rate: 0.075 },
  { min: 1621.01, max: 2902.84, rate: 0.09 },
  { min: 2902.85, max: 4354.27, rate: 0.12 },
  { min: 4354.28, max: 8475.55, rate: 0.14 },
];

// Teto INSS (soma do valor máximo de cada faixa)
export const INSS_CEILING = 988.09;

// Faixas IRRF 2024
const IRRF_BRACKETS: IRRFBracket[] = [
  { min: 0, max: 2259.20, rate: 0, deduction: 0 },
  { min: 2259.21, max: 2826.65, rate: 0.075, deduction: 169.44 },
  { min: 2826.66, max: 3751.05, rate: 0.15, deduction: 381.44 },
  { min: 3751.06, max: 4664.68, rate: 0.225, deduction: 662.77 },
  { min: 4664.69, max: Infinity, rate: 0.275, deduction: 896.00 },
];

// Dedução por dependente IRRF 2024
export const DEPENDENT_DEDUCTION = 189.59;

// Alíquota estimada Simples Nacional para PJ (média)
export const PJ_SIMPLES_TAX_RATE = 0.06;

export interface INSSBreakdown {
  bracket1: number;
  bracket2: number;
  bracket3: number;
  bracket4: number;
  total: number;
}

export interface NetSalaryBreakdown {
  grossSalary: number;
  inss: number;
  inssBreakdown: INSSBreakdown;
  irrf: number;
  irrfBase: number;
  irrfBracket: { rate: number; deduction: number } | null;
  dependentsDeduction: number;
  netSalary: number;
}

/**
 * Calcula INSS do empregado usando tabela progressiva
 * Cada faixa é calculada sobre a diferença entre os limites
 */
export function calculateINSS(salarioBruto: number): { total: number; breakdown: INSSBreakdown } {
  const breakdown: INSSBreakdown = {
    bracket1: 0,
    bracket2: 0,
    bracket3: 0,
    bracket4: 0,
    total: 0,
  };

  if (salarioBruto <= 0) {
    return { total: 0, breakdown };
  }

  let remaining = salarioBruto;
  let total = 0;

  // Faixa 1: até 1.621,00 - 7,5%
  const bracket1Max = 1621.00;
  if (remaining > 0) {
    const taxable = Math.min(remaining, bracket1Max);
    breakdown.bracket1 = truncateToCents(taxable * 0.075);
    total += breakdown.bracket1;
    remaining -= taxable;
  }

  // Faixa 2: 1.621,01 a 2.902,84 - 9%
  const bracket2Range = 2902.84 - 1621.00;
  if (remaining > 0) {
    const taxable = Math.min(remaining, bracket2Range);
    breakdown.bracket2 = truncateToCents(taxable * 0.09);
    total += breakdown.bracket2;
    remaining -= taxable;
  }

  // Faixa 3: 2.902,85 a 4.354,27 - 12%
  const bracket3Range = 4354.27 - 2902.84;
  if (remaining > 0) {
    const taxable = Math.min(remaining, bracket3Range);
    breakdown.bracket3 = truncateToCents(taxable * 0.12);
    total += breakdown.bracket3;
    remaining -= taxable;
  }

  // Faixa 4: 4.354,28 a 8.475,55 - 14%
  const bracket4Range = 8475.55 - 4354.27;
  if (remaining > 0) {
    const taxable = Math.min(remaining, bracket4Range);
    breakdown.bracket4 = truncateToCents(taxable * 0.14);
    total += breakdown.bracket4;
  }

  // Guia real de INSS trunca cada faixa antes de somar (ver ADR-0012).
  total = Math.min(truncateToCents(total), INSS_CEILING);
  breakdown.total = total;

  return { total, breakdown };
}

/**
 * Calcula IRRF do empregado
 * Base de cálculo = Salário Bruto - INSS - (Dependentes × 189,59)
 */
export function calculateIRRF(
  salarioBruto: number,
  inss: number,
  dependents: number = 0
): { irrf: number; base: number; bracket: IRRFBracket | null; dependentsDeduction: number } {
  const dependentsDeduction = dependents * DEPENDENT_DEDUCTION;
  const base = salarioBruto - inss - dependentsDeduction;

  if (base <= 0) {
    return { irrf: 0, base: 0, bracket: null, dependentsDeduction };
  }

  // Encontrar a faixa correta
  const bracket = IRRF_BRACKETS.find(b => base >= b.min && base <= b.max) || IRRF_BRACKETS[IRRF_BRACKETS.length - 1];

  if (bracket.rate === 0) {
    return { irrf: 0, base, bracket, dependentsDeduction };
  }

  const irrf = Math.max(0, base * bracket.rate - bracket.deduction);
  
  return { irrf, base, bracket, dependentsDeduction };
}

/**
 * Calcula salário líquido completo
 */
export function calculateNetSalary(salarioBruto: number, dependents: number = 0): NetSalaryBreakdown {
  const { total: inss, breakdown: inssBreakdown } = calculateINSS(salarioBruto);
  const { irrf, base: irrfBase, bracket: irrfBracket, dependentsDeduction } = calculateIRRF(salarioBruto, inss, dependents);

  return {
    grossSalary: salarioBruto,
    inss,
    inssBreakdown,
    irrf,
    irrfBase,
    irrfBracket: irrfBracket ? { rate: irrfBracket.rate, deduction: irrfBracket.deduction } : null,
    dependentsDeduction,
    netSalary: salarioBruto - inss - irrf,
  };
}

/**
 * Estima o líquido de um PJ no Simples Nacional
 * Considera uma alíquota média de 15% (varia de acordo com o anexo e faturamento)
 */
export function calculatePJNet(valorContrato: number, taxRate: number = PJ_SIMPLES_TAX_RATE): {
  grossValue: number;
  estimatedTax: number;
  netValue: number;
  taxRate: number;
} {
  const estimatedTax = valorContrato * taxRate;
  return {
    grossValue: valorContrato,
    estimatedTax,
    netValue: valorContrato - estimatedTax,
    taxRate,
  };
}
