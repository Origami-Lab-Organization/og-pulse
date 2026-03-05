/**
 * Serviço de Cálculos Trabalhistas para Rescisões
 * Baseado na CLT (Consolidação das Leis do Trabalho) e legislação brasileira vigente.
 *
 * Referências principais:
 * - CLT Art. 477 a 486 (Rescisão)
 * - CLT Art. 484-A (Acordo mútuo - Reforma Trabalhista 2017)
 * - CLT Art. 129 a 153 (Férias)
 * - Lei 8.036/90 (FGTS)
 * - Lei 11.788/2008 (Estágio)
 * - Súmula 7 TST (Férias proporcionais)
 */

import { TerminationType } from '@/types/termination';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TerminationInputs {
  /** Data de admissão (ISO string yyyy-MM-dd) */
  admissionDate: string;
  /** Data de desligamento (ISO string yyyy-MM-dd) */
  terminationDate: string;
  /** Salário base mensal em R$ */
  baseSalary: number;
  /** Tipo de desligamento */
  terminationType: TerminationType;
  /** Dias de férias vencidas ainda não gozadas */
  accruedVacationDays: number;
  /** Saldo acumulado de FGTS em R$ */
  fgtsBalance: number;
  /** Valor de horas extras pendentes em R$ */
  pendingOvertime: number;
  /** Adicional de periculosidade (percentual sobre salário, ex: 0.30) */
  hazardPayRate: number;
  /** Adicional de insalubridade em R$ (valor fixo mensal) */
  unhealthyPay: number;
  /** Descontos pendentes (adiantamentos, benefícios etc.) em R$ */
  pendingDeductions: number;
  /** Se o aviso prévio será trabalhado */
  noticeWorked: boolean;
}

export interface TerminationBreakdownItem {
  key: string;
  label: string;
  value: number;
  isCredit: boolean;
  /** Referência legal resumida */
  legalRef?: string;
}

export interface TerminationResult {
  items: TerminationBreakdownItem[];
  totalCredits: number;
  totalDebits: number;
  netValue: number;
  noticePeriodDays: number;
  monthsWorked: number;
  monthsInCurrentYear: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retorna a diferença em meses completos entre duas datas */
function diffMonths(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

/** Retorna a diferença em anos completos */
function diffYears(start: Date, end: Date): number {
  let years = end.getFullYear() - start.getFullYear();
  if (
    end.getMonth() < start.getMonth() ||
    (end.getMonth() === start.getMonth() && end.getDate() < start.getDate())
  ) {
    years--;
  }
  return Math.max(0, years);
}

/** Dias no mês de uma data */
function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ---------------------------------------------------------------------------
// 1. Saldo de Salário
// CLT Art. 477 – O empregado tem direito ao salário proporcional aos dias trabalhados
// no mês da rescisão.
// ---------------------------------------------------------------------------

export function calculateProportionalSalary(salary: number, lastWorkDay: Date): number {
  const days = lastWorkDay.getDate();
  const total = daysInMonth(lastWorkDay);
  // Salário / dias do mês × dias trabalhados
  return (salary / total) * days;
}

// ---------------------------------------------------------------------------
// 2. Férias Proporcionais + 1/3 Constitucional
// CLT Art. 146 §único – Férias proporcionais na rescisão.
// CF Art. 7º XVII – Terço constitucional de férias.
// Convenção OIT 132 – Direito a férias proporcionais em qualquer rescisão.
// ---------------------------------------------------------------------------

export function calculateProportionalVacation(
  salary: number,
  monthsWorked: number,
  hasBonus: boolean = true,
): number {
  // Meses do período aquisitivo atual (0-11)
  const proportionalMonths = monthsWorked % 12;
  if (proportionalMonths === 0) return 0;

  // (salário / 12) × meses proporcionais
  const base = (salary / 12) * proportionalMonths;
  // + 1/3 constitucional
  const bonus = hasBonus ? base / 3 : 0;
  return base + bonus;
}

// ---------------------------------------------------------------------------
// 3. Férias Vencidas + 1/3
// CLT Art. 137 – Férias não concedidas no período concessivo.
// Se vencidas em dobro (Art. 137 caput), aplicar × 2. Aqui calculamos simples;
// a dobra deve ser verificada pelo chamador conforme o período concessivo.
// ---------------------------------------------------------------------------

export function calculateAccruedVacation(
  salary: number,
  daysPending: number,
  hasBonus: boolean = true,
): number {
  if (daysPending <= 0) return 0;
  // (salário / 30) × dias pendentes
  const base = (salary / 30) * daysPending;
  const bonus = hasBonus ? base / 3 : 0;
  return base + bonus;
}

// ---------------------------------------------------------------------------
// 4. 13º Salário Proporcional
// Lei 4.090/1962 – Gratificação natalina proporcional aos meses trabalhados no ano.
// Conta-se como mês integral quando o empregado trabalhou ≥ 15 dias no mês.
// ---------------------------------------------------------------------------

export function calculateProportionalThirteenth(salary: number, monthsInYear: number): number {
  if (monthsInYear <= 0) return 0;
  // (salário / 12) × meses trabalhados no ano
  return (salary / 12) * Math.min(monthsInYear, 12);
}

// ---------------------------------------------------------------------------
// 5. Aviso Prévio
// CLT Art. 487 – Mínimo 30 dias.
// Lei 12.506/2011 – Acrescenta 3 dias por ano de serviço, até o máximo de 90 dias.
// CLT Art. 484-A §1º – No acordo mútuo, metade do aviso prévio.
// ---------------------------------------------------------------------------

export function calculateNoticePeriod(
  admissionDate: string,
  terminationDate: string,
  terminationType: TerminationType,
  baseSalary: number,
  noticeWorked: boolean,
): { days: number; value: number } {
  // Tipos que não geram aviso prévio
  if (['contract_end', 'internship_end', 'retirement'].includes(terminationType)) {
    return { days: 0, value: 0 };
  }

  const years = diffYears(toDate(admissionDate), toDate(terminationDate));

  // 30 dias + 3 dias por ano de serviço, máximo 90 dias (Lei 12.506/2011)
  let days = Math.min(30 + years * 3, 90);

  // Acordo mútuo: metade do aviso (CLT Art. 484-A §1º)
  if (terminationType === 'mutual_agreement') {
    days = Math.ceil(days / 2);
  }

  // Pedido de demissão: aviso de 30 dias fixos (CLT Art. 487 §1º)
  if (terminationType === 'voluntary') {
    days = 30;
  }

  // Se trabalhado, não há valor indenizatório
  const value = noticeWorked ? 0 : (baseSalary / 30) * days;

  return { days, value };
}

// ---------------------------------------------------------------------------
// 6. FGTS sobre remuneração
// Lei 8.036/90 Art. 15 – Depósito mensal de 8% sobre a remuneração.
// ---------------------------------------------------------------------------

export function calculateFGTS(totalRemuneration: number): number {
  return totalRemuneration * 0.08;
}

// ---------------------------------------------------------------------------
// 7. Multa do FGTS
// Lei 8.036/90 Art. 18 §1º – 40% sobre o saldo do FGTS em demissão sem justa causa.
// CLT Art. 484-A §1º – 20% em acordo mútuo.
// ---------------------------------------------------------------------------

export function calculateFGTSFine(
  totalFGTS: number,
  terminationType: TerminationType,
): number {
  switch (terminationType) {
    // Demissão sem justa causa: multa de 40% (Lei 8.036/90 Art. 18 §1º)
    case 'involuntary':
      return totalFGTS * 0.4;

    // Acordo mútuo: multa de 20% (CLT Art. 484-A §1º, I)
    case 'mutual_agreement':
      return totalFGTS * 0.2;

    // Demais tipos não geram multa rescisória do FGTS
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// 8. Cálculo Consolidado da Rescisão
// ---------------------------------------------------------------------------

/**
 * Regras por tipo de desligamento:
 *
 * INVOLUNTARY (Demissão sem justa causa):
 *   Todos os direitos + multa 40% FGTS + aviso prévio
 *
 * VOLUNTARY (Pedido de demissão):
 *   Sem multa FGTS. Se aviso não cumprido, desconta-se o valor.
 *   Direito a saldo de salário, férias vencidas/proporcionais + 1/3 e 13º proporcional.
 *
 * MUTUAL_AGREEMENT (CLT Art. 484-A – Acordo mútuo):
 *   Metade do aviso prévio indenizado, 20% multa FGTS, saque de 80% do saldo FGTS.
 *   Demais verbas integrais.
 *
 * INVOLUNTARY com justa causa (usa-se reason_category 'disciplinary' no sistema):
 *   Apenas saldo de salário e férias vencidas + 1/3. Perde 13º proporcional,
 *   férias proporcionais, aviso prévio e multa FGTS.
 *   *** No modelo atual, justa causa é representada por terminationType 'involuntary'
 *       + reason_category 'disciplinary'. Porém, para manter a interface simples,
 *       esta função não recebe reason_category; o chamador deve tratar esse caso
 *       passando parâmetros zerados quando aplicável. ***
 *
 * CONTRACT_END (Fim de contrato por prazo determinado):
 *   Saldo salário, férias proporcionais/vencidas + 1/3, 13º proporcional, FGTS (sem multa).
 *
 * INTERNSHIP_END (Fim de estágio – Lei 11.788/2008):
 *   Estagiário não possui vínculo CLT. Direitos: bolsa proporcional,
 *   recesso remunerado proporcional (Art. 13). Sem FGTS, 13º, férias CLT.
 *
 * RETIREMENT (Aposentadoria):
 *   Mesmos direitos de demissão sem justa causa se dispensado.
 *   Se pedido pelo empregado, similar ao pedido de demissão.
 *   Aqui tratamos como demissão sem justa causa para fins de cálculo.
 */
export function calculateTotalTermination(inputs: TerminationInputs): TerminationResult {
  const {
    admissionDate,
    terminationDate,
    baseSalary,
    terminationType,
    accruedVacationDays,
    fgtsBalance,
    pendingOvertime,
    hazardPayRate,
    unhealthyPay,
    pendingDeductions,
    noticeWorked,
  } = inputs;

  const admDate = toDate(admissionDate);
  const termDate = toDate(terminationDate);
  const monthsWorked = diffMonths(admDate, termDate);
  const monthsInCurrentYear = termDate.getMonth() + 1;

  const items: TerminationBreakdownItem[] = [];

  // Remuneração total mensal (salário + adicionais)
  const hazardValue = baseSalary * hazardPayRate;
  const totalMonthlyRemuneration = baseSalary + hazardValue + unhealthyPay;

  // --- Estágio: cálculo simplificado (Lei 11.788/2008) ---
  if (terminationType === 'internship_end') {
    const salaryBalance = calculateProportionalSalary(baseSalary, termDate);
    items.push({
      key: 'salary_balance',
      label: `Bolsa proporcional (${termDate.getDate()} dias)`,
      value: salaryBalance,
      isCredit: true,
      legalRef: 'Lei 11.788/2008 Art. 12',
    });

    // Recesso remunerado proporcional: 30 dias a cada 12 meses (Art. 13)
    const recessDays = Math.floor((monthsWorked / 12) * 30);
    if (recessDays > 0) {
      const recessValue = (baseSalary / 30) * recessDays;
      items.push({
        key: 'recess',
        label: `Recesso remunerado (${recessDays} dias)`,
        value: recessValue,
        isCredit: true,
        legalRef: 'Lei 11.788/2008 Art. 13',
      });
    }

    if (pendingDeductions > 0) {
      items.push({
        key: 'deductions',
        label: 'Descontos pendentes',
        value: pendingDeductions,
        isCredit: false,
      });
    }

    return buildResult(items, monthsWorked, monthsInCurrentYear, 0);
  }

  // -------------------------------------------------------
  // Cálculos para vínculos CLT e similares
  // -------------------------------------------------------

  // 1. Saldo de salário
  const salaryBalance = calculateProportionalSalary(totalMonthlyRemuneration, termDate);
  items.push({
    key: 'salary_balance',
    label: `Saldo de salário (${termDate.getDate()} dias)`,
    value: salaryBalance,
    isCredit: true,
    legalRef: 'CLT Art. 477',
  });

  // 2. Férias vencidas + 1/3
  if (accruedVacationDays > 0) {
    const accrued = calculateAccruedVacation(totalMonthlyRemuneration, accruedVacationDays);
    items.push({
      key: 'accrued_vacation',
      label: `Férias vencidas (${accruedVacationDays} dias) + 1/3`,
      value: accrued,
      isCredit: true,
      legalRef: 'CLT Art. 146 + CF Art. 7º XVII',
    });
  }

  // 3. Férias proporcionais + 1/3 (não se aplica a justa causa)
  // Nota: justa causa deve ser controlada externamente; aqui aplicamos para todos exceto contract_end com 0 meses
  const propVacation = calculateProportionalVacation(totalMonthlyRemuneration, monthsWorked);
  if (propVacation > 0) {
    items.push({
      key: 'proportional_vacation',
      label: 'Férias proporcionais + 1/3',
      value: propVacation,
      isCredit: true,
      legalRef: 'CLT Art. 146 §único + CF Art. 7º XVII',
    });
  }

  // 4. 13º proporcional
  const thirteenth = calculateProportionalThirteenth(totalMonthlyRemuneration, monthsInCurrentYear);
  if (thirteenth > 0) {
    items.push({
      key: 'thirteenth',
      label: '13º salário proporcional',
      value: thirteenth,
      isCredit: true,
      legalRef: 'Lei 4.090/1962',
    });
  }

  // 5. Aviso prévio
  const notice = calculateNoticePeriod(
    admissionDate,
    terminationDate,
    terminationType,
    totalMonthlyRemuneration,
    noticeWorked,
  );

  if (notice.value > 0) {
    // Pedido de demissão com aviso não cumprido = desconto para o empregado
    const isDebit = terminationType === 'voluntary' && !noticeWorked;
    items.push({
      key: 'notice_period',
      label: `Aviso prévio ${noticeWorked ? 'trabalhado' : 'indenizado'} (${notice.days} dias)`,
      value: notice.value,
      isCredit: !isDebit,
      legalRef: 'CLT Art. 487 + Lei 12.506/2011',
    });
  }

  // 6. FGTS sobre verbas rescisórias (mês da rescisão)
  if (!['voluntary'].includes(terminationType)) {
    const fgtsMonth = calculateFGTS(salaryBalance);
    if (fgtsMonth > 0) {
      items.push({
        key: 'fgts_month',
        label: 'FGTS do mês da rescisão (8%)',
        value: fgtsMonth,
        isCredit: true,
        legalRef: 'Lei 8.036/90 Art. 15',
      });
    }
  }

  // 7. Multa do FGTS
  const fgtsFine = calculateFGTSFine(fgtsBalance, terminationType);
  if (fgtsFine > 0) {
    items.push({
      key: 'fgts_fine',
      label: `Multa FGTS (${terminationType === 'mutual_agreement' ? '20%' : '40%'})`,
      value: fgtsFine,
      isCredit: true,
      legalRef:
        terminationType === 'mutual_agreement'
          ? 'CLT Art. 484-A §1º, I'
          : 'Lei 8.036/90 Art. 18 §1º',
    });
  }

  // 8. Horas extras pendentes
  if (pendingOvertime > 0) {
    items.push({
      key: 'overtime',
      label: 'Horas extras pendentes',
      value: pendingOvertime,
      isCredit: true,
      legalRef: 'CLT Art. 59',
    });
  }

  // 9. Adicionais (periculosidade / insalubridade) proporcional ao mês
  if (hazardValue > 0) {
    const propHazard = (hazardValue / daysInMonth(termDate)) * termDate.getDate();
    items.push({
      key: 'hazard_pay',
      label: 'Adicional de periculosidade proporcional',
      value: propHazard,
      isCredit: true,
      legalRef: 'CLT Art. 193',
    });
  }

  if (unhealthyPay > 0) {
    const propUnhealthy = (unhealthyPay / daysInMonth(termDate)) * termDate.getDate();
    items.push({
      key: 'unhealthy_pay',
      label: 'Adicional de insalubridade proporcional',
      value: propUnhealthy,
      isCredit: true,
      legalRef: 'CLT Art. 189-192',
    });
  }

  // 10. Descontos pendentes
  if (pendingDeductions > 0) {
    items.push({
      key: 'deductions',
      label: 'Descontos pendentes (adiantamentos, benefícios)',
      value: pendingDeductions,
      isCredit: false,
      legalRef: 'CLT Art. 462',
    });
  }

  return buildResult(items, monthsWorked, monthsInCurrentYear, notice.days);
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function buildResult(
  items: TerminationBreakdownItem[],
  monthsWorked: number,
  monthsInCurrentYear: number,
  noticePeriodDays: number,
): TerminationResult {
  let totalCredits = 0;
  let totalDebits = 0;

  for (const item of items) {
    // Arredonda para centavos
    item.value = Math.round(item.value * 100) / 100;
    if (item.isCredit) {
      totalCredits += item.value;
    } else {
      totalDebits += item.value;
    }
  }

  return {
    items,
    totalCredits: Math.round(totalCredits * 100) / 100,
    totalDebits: Math.round(totalDebits * 100) / 100,
    netValue: Math.round((totalCredits - totalDebits) * 100) / 100,
    noticePeriodDays,
    monthsWorked,
    monthsInCurrentYear,
  };
}
