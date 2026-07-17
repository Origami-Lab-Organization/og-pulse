/**
 * Linhas de detalhamento de custo por colaborador para a análise de Folha de
 * Pagamento (admin) — reconciliação com o que é pago na folha, nos impostos
 * (encargos), em ferramentas e em benefícios.
 *
 * Reaproveita `calculateEmployeeCost` (mesma fórmula usada no cadastro do
 * colaborador e no recálculo do servidor) para nunca divergir da regra de
 * negócio oficial, e recalcula com o `PayrollProfile` vigente do tenant em vez
 * de ler `breakdown_json` — que só é regravado quando o colaborador é salvo,
 * podendo ficar desatualizado após uma mudança nas taxas de encargos.
 */
import { calculateEmployeeCost } from './employeeCostCalculator';
import { getBusinessDaysInMonth } from './employeeCost';
import { countWorkingDays, type Holiday } from './workingDays';
import { parseDateString } from './formatters';
import type { PayrollProfile } from '@/types/payrollProfile';
import type { ContractType } from '@/types/employee';

export interface PayrollAnalysisEmployeeInput {
  id: string;
  nome: string;
  cargo: string;
  status: string;
  tipoContratacao: ContractType;
  salarioMensal: number;
  bolsaAuxilio: number;
  valorContratoPj: number;
  proLabore: number;
  dividendos: number;
  totalBenefitsCost: number;
  totalToolsCost: number;
  /** 'YYYY-MM-DD' ou null. Usada para prorata de salário/encargos/benefícios no mês de admissão. */
  dataAdmissao: string | null;
  /** Data efetiva de desligamento mais antiga ('YYYY-MM-DD'), ou null se nunca desligado. Usada para prorata no mês de desligamento. */
  terminationDate: string | null;
}

export interface PayrollMonthWindow {
  /** 'YYYY-MM-DD' */
  start: string;
  /** 'YYYY-MM-DD' */
  end: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Interseção entre o mês e o período empregado (admissão até desligamento) — null se não houve sobreposição. */
function effectiveEmploymentWindow(
  e: PayrollAnalysisEmployeeInput,
  monthStart: Date,
  monthEnd: Date,
): { start: Date; end: Date } | null {
  const admissao = e.dataAdmissao ? parseDateString(e.dataAdmissao) : null;
  const start = admissao && admissao > monthStart ? admissao : monthStart;

  const desligamento = e.terminationDate ? parseDateString(e.terminationDate) : null;
  const end = desligamento && desligamento < monthEnd ? desligamento : monthEnd;

  if (end < start) return null;
  return { start, end };
}

/**
 * Fração pró-rata do mês (dias corridos) em que o colaborador esteve
 * empregado — 1 para quem trabalhou o mês inteiro, menor que 1 para
 * admissão/desligamento parcial. Aplicada ao salário base, o que propaga a
 * proporcionalidade para FGTS/INSS/provisões (calculados sobre o salário).
 */
function calendarProrationFraction(e: PayrollAnalysisEmployeeInput, month: PayrollMonthWindow): number {
  const monthStart = parseDateString(month.start);
  const monthEnd = parseDateString(month.end);
  const daysInMonth = monthEnd.getDate();

  const window = effectiveEmploymentWindow(e, monthStart, monthEnd);
  if (!window) return 0;

  const workedDays = Math.round((window.end.getTime() - window.start.getTime()) / MS_PER_DAY) + 1;
  return Math.min(1, workedDays / daysInMonth);
}

/**
 * Benefícios: valor total mensal ÷ dias úteis do mês × dias úteis que o
 * colaborador efetivamente trabalha no mês (admissão/desligamento parcial).
 * Ferramentas, ao contrário, são cobradas no valor cheio independente da
 * proporcionalidade — por isso não têm uma função equivalente.
 */
function proratedBenefitsAmount(
  e: PayrollAnalysisEmployeeInput,
  month: PayrollMonthWindow,
  holidays: Holiday[],
): number {
  const monthStart = parseDateString(month.start);
  const monthEnd = parseDateString(month.end);

  const businessDaysInMonth = getBusinessDaysInMonth(monthStart.getFullYear(), monthStart.getMonth(), holidays);
  if (businessDaysInMonth <= 0) return 0;

  const window = effectiveEmploymentWindow(e, monthStart, monthEnd);
  if (!window) return 0;

  const businessDaysWorked = countWorkingDays(window.start, window.end, holidays);
  return (e.totalBenefitsCost / businessDaysInMonth) * businessDaysWorked;
}

export interface PayrollAnalysisRow {
  employeeId: string;
  nome: string;
  cargo: string;
  tipoContratacao: ContractType;
  baseAmount: number;
  chargesAmount: number;
  /** FGTS sobre o salário/pró-labore do mês (alíquota cheia) — não inclui o FGTS sobre as provisões de 13º/férias, que fica em `provisionsAmount`. */
  fgtsAmount: number;
  /** INSS patronal sobre o salário/pró-labore do mês (alíquota cheia) — não inclui o INSS patronal sobre as provisões de 13º/férias, que fica em `provisionsAmount`. */
  inssPatronalAmount: number;
  /** Resto de `chargesAmount` sobre o salário do mês (RAT, Terceiros, Outros) — para que FGTS + INSS Patronal + isso + encargos sobre provisões feche com `chargesAmount`. */
  outrosEncargosAmount: number;
  /** Provisão de 13º/férias + os encargos (FGTS, INSS patronal etc.) incidentes sobre essas provisões — são valores reservados para pagamento futuro, não custo do mês corrente. */
  provisionsAmount: number;
  benefitsAmount: number;
  toolsAmount: number;
  totalMonthlyCost: number;
  /**
   * INSS retido do colaborador (tabela progressiva) — descontado do próprio
   * salário bruto, não é custo do empregador. Informativo, para conferência
   * do GPS/eSocial; não soma em `totalMonthlyCost` nem em `chargesAmount`.
   */
  inssFuncionario: number;
}

/** Linha de custo de um único colaborador — reaproveitada tanto pela folha atual quanto pela evolução histórica. */
export function calculatePayrollAnalysisRow(
  e: PayrollAnalysisEmployeeInput,
  payrollProfile: Partial<PayrollProfile>,
  month: PayrollMonthWindow,
  holidays: Holiday[],
): PayrollAnalysisRow {
  // Admissão/desligamento parcial: prorata o salário-base pelos dias corridos
  // do mês — FGTS, INSS e provisões são calculados sobre esse valor já
  // proporcional, então herdam a proporcionalidade automaticamente.
  const baseFraction = calendarProrationFraction(e, month);

  const breakdown = calculateEmployeeCost({
    tipoContratacao: e.tipoContratacao,
    salarioBruto: e.salarioMensal * baseFraction,
    bolsaAuxilio: e.bolsaAuxilio * baseFraction,
    valorContratoPj: e.valorContratoPj * baseFraction,
    proLabore: e.proLabore * baseFraction,
    dividendos: e.dividendos * baseFraction,
    // Benefícios seguem sua própria prorata por dias úteis (não pelos dias corridos do salário).
    benefitsTotalMonthly: proratedBenefitsAmount(e, month, holidays),
    // Ferramentas: valor cheio do mês, sem proporcionalidade.
    toolsTotalMonthly: e.totalToolsCost,
    payrollProfile,
  });

  // FGTS e INSS patronal do mês são só a alíquota cheia sobre o salário —
  // o que incide sobre as provisões de 13º/férias é, ele próprio, provisão
  // (dinheiro reservado para pagar junto com o 13º/férias, não encargo do
  // mês corrente), por isso soma em `provisionsAmount` e não aqui.
  const fgtsAmount = breakdown.details.fgts;
  const inssPatronalAmount = breakdown.details.inss;
  const encargosSobreProvisoes = breakdown.details.encargos13 + breakdown.details.encargosFerias;

  return {
    employeeId: e.id,
    nome: e.nome,
    cargo: e.cargo,
    tipoContratacao: e.tipoContratacao,
    baseAmount: breakdown.baseAmount,
    chargesAmount: breakdown.chargesAmount,
    fgtsAmount,
    inssPatronalAmount,
    outrosEncargosAmount: breakdown.chargesAmount - fgtsAmount - inssPatronalAmount - encargosSobreProvisoes,
    provisionsAmount: breakdown.provisionsAmount + encargosSobreProvisoes,
    benefitsAmount: breakdown.benefitsAmount,
    toolsAmount: breakdown.toolsAmount,
    totalMonthlyCost: breakdown.totalMonthlyCost,
    inssFuncionario: breakdown.details.inssFuncionario,
  };
}
