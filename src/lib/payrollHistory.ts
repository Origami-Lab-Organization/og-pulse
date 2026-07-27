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
import { calculateRealTerminationVerbas } from './terminationCalcs';
import { sum13thApplicableRates, sumVacationApplicableRates } from './employeeCostCalculator';
import type { Holiday } from './workingDays';
import { DEFAULT_PAYROLL_PROFILE, type PayrollProfile } from '@/types/payrollProfile';
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
      .filter((e) => e.alocaEmProjetos && wasEmployedDuringMonth(e, month) && (!requiresActiveStatusToday || e.status === 'ativo'))
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
 * competência, por trecho) como fonte de cada uma das janelas — nunca
 * duplica a fórmula de custo.
 *
 * Dentro da rescisão, nem tudo é pago junto com o acerto: verbas (saldo/
 * férias/13º), FGTS e as provisões seguem no mês do desligamento, mas o INSS
 * patronal e RAT/Terceiros/Outros sobre o salário rescisório (e o INSS retido
 * do funcionário, informativo) NÃO saem no acerto — seguem o calendário
 * normal do GPS, guia da competência com vencimento dia 20 do mês seguinte,
 * igual ao INSS de qualquer mês comum. Por isso essa fatia (ver `gpsAmount`)
 * é retirada do mês do desligamento e reaparece como `deferredGpsSegments` no
 * mês seguinte, numa linha própria (sem salário/FGTS/benefícios/ferramentas —
 * só o GPS pendente).
 *
 * Quando o colaborador troca de tipo de contratação no meio do mês corrente
 * OU do mês anterior (a fonte do salário deste mês), retorna MAIS DE UMA
 * linha — uma por tipo de contratação — em vez de uma única linha borrada.
 * Isso pode fazer o mesmo colaborador aparecer em 3 meses seguidos: no mês em
 * que a troca ocorre (benefícios/ferramentas do mês corrente já divididos), no
 * mês seguinte (salário/encargos do mês anterior, que veio dividido) e, se
 * houve desligamento, ainda um mês depois só com o GPS pendente da rescisão.
 */

/** Fatia de uma linha que só é recolhida via guia GPS (INSS patronal + RAT/Terceiros/Outros). */
function gpsAmount(row?: PayrollAnalysisRow): number {
  return row ? row.inssPatronalAmount + row.outrosEncargosAmount : 0;
}

/** Mesma fatia GPS de `gpsAmount`, mas sobre os encargos das provisões de 13º/férias — resto de `encargosSobreProvisoesAmount` depois de tirar o FGTS (`fgtsSobreProvisoesAmount`). */
function gpsOnProvisionsAmount(row?: PayrollAnalysisRow): number {
  return row ? row.encargosSobreProvisoesAmount - row.fgtsSobreProvisoesAmount : 0;
}

/**
 * Corrige as provisões de 13º/férias/recesso de um segmento de rescisão — a fonte
 * (`calculatePayrollAnalysisRowsByContractType`) usa a provisão mensal genérica
 * (`salário/12`, rateada pela fração de dias do segmento no mês), não os avos legais
 * (Lei 4.090/1962, Súmula 261 TST, Lei 11.788/2008) nem a regra de justa causa (CLT Art.
 * 482, que zera férias/13º) — mesmo bug já corrigido no wizard via
 * `calculateRealTerminationVerbas` (`terminationCalcs.ts`), agora reaproveitado aqui como
 * fonte única. `baseAmount`/`fgtsAmount`/`inssPatronalAmount`/`outrosEncargosAmount`/
 * `inssFuncionario` do segmento (saldo de salário) NÃO são tocados — já batem com a
 * fração de dias do mês (mesma convenção usada por `calculateRealTerminationVerbas`) e,
 * ao contrário das provisões, não têm fórmula genérica alternativa para divergir.
 *
 * Aviso prévio, multa FGTS e a indenização Art. 479/480 (contrato de experiência
 * encerrado antecipadamente) NÃO entram aqui — a Folha de Pagamento ainda não modela
 * essas verbas (ver Fora de escopo no plano); só a tela de detalhe da rescisão as exibe.
 */
function correctRescissionSegment(
  raw: PayrollAnalysisRow,
  e: PayrollHistoryEmployeeInput,
  payrollProfile: Partial<PayrollProfile>,
  terminationDateStr: string,
): PayrollAnalysisRow {
  const tipo = raw.tipoContratacao;
  if (tipo !== 'CLT' && tipo !== 'MENOR_APRENDIZ' && tipo !== 'ESTAGIO') return raw;

  const verbas = calculateRealTerminationVerbas(
    {
      tipoContratacao: tipo,
      salarioMensal: e.salarioMensal,
      bolsaAuxilio: e.bolsaAuxilio,
      valorContratoPj: e.valorContratoPj,
      fgts: e.fgts,
      dataAdmissao: e.dataAdmissao,
      contratoExperiencia: e.contratoExperiencia,
      dataPrevistaTerminoExperiencia: e.experienciaPeriodo2Fim ?? e.experienciaPeriodo1Fim ?? null,
    },
    {
      terminationDate: parseDateString(terminationDateStr),
      terminationType: e.terminationType ?? 'voluntary',
      isJustCause: e.isJustCause,
      noticeWorked: e.noticeWorked,
      noticePeriodDays: e.noticePeriodDays,
      // Não persistido em coluna própria (só existe no fluxo do wizard) — sem efeito
      // aqui; a indenização Art. 479/480 continua restrita à tela de detalhe.
      earlyTerminationInitiatedBy: null,
    },
    payrollProfile,
  );

  const profile = { ...DEFAULT_PAYROLL_PROFILE, ...payrollProfile };
  const fgtsRate = tipo === 'CLT' ? profile.fgtsRateClt : profile.fgtsRateApprentice;
  const feriasTotal = verbas.feriasProporcionais + verbas.tercoFerias;

  let provisao13Amount = 0;
  let provisaoFeriasAmount = 0;
  let provisaoRecessoAmount = 0;
  let encargosSobreProvisoesAmount = 0;
  let fgtsSobreProvisoesAmount = 0;

  if (tipo === 'CLT' || tipo === 'MENOR_APRENDIZ') {
    provisao13Amount = verbas.decimoTerceiroProporcional;
    provisaoFeriasAmount = feriasTotal;
    const rates13 = sum13thApplicableRates(profile, fgtsRate);
    const ratesVacation = sumVacationApplicableRates(profile, fgtsRate);
    encargosSobreProvisoesAmount = provisao13Amount * rates13 + provisaoFeriasAmount * ratesVacation;
    fgtsSobreProvisoesAmount =
      (profile.applyFgtsOn13th ? provisao13Amount * fgtsRate : 0) +
      (profile.applyFgtsOnVacation ? provisaoFeriasAmount * fgtsRate : 0);
  } else {
    // ESTAGIO — Lei 11.788/2008: recesso proporcional (meses/12 × 30 dias), sem FGTS/encargos
    provisaoRecessoAmount = verbas.recessoProporcional;
  }

  const provisionsAmount = provisao13Amount + provisaoFeriasAmount + provisaoRecessoAmount + encargosSobreProvisoesAmount;
  const chargesAmount = raw.fgtsAmount + raw.inssPatronalAmount + raw.outrosEncargosAmount + encargosSobreProvisoesAmount;
  // `chargesAmount` e `provisionsAmount` acima se sobrepõem de propósito em
  // `encargosSobreProvisoesAmount` (mesma convenção de exibição de `calculatePayrollAnalysisRowsByContractType`,
  // em payrollAnalysis.ts) — por isso `totalMonthlyCost` não pode vir da soma dos dois (contaria
  // esse encargo em dobro); cada componente entra uma única vez, direto da fonte.
  const totalMonthlyCost =
    raw.baseAmount +
    raw.fgtsAmount +
    raw.inssPatronalAmount +
    raw.outrosEncargosAmount +
    encargosSobreProvisoesAmount +
    provisao13Amount +
    provisaoFeriasAmount +
    provisaoRecessoAmount +
    raw.benefitsAmount +
    raw.toolsAmount;

  return {
    ...raw,
    provisao13Amount,
    provisaoFeriasAmount,
    provisaoRecessoAmount,
    encargosSobreProvisoesAmount,
    fgtsSobreProvisoesAmount,
    provisionsAmount,
    chargesAmount,
    totalMonthlyCost,
  };
}

/**
 * Como `calculatePayrollAnalysisRowsByContractType`, mas corrige o(s) segmento(s) do mês
 * do desligamento com as verbas reais de rescisão (ver `correctRescissionSegment`) — usado
 * só pelo regime de caixa (`buildCashRows`), tanto para o mês corrente quanto para o mês
 * anterior (fonte do GPS diferido no mês seguinte, ver JSDoc de `buildCashRows`), para que
 * as duas leituras do mesmo mês de rescisão nunca divirjam entre si.
 */
function calculateCashSegments(
  e: PayrollHistoryEmployeeInput,
  payrollProfile: Partial<PayrollProfile>,
  month: PayrollMonth,
  holidays: Holiday[],
  versions: EmployeeVersionInput[],
): PayrollAnalysisRow[] {
  const rows = calculatePayrollAnalysisRowsByContractType(e, payrollProfile, month, holidays, versions);
  if (!e.terminationDate || !isTerminatedDuring(e, month)) return rows;
  return rows.map((r) =>
    r.tipoContratacao === e.tipoContratacao ? correctRescissionSegment(r, e, payrollProfile, e.terminationDate!) : r,
  );
}

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
    ? calculateCashSegments(e, payrollProfile, month, holidays, versions)
    : [];

  const prevRequiresActive = prevMonth.isCurrent || prevMonth.isFuture;
  const wasEmployedPrevMonth =
    wasEmployedDuringMonth(e, prevMonth) && (!prevRequiresActive || e.terminationDate !== null || e.status === 'ativo');
  const prevMonthSegments = wasEmployedPrevMonth
    ? calculateCashSegments(e, payrollProfile, prevMonth, holidays, versions)
    : [];
  const terminatedPrevMonth = isTerminatedDuring(e, prevMonth);
  // Mês comum: salário/FGTS/GPS do mês anterior inteiro, pago neste mês. Se o mês anterior foi
  // o do desligamento, esses mesmos segmentos já viraram rescisão lá (ver `deferredGpsSegments`
  // abaixo) — não entram aqui de novo.
  const shiftedSegments = terminatedPrevMonth ? [] : prevMonthSegments;
  // GPS pendente da rescisão e o INSS retido sobre ela (mesma guia) chegam juntos aqui — filtra
  // por valor, não só presença, porque Estágio/PJ não geram nenhum dos dois a diferir.
  const deferredGpsSegments = terminatedPrevMonth
    ? prevMonthSegments.filter((r) => gpsAmount(r) + gpsOnProvisionsAmount(r) !== 0 || r.inssFuncionario !== 0)
    : [];

  // Rescisão: mesmos trechos que já formam `currentSegments` (o desligamento, se houver, já
  // está dentro da janela de `month`) — não recalcula, só decide se entram como "salário do mês".
  const rescissionSegments = isTerminatedDuring(e, month) ? currentSegments : [];

  if (currentSegments.length === 0 && shiftedSegments.length === 0 && deferredGpsSegments.length === 0) return [];

  // Tipos de contratação distintos, na ordem em que aparecem — sem troca no mês, sempre um
  // único tipo -> uma única linha, idêntico ao comportamento anterior a este mecanismo.
  const identities: ContractType[] = [];
  for (const r of [...shiftedSegments, ...rescissionSegments, ...currentSegments, ...deferredGpsSegments]) {
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
    const deferredGps = deferredGpsSegments.find((r) => r.tipoContratacao === tipo);

    const benefitsAmount = current?.benefitsAmount ?? 0;
    const toolsAmount = current?.toolsAmount ?? 0;
    // GPS da rescisão deste mês (salário + encargos sobre 13º/férias) não fica aqui — vira
    // `deferredGps` no mês seguinte (ver JSDoc de `buildCashRows`).
    const rescissionGps = gpsAmount(rescission) + gpsOnProvisionsAmount(rescission);
    const deferredGpsValue = gpsAmount(deferredGps) + gpsOnProvisionsAmount(deferredGps);

    return {
      employeeId: e.id,
      nome: e.nome,
      cargo: e.cargo,
      tipoContratacao: tipo,
      baseAmount: add(shifted?.baseAmount, rescission?.baseAmount),
      chargesAmount: add(shifted?.chargesAmount, rescission?.chargesAmount) - rescissionGps + deferredGpsValue,
      fgtsAmount: add(shifted?.fgtsAmount, rescission?.fgtsAmount),
      inssPatronalAmount: add(shifted?.inssPatronalAmount, deferredGps?.inssPatronalAmount),
      outrosEncargosAmount: add(shifted?.outrosEncargosAmount, deferredGps?.outrosEncargosAmount),
      provisionsAmount:
        add(shifted?.provisionsAmount, rescission?.provisionsAmount) -
        gpsOnProvisionsAmount(rescission) +
        gpsOnProvisionsAmount(deferredGps),
      provisao13Amount: add(shifted?.provisao13Amount, rescission?.provisao13Amount),
      provisaoFeriasAmount: add(shifted?.provisaoFeriasAmount, rescission?.provisaoFeriasAmount),
      provisaoRecessoAmount: add(shifted?.provisaoRecessoAmount, rescission?.provisaoRecessoAmount),
      encargosSobreProvisoesAmount:
        add(shifted?.encargosSobreProvisoesAmount, rescission?.encargosSobreProvisoesAmount) -
        gpsOnProvisionsAmount(rescission) +
        gpsOnProvisionsAmount(deferredGps),
      fgtsSobreProvisoesAmount: add(shifted?.fgtsSobreProvisoesAmount, rescission?.fgtsSobreProvisoesAmount),
      benefitsAmount,
      toolsAmount,
      // Sempre os itens atuais do cadastro (referência) — current cobre qualquer mês com
      // algum valor na linha (benefícios/ferramentas nunca vêm só de shifted/rescission/GPS pendente).
      benefitsBreakdown: current?.benefitsBreakdown ?? shifted?.benefitsBreakdown ?? e.benefitsBreakdown,
      toolsBreakdown: current?.toolsBreakdown ?? shifted?.toolsBreakdown ?? e.toolsBreakdown,
      terminationDate: e.terminationDate,
      rescissionBaseAmount: rescission?.baseAmount ?? 0,
      // Só o FGTS mistura o mês da rescisão — INSS Patronal/RAT/Terceiros/Outros dela são
      // sempre diferidos para o mês seguinte (`rescissionGps`), nunca aparecem no mês corrente.
      rescissionChargesAmount: rescission?.fgtsAmount ?? 0,
      rescissionProvisao13Amount: rescission?.provisao13Amount ?? 0,
      rescissionProvisaoFeriasAmount: rescission?.provisaoFeriasAmount ?? 0,
      rescissionProvisaoRecessoAmount: rescission?.provisaoRecessoAmount ?? 0,
      // Só o FGTS sobre as provisões mistura o mês da rescisão — o GPS sobre elas é diferido (`gpsOnProvisionsAmount`).
      rescissionEncargosSobreProvisoesAmount: rescission?.fgtsSobreProvisoesAmount ?? 0,
      totalMonthlyCost:
        salaryOnlyTotal(shifted) + salaryOnlyTotal(rescission) - rescissionGps + deferredGpsValue + benefitsAmount + toolsAmount,
      // Mesma guia (GPS) e mesmo vencimento de inssPatronalAmount/outrosEncargosAmount — por
      // isso também vem de `deferredGps`, não de `rescission`.
      inssFuncionario: add(shifted?.inssFuncionario, deferredGps?.inssFuncionario),
      rescissionInssFuncionarioAmount: deferredGps?.inssFuncionario ?? 0,
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

    // Distinto por colaborador; exclui linha só de GPS pendente de rescisão anterior (`buildCashRows`).
    const headcountRows = rows.filter((r) => r.baseAmount > 0 || r.benefitsAmount > 0 || r.toolsAmount > 0);

    return {
      ...month,
      headcount: new Set(headcountRows.map((r) => r.employeeId)).size,
      ...sumRows(rows),
      rows,
      estimated: !month.isCurrent && !month.isFuture,
      projected: month.isFuture,
    };
  });
}
