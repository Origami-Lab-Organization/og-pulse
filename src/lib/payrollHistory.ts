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
import { startOfYear, startOfMonth, endOfMonth, addMonths, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  calculatePayrollAnalysisRow,
  calculatePayrollAnalysisRowsByContractType,
  type PayrollAnalysisEmployeeInput,
  type PayrollAnalysisRow,
  type EmployeeVersionInput,
} from './payrollAnalysis';
import { parseDateString } from './formatters';
import type { Holiday } from './workingDays';
import type { PayrollProfile } from '@/types/payrollProfile';
import type { ContractType } from '@/types/employee';

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

function buildMonth(monthDate: Date, currentMonthKey: string): PayrollMonth {
  const key = format(monthDate, 'yyyy-MM');
  return {
    key,
    label: capitalize(format(monthDate, 'MMM', { locale: ptBR }).replace('.', '')),
    start: format(startOfMonth(monthDate), 'yyyy-MM-dd'),
    end: format(endOfMonth(monthDate), 'yyyy-MM-dd'),
    isCurrent: key === currentMonthKey,
    isFuture: key > currentMonthKey,
  };
}

/** Os 12 meses do ano-calendário de `referenceDate` (Jan–Dez), cronológico. */
export function buildYearMonths(referenceDate: Date): PayrollMonth[] {
  const yearStart = startOfYear(referenceDate);
  const currentMonthKey = format(startOfMonth(referenceDate), 'yyyy-MM');
  return Array.from({ length: 12 }, (_, i) => buildMonth(addMonths(yearStart, i), currentMonthKey));
}

/** Mês calendário anterior a `month` — usado pela folha em regime de caixa (salário do mês anterior, pago neste). */
function previousMonth(month: PayrollMonth, referenceDate: Date): PayrollMonth {
  const currentMonthKey = format(startOfMonth(referenceDate), 'yyyy-MM');
  return buildMonth(subMonths(parseDateString(month.start), 1), currentMonthKey);
}

/** Empregado em algum momento do mês: admitido até o fim do mês e sem desligamento antes do início do mês. */
function wasEmployedDuringMonth(e: PayrollHistoryEmployeeInput, month: PayrollMonth): boolean {
  if (!e.dataAdmissao || e.dataAdmissao > month.end) return false;
  if (e.terminationDate && e.terminationDate < month.start) return false;
  return true;
}

/** Data efetiva de desligamento cai dentro da janela do mês — rescisão (CLT Art. 477) paga no mesmo mês, não no seguinte. */
function isTerminatedDuring(e: PayrollHistoryEmployeeInput, month: PayrollMonth): boolean {
  return !!e.terminationDate && e.terminationDate >= month.start && e.terminationDate <= month.end;
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
  versionsByEmployee: Map<string, EmployeeVersionInput[]> = new Map(),
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
      .map((e) => calculatePayrollAnalysisRow(e, payrollProfile, month, holidays, versionsByEmployee.get(e.id)))
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

/**
 * Linha(s) de um colaborador no mês `month`, em regime de CAIXA: salário,
 * encargos e provisões são o que foi GANHO no mês anterior (pago neste,
 * prática usual de folha mensal) — exceto quando o desligamento cai dentro
 * do próprio `month`, caso em que a rescisão (CLT Art. 477) é reconhecida no
 * mesmo mês, não no seguinte. Benefícios e ferramentas continuam ligados ao
 * mês corrente (pagos dentro do mês em que são incorridos, sem defasagem).
 * Reaproveita `calculatePayrollAnalysisRowsByContractType` (regime de
 * competência, por trecho) como fonte de cada uma das duas janelas — nunca
 * duplica a fórmula de custo.
 *
 * Quando o colaborador troca de tipo de contratação no meio do mês corrente
 * OU do mês anterior (a fonte do salário deste mês), retorna MAIS DE UMA
 * linha — uma por tipo de contratação — em vez de uma única linha borrada.
 * Isso pode fazer o mesmo colaborador aparecer em 2 meses seguidos: no mês em
 * que a troca ocorre (benefícios/ferramentas do mês corrente já divididos) e
 * no mês seguinte (salário/encargos do mês anterior, que veio dividido).
 */
function buildCashRows(
  e: PayrollHistoryEmployeeInput,
  payrollProfile: Partial<PayrollProfile>,
  month: PayrollMonth,
  prevMonth: PayrollMonth,
  holidays: Holiday[],
  versions: EmployeeVersionInput[],
): PayrollAnalysisRow[] {
  // terminationService já muda o status para 'em_desligamento' assim que a rescisão é
  // registrada, antes da data efetiva — por isso `terminationDate` (não o status) manda aqui.
  const currentRequiresActive = month.isCurrent || month.isFuture;
  const employedThisMonth =
    wasEmployedDuringMonth(e, month) && (!currentRequiresActive || e.terminationDate !== null || e.status === 'ativo');
  const currentSegments = employedThisMonth
    ? calculatePayrollAnalysisRowsByContractType(e, payrollProfile, month, holidays, versions)
    : [];

  const prevRequiresActive = prevMonth.isCurrent || prevMonth.isFuture;
  const wasEmployedPrevMonth =
    wasEmployedDuringMonth(e, prevMonth) && (!prevRequiresActive || e.terminationDate !== null || e.status === 'ativo');
  const shiftedSegments =
    wasEmployedPrevMonth && !isTerminatedDuring(e, prevMonth)
      ? calculatePayrollAnalysisRowsByContractType(e, payrollProfile, prevMonth, holidays, versions)
      : [];

  // Rescisão: mesmos trechos que já formam `currentSegments` (o desligamento, se houver, já
  // está dentro da janela de `month`) — não recalcula, só decide se entram como "salário do mês".
  const rescissionSegments = isTerminatedDuring(e, month) ? currentSegments : [];

  if (currentSegments.length === 0 && shiftedSegments.length === 0) return [];

  // Tipos de contratação distintos, na ordem em que aparecem: primeiro os que vêm do
  // salário (mês anterior/rescisão), depois qualquer tipo novo que só apareça nos
  // benefícios do mês corrente. Sem troca no mês, isso é sempre um único tipo -> uma
  // única linha, idêntico ao comportamento anterior a este mecanismo.
  const identities: ContractType[] = [];
  for (const r of [...shiftedSegments, ...rescissionSegments, ...currentSegments]) {
    if (!identities.includes(r.tipoContratacao)) identities.push(r.tipoContratacao);
  }

  const add = (a?: number, b?: number) => (a ?? 0) + (b ?? 0);
  // chargesAmount e provisionsAmount ambos embutem os encargos sobre 13º/férias (payrollAnalysis.ts)
  // — somar os dois contaria em dobro, por isso parte do totalMonthlyCost já correto de cada linha.
  const salaryOnlyTotal = (row: PayrollAnalysisRow | undefined) =>
    row ? row.totalMonthlyCost - row.benefitsAmount - row.toolsAmount : 0;

  return identities.map((tipo): PayrollAnalysisRow => {
    const shifted = shiftedSegments.find((r) => r.tipoContratacao === tipo);
    const rescission = rescissionSegments.find((r) => r.tipoContratacao === tipo);
    const current = currentSegments.find((r) => r.tipoContratacao === tipo);

    const benefitsAmount = current?.benefitsAmount ?? 0;
    const toolsAmount = current?.toolsAmount ?? 0;

    return {
      employeeId: e.id,
      nome: e.nome,
      cargo: e.cargo,
      tipoContratacao: tipo,
      baseAmount: add(shifted?.baseAmount, rescission?.baseAmount),
      chargesAmount: add(shifted?.chargesAmount, rescission?.chargesAmount),
      fgtsAmount: add(shifted?.fgtsAmount, rescission?.fgtsAmount),
      inssPatronalAmount: add(shifted?.inssPatronalAmount, rescission?.inssPatronalAmount),
      outrosEncargosAmount: add(shifted?.outrosEncargosAmount, rescission?.outrosEncargosAmount),
      provisionsAmount: add(shifted?.provisionsAmount, rescission?.provisionsAmount),
      provisao13Amount: add(shifted?.provisao13Amount, rescission?.provisao13Amount),
      provisaoFeriasAmount: add(shifted?.provisaoFeriasAmount, rescission?.provisaoFeriasAmount),
      provisaoRecessoAmount: add(shifted?.provisaoRecessoAmount, rescission?.provisaoRecessoAmount),
      encargosSobreProvisoesAmount: add(shifted?.encargosSobreProvisoesAmount, rescission?.encargosSobreProvisoesAmount),
      benefitsAmount,
      toolsAmount,
      // Sempre os itens atuais do cadastro (referência) — current cobre qualquer mês com
      // algum valor na linha (benefícios/ferramentas nunca vêm só de shifted/rescission).
      benefitsBreakdown: current?.benefitsBreakdown ?? shifted?.benefitsBreakdown ?? e.benefitsBreakdown,
      toolsBreakdown: current?.toolsBreakdown ?? shifted?.toolsBreakdown ?? e.toolsBreakdown,
      totalMonthlyCost: salaryOnlyTotal(shifted) + salaryOnlyTotal(rescission) + benefitsAmount + toolsAmount,
      inssFuncionario: add(shifted?.inssFuncionario, rescission?.inssFuncionario),
      // Custo/hora é um conceito de regime de competência (Custo x Hora, que usa
      // `buildPayrollHistory`) — não faz sentido nesta janela mista, por isso zerado.
      hoursWorked: 0,
      hourlyCost: 0,
    };
  });
}

/**
 * Evolução mensal da folha em regime de CAIXA — o que é efetivamente pago em
 * cada mês, não o que é ganho nele. Ver `buildCashRow` para a regra completa.
 * Usada pela tela Folha de Pagamento; `buildPayrollHistory` (competência)
 * segue servindo Custo x Hora, que precisa do custo do mês corrente.
 */
export function buildCashPayrollHistory(
  employees: PayrollHistoryEmployeeInput[],
  payrollProfile: Partial<PayrollProfile>,
  months: PayrollMonth[],
  holidays: Holiday[],
  referenceDate: Date,
  versionsByEmployee: Map<string, EmployeeVersionInput[]> = new Map(),
): PayrollMonthPoint[] {
  return months.map((month) => {
    const prevMonth = previousMonth(month, referenceDate);
    const rows = employees
      .flatMap((e) => buildCashRows(e, payrollProfile, month, prevMonth, holidays, versionsByEmployee.get(e.id) ?? []))
      .sort((a, b) => b.totalMonthlyCost - a.totalMonthlyCost);

    return {
      ...month,
      // Distinto por colaborador, não por linha — uma troca de tipo de contratação no meio
      // do mês gera 2 linhas para a mesma pessoa (ver `buildCashRows`), que não deve contar
      // como 2 colaboradores no headcount.
      headcount: new Set(rows.map((r) => r.employeeId)).size,
      ...sumRows(rows),
      rows,
      estimated: !month.isCurrent && !month.isFuture,
      projected: month.isFuture,
    };
  });
}
