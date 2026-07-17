/**
 * Evolução mensal da folha — janela fixa no ano-calendário de `referenceDate`
 * (Jan–Dez), reconstruindo para cada mês quais colaboradores estavam
 * empregados (pela data de admissão e pelo desligamento efetivo, do mesmo
 * jeito que `turnoverCalculator` reconstrói headcount histórico — não pelo
 * status atual) e aplicando a mesma fórmula de custo da folha atual.
 *
 * Isso reconstrói corretamente QUEM compunha a folha em cada mês (inclusive
 * colaboradores já desligados hoje). Os VALORES de cada colaborador (salário,
 * benefícios, ferramentas) e as taxas de encargos usadas são as atuais — não
 * há histórico de reajustes salariais nem de mudança de alíquota persistido
 * de forma abrangente no sistema. Meses passados são, portanto, uma
 * estimativa; meses futuros são uma projeção (mesmo quadro/valores de hoje,
 * mantidos constantes); o mês atual usa a mesma regra e o mesmo filtro
 * (`status === 'ativo'`) já exibidos no Dashboard.
 */
import { startOfYear, startOfMonth, endOfMonth, addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculatePayrollAnalysisRow, type PayrollAnalysisEmployeeInput, type PayrollAnalysisRow } from './payrollAnalysis';
import type { Holiday } from './workingDays';
import type { PayrollProfile } from '@/types/payrollProfile';

export type PayrollHistoryEmployeeInput = PayrollAnalysisEmployeeInput;

export interface PayrollMonth {
  /** 'YYYY-MM' */
  key: string;
  /** Ex.: "Jan" (o ano é mostrado uma única vez, no título da tela — não em cada mês) */
  label: string;
  /** 'YYYY-MM-DD' */
  start: string;
  /** 'YYYY-MM-DD' */
  end: string;
  isCurrent: boolean;
  isFuture: boolean;
}

export interface PayrollMonthPoint extends PayrollMonth {
  headcount: number;
  baseAmount: number;
  chargesAmount: number;
  fgtsAmount: number;
  inssPatronalAmount: number;
  outrosEncargosAmount: number;
  provisionsAmount: number;
  benefitsAmount: number;
  toolsAmount: number;
  totalMonthlyCost: number;
  /** Informativo (INSS retido dos colaboradores) — não soma em `totalMonthlyCost`. */
  inssFuncionarioAmount: number;
  rows: PayrollAnalysisRow[];
  /** true para meses passados (reconstruídos com dados/taxas atuais, não histórico exato). */
  estimated: boolean;
  /** true para meses futuros (projeção com o quadro e os valores de hoje, mantidos constantes). */
  projected: boolean;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Os 12 meses do ano-calendário de `referenceDate` (Jan–Dez), cronológico. */
export function buildYearMonths(referenceDate: Date): PayrollMonth[] {
  const yearStart = startOfYear(referenceDate);
  const currentMonthKey = format(startOfMonth(referenceDate), 'yyyy-MM');
  return Array.from({ length: 12 }, (_, i) => {
    const monthDate = addMonths(yearStart, i);
    const key = format(monthDate, 'yyyy-MM');
    return {
      key,
      label: capitalize(format(monthDate, 'MMM', { locale: ptBR }).replace('.', '')),
      start: format(startOfMonth(monthDate), 'yyyy-MM-dd'),
      end: format(endOfMonth(monthDate), 'yyyy-MM-dd'),
      isCurrent: key === currentMonthKey,
      isFuture: key > currentMonthKey,
    };
  });
}

/** Empregado em algum momento do mês: admitido até o fim do mês e sem desligamento antes do início do mês. */
function wasEmployedDuringMonth(e: PayrollHistoryEmployeeInput, month: PayrollMonth): boolean {
  if (!e.dataAdmissao || e.dataAdmissao > month.end) return false;
  if (e.terminationDate && e.terminationDate < month.start) return false;
  return true;
}

function sumRows(rows: PayrollAnalysisRow[]) {
  return rows.reduce(
    (acc, r) => ({
      baseAmount: acc.baseAmount + r.baseAmount,
      chargesAmount: acc.chargesAmount + r.chargesAmount,
      fgtsAmount: acc.fgtsAmount + r.fgtsAmount,
      inssPatronalAmount: acc.inssPatronalAmount + r.inssPatronalAmount,
      outrosEncargosAmount: acc.outrosEncargosAmount + r.outrosEncargosAmount,
      provisionsAmount: acc.provisionsAmount + r.provisionsAmount,
      benefitsAmount: acc.benefitsAmount + r.benefitsAmount,
      toolsAmount: acc.toolsAmount + r.toolsAmount,
      totalMonthlyCost: acc.totalMonthlyCost + r.totalMonthlyCost,
      inssFuncionarioAmount: acc.inssFuncionarioAmount + r.inssFuncionario,
    }),
    {
      baseAmount: 0,
      chargesAmount: 0,
      fgtsAmount: 0,
      inssPatronalAmount: 0,
      outrosEncargosAmount: 0,
      provisionsAmount: 0,
      benefitsAmount: 0,
      toolsAmount: 0,
      totalMonthlyCost: 0,
      inssFuncionarioAmount: 0,
    },
  );
}

export function buildPayrollHistory(
  employees: PayrollHistoryEmployeeInput[],
  payrollProfile: Partial<PayrollProfile>,
  months: PayrollMonth[],
  holidays: Holiday[],
): PayrollMonthPoint[] {
  return months.map((month) => {
    // Mês atual e meses futuros: não há como saber o status passado/futuro de
    // alguém além do que ele é hoje, então usamos o status vigente (mesma
    // regra do Dashboard) além da janela de datas — isso evita projetar
    // colaboradores hoje bloqueados/aguardando confirmação como parte da folha.
    // Meses passados: só a janela de datas, já que o status atual não reflete o histórico.
    const requiresActiveStatusToday = month.isCurrent || month.isFuture;
    const rows = employees
      .filter((e) => wasEmployedDuringMonth(e, month) && (!requiresActiveStatusToday || e.status === 'ativo'))
      .map((e) => calculatePayrollAnalysisRow(e, payrollProfile, month, holidays))
      .sort((a, b) => b.totalMonthlyCost - a.totalMonthlyCost);

    return {
      ...month,
      headcount: rows.length,
      ...sumRows(rows),
      rows,
      estimated: !month.isCurrent && !month.isFuture,
      projected: month.isFuture,
    };
  });
}
