import { parseDateString } from '@/lib/formatters';
import { Employee } from '@/hooks/useEmployees';
import { TerminationWizardData } from '@/components/employees/termination-wizard/types';
import { TerminationType } from '@/types/termination';
import { calculateINSS } from '@/lib/netSalaryCalculator';
import { DEFAULT_PAYROLL_PROFILE, PayrollProfile } from '@/types/payrollProfile';

export interface AutoCalcItem {
  desc: string;
  value: number;
  isCredit: boolean;
}

function daysInMonthOf(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Conta avos entre `start` e `end` (inclusive), um por mês do calendário contido no
 * intervalo — cada mês só vale avo completo se ≥15 dias foram trabalhados nele (regra
 * comum ao 13º, Lei 4.090/1962, e às férias proporcionais, Súmula 261 TST).
 */
function countCalendarMonthAvos(start: Date, end: Date): number {
  if (start > end) return 0;
  let avos = 0;
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const isFirstMonth = cursor.getFullYear() === start.getFullYear() && cursor.getMonth() === start.getMonth();
    const isLastMonth = cursor.getFullYear() === end.getFullYear() && cursor.getMonth() === end.getMonth();
    const rangeStartDay = isFirstMonth ? start.getDate() : 1;
    const rangeEndDay = isLastMonth ? end.getDate() : daysInMonthOf(cursor);
    if (rangeEndDay - rangeStartDay + 1 >= 15) avos++;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return Math.min(avos, 12);
}

/**
 * Avos do 13º salário: meses trabalhados no ANO-CALENDÁRIO da rescisão, a partir de
 * 1º/jan (ou da admissão, se posterior) — Lei 4.090/1962. Depende de quanto foi
 * efetivamente trabalhado desde a admissão, não do número do mês da rescisão no ano.
 */
function thirteenthAvos(admissionDate: Date, terminationDate: Date): number {
  const yearStart = new Date(terminationDate.getFullYear(), 0, 1);
  const periodStart = admissionDate > yearStart ? admissionDate : yearStart;
  return countCalendarMonthAvos(periodStart, terminationDate);
}

/**
 * Avos de férias proporcionais: meses do período aquisitivo EM CURSO (a partir do
 * aniversário de admissão mais recente anterior à rescisão), cada mês contado a partir
 * do dia de admissão — não do 1º do mês do calendário — CLT Art. 146 §único.
 */
function vacationAvos(admissionDate: Date, terminationDate: Date): number {
  let periodStart = new Date(admissionDate);
  while (true) {
    const nextAnniversary = new Date(periodStart.getFullYear() + 1, periodStart.getMonth(), periodStart.getDate());
    if (nextAnniversary > terminationDate) break;
    periodStart = nextAnniversary;
  }
  if (periodStart > terminationDate) return 0;

  let avos = 0;
  let cursor = periodStart;
  while (true) {
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    if (nextMonth <= terminationDate) {
      avos++;
      cursor = nextMonth;
      continue;
    }
    // +1: contagem inclusiva de dias (de `cursor` até `terminationDate`, ambos incluídos),
    // igual à convenção usada no saldo de salário e em `countCalendarMonthAvos`.
    const daysIntoPartialMonth = Math.round((terminationDate.getTime() - cursor.getTime()) / 86400000) + 1;
    if (daysIntoPartialMonth >= 15) avos++;
    break;
  }
  return Math.min(avos, 12);
}

export interface TerminationVerbaInputs {
  terminationDate: Date;
  terminationType: TerminationType;
  isJustCause: boolean;
  noticeWorked: boolean;
  noticePeriodDays: number;
  /** Não existe como coluna no banco (só no wizard) — assume indenizado (`true`) quando ausente. */
  noticeIndemnifiedByCompany?: boolean;
  /** Só relevante quando `terminationType === 'early_contract_termination'` — decide Art.
   *  479 CLT (empresa, crédito) vs Art. 480 CLT (funcionário, débito). */
  earlyTerminationInitiatedBy?: 'company' | 'employee' | null;
}

/** Subconjunto de `Employee` necessário para calcular verbas — permite reuso por qualquer
 *  chamador que tenha esses campos (ex.: segmento de `employee_versions` na Folha de Pagamento),
 *  sem depender do tipo completo de cadastro do wizard. */
export interface TerminationVerbaEmployee {
  tipoContratacao: Employee['tipoContratacao'];
  salarioMensal: number;
  bolsaAuxilio: number;
  valorContratoPj: number;
  fgts: number;
  dataAdmissao: string | null;
  /** Contrato de experiência (CLT Art. 445 §único) — só relevante para CLT. */
  contratoExperiencia?: boolean;
  /** Data prevista de término do contrato de experiência (já refletindo prorrogação, se
   *  houver) — ISO yyyy-MM-dd. Só considerada quando `contratoExperiencia` é `true`. */
  dataPrevistaTerminoExperiencia?: string | null;
}

export interface TerminationVerbas {
  saldoSalario: number;
  feriasProporcionais: number;
  tercoFerias: number;
  decimoTerceiroProporcional: number;
  avisoPrevio: number;
  avisoPrevioIsCredit: boolean;
  multaFgts: number;
  multaFgtsLabel: string;
  recessoProporcional: number;
  recessoDias: number;
  pagamentoProporcionalPJ: number;
  /** Art. 479/480 CLT — rescisão antes do fim previsto do contrato de experiência. */
  indenizacaoRescisaoAntecipada: number;
  indenizacaoRescisaoAntecipadaIsCredit: boolean;
  indenizacaoRescisaoAntecipadaLabel: string;
  /** Informativos — não entram no crédito/débito pago ao empregado (FGTS vai pro FUNDO de
   *  garantia, INSS é retido do próprio saldo/13º já computados acima). */
  fgtsSaldoSalario: number;
  fgtsDecimoTerceiro: number;
  inssRetidoSaldoSalario: number;
  inssRetidoDecimoTerceiro: number;
}

/**
 * Calcula as verbas rescisórias reais (valores brutos) por tipo de contratação — fonte
 * única usada tanto pelo wizard/detalhe da rescisão (`calculateAutoCalcs`, abaixo) quanto
 * pela Folha de Pagamento, que aplica encargos patronais sobre estes valores.
 *
 * CLT Art. 477/482/484-A, Lei 8.036/90 (FGTS), Lei 12.506/2011 (aviso prévio),
 * Lei 11.788/2008 (estágio), Lei 10.097/2000 (menor aprendiz).
 */
export function calculateRealTerminationVerbas(
  employee: TerminationVerbaEmployee,
  inputs: TerminationVerbaInputs,
  payrollProfile?: Partial<PayrollProfile>,
): TerminationVerbas {
  const profile = { ...DEFAULT_PAYROLL_PROFILE, ...payrollProfile };
  const salary = employee.salarioMensal;
  const termDate = inputs.terminationDate;
  const dayOfMonth = termDate.getDate();
  const daysInMonth = daysInMonthOf(termDate);

  const parsedAdmDate = employee.dataAdmissao ? parseDateString(employee.dataAdmissao) : null;
  const admDate = parsedAdmDate && !isNaN(parsedAdmDate.getTime()) ? parsedAdmDate : null;

  let monthsWorked = 0;
  if (admDate) {
    monthsWorked =
      (termDate.getFullYear() - admDate.getFullYear()) * 12 +
      (termDate.getMonth() - admDate.getMonth());
  }
  const vacationAvosCount = admDate ? vacationAvos(admDate, termDate) : 0;
  const thirteenthAvosCount = admDate ? thirteenthAvos(admDate, termDate) : 0;

  const verbas: TerminationVerbas = {
    saldoSalario: 0,
    feriasProporcionais: 0,
    tercoFerias: 0,
    decimoTerceiroProporcional: 0,
    avisoPrevio: 0,
    avisoPrevioIsCredit: true,
    multaFgts: 0,
    multaFgtsLabel: '',
    recessoProporcional: 0,
    recessoDias: 0,
    pagamentoProporcionalPJ: 0,
    indenizacaoRescisaoAntecipada: 0,
    indenizacaoRescisaoAntecipadaIsCredit: true,
    indenizacaoRescisaoAntecipadaLabel: '',
    fgtsSaldoSalario: 0,
    fgtsDecimoTerceiro: 0,
    inssRetidoSaldoSalario: 0,
    inssRetidoDecimoTerceiro: 0,
  };

  switch (employee.tipoContratacao) {
    case 'CLT':
    case 'MENOR_APRENDIZ': {
      const fgtsRate = employee.tipoContratacao === 'CLT' ? profile.fgtsRateClt : profile.fgtsRateApprentice;

      verbas.saldoSalario = (salary / daysInMonth) * dayOfMonth;
      verbas.fgtsSaldoSalario = verbas.saldoSalario * fgtsRate;
      verbas.inssRetidoSaldoSalario = calculateINSS(verbas.saldoSalario).total;

      // Justa causa (Art. 482 CLT): perde férias, 13º, aviso prévio indenizado e multa/FGTS acumulado
      if (inputs.isJustCause) break;

      verbas.feriasProporcionais = (salary / 12) * vacationAvosCount;
      verbas.tercoFerias = verbas.feriasProporcionais / 3;
      verbas.decimoTerceiroProporcional = (salary / 12) * thirteenthAvosCount;
      verbas.fgtsDecimoTerceiro = verbas.decimoTerceiroProporcional * fgtsRate;
      verbas.inssRetidoDecimoTerceiro = calculateINSS(verbas.decimoTerceiroProporcional).total;

      if (employee.tipoContratacao === 'CLT' && inputs.terminationType === 'early_contract_termination') {
        // Art. 479 (empresa, crédito) / 480 (funcionário, débito): metade da remuneração do
        // período restante. Só calcula com data prevista rastreada; sem ela, ajuste manual.
        const experienciaEndDate =
          employee.contratoExperiencia && employee.dataPrevistaTerminoExperiencia
            ? parseDateString(employee.dataPrevistaTerminoExperiencia)
            : null;
        const hasKnownEndDate =
          !!experienciaEndDate && !isNaN(experienciaEndDate.getTime()) && termDate < experienciaEndDate;

        if (hasKnownEndDate) {
          const remainingDays =
            Math.round((experienciaEndDate!.getTime() - addDays(termDate, 1).getTime()) / 86400000) + 1;
          const indemnity = ((salary / 30) * remainingDays) / 2;
          if (inputs.earlyTerminationInitiatedBy === 'company') {
            verbas.indenizacaoRescisaoAntecipada = indemnity;
            verbas.indenizacaoRescisaoAntecipadaIsCredit = true;
            verbas.indenizacaoRescisaoAntecipadaLabel = 'Indenização Art. 479 CLT (rescisão antecipada do contrato de experiência)';
          } else if (inputs.earlyTerminationInitiatedBy === 'employee') {
            verbas.indenizacaoRescisaoAntecipada = indemnity;
            verbas.indenizacaoRescisaoAntecipadaIsCredit = false;
            verbas.indenizacaoRescisaoAntecipadaLabel = 'Desconto Art. 480 CLT (rescisão antecipada do contrato de experiência)';
          }
        }
      } else if (employee.tipoContratacao === 'CLT') {
        if (inputs.terminationType === 'involuntary') {
          verbas.multaFgts = employee.fgts * monthsWorked * 0.4;
          verbas.multaFgtsLabel = 'Multa FGTS 40% (Art. 18 §1º Lei 8.036/90)';
        } else if (inputs.terminationType === 'mutual_agreement') {
          verbas.multaFgts = employee.fgts * monthsWorked * 0.2;
          verbas.multaFgtsLabel = 'Multa FGTS 20% (CLT Art. 484-A)';
        }
        // Súmula 163 TST: contrato por prazo determinado encerrado na data prevista não
        // gera aviso prévio (indenizado ou descontado) — só se aplica a prazo indeterminado.
        if (!inputs.noticeWorked && inputs.noticePeriodDays > 0 && inputs.terminationType !== 'contract_end') {
          verbas.avisoPrevio = (salary / 30) * inputs.noticePeriodDays;
          verbas.avisoPrevioIsCredit = inputs.noticeIndemnifiedByCompany ?? true;
        }
      } else {
        // MENOR_APRENDIZ — Lei 10.097/2000: FGTS 2%, sem multa no término regular de prazo determinado
        verbas.multaFgts = salary * 0.02 * monthsWorked;
        verbas.multaFgtsLabel = 'FGTS acumulado (alíquota 2%)';
      }
      break;
    }

    case 'ESTAGIO': {
      const stipend = employee.bolsaAuxilio || salary;
      verbas.saldoSalario = (stipend / daysInMonth) * dayOfMonth;
      // Lei 11.788/2008: recesso 30 dias/ano proporcional, sem 1/3
      verbas.recessoDias = (monthsWorked / 12) * 30;
      verbas.recessoProporcional = (stipend / 30) * verbas.recessoDias;
      break;
    }

    case 'PJ': {
      // Pagamento proporcional ao período trabalhado no mês, sem encargos CLT (CA3)
      const contractValue = employee.valorContratoPj || 0;
      if (contractValue > 0) {
        verbas.pagamentoProporcionalPJ = (contractValue / daysInMonth) * dayOfMonth;
      }
      break;
    }

    case 'SOCIO':
      // Saída de sócio é tratada via contrato social — sem cálculos automáticos (CA3)
      break;

    default:
      // CA4: tipo não suportado → sem cálculo automático; registrar via ajuste manual
      break;
  }

  return verbas;
}

/**
 * Monta os itens de exibição do wizard/detalhe da rescisão E as verbas reais completas
 * (incluindo FGTS/INSS informativos, que não entram em `items` — ver `TerminationVerbas`)
 * a partir de `calculateRealTerminationVerbas` — mesmo formato usado por essas telas.
 */
export function calculateTerminationBreakdown(
  employee: Employee,
  data: TerminationWizardData,
  payrollProfile?: Partial<PayrollProfile>,
): { items: AutoCalcItem[]; verbas: TerminationVerbas } {
  const termDate = data.termination_date ? parseDateString(data.termination_date) : new Date();
  const dayOfMonth = termDate.getDate();
  const daysInMonth = daysInMonthOf(termDate);

  const verbas = calculateRealTerminationVerbas(
    {
      ...employee,
      // Resolve para a data prevista do período em vigor (2º período se houve prorrogação).
      dataPrevistaTerminoExperiencia: employee.experienciaPeriodo2Fim ?? employee.experienciaPeriodo1Fim ?? null,
    },
    {
      terminationDate: termDate,
      terminationType: data.termination_type,
      isJustCause: data.is_just_cause,
      noticeWorked: data.notice_worked,
      noticePeriodDays: data.notice_period_days,
      noticeIndemnifiedByCompany: data.notice_indemnified_by_company,
      earlyTerminationInitiatedBy: data.early_termination_initiated_by,
    },
    payrollProfile,
  );

  const items: AutoCalcItem[] = [];
  const contractType = employee.tipoContratacao;

  switch (contractType) {
    case 'CLT':
    case 'MENOR_APRENDIZ': {
      items.push({ desc: `Saldo de salário (${dayOfMonth} dias)`, value: verbas.saldoSalario, isCredit: true });
      if (verbas.inssRetidoSaldoSalario > 0) {
        items.push({ desc: 'INSS retido s/ saldo de salário', value: verbas.inssRetidoSaldoSalario, isCredit: false });
      }
      if (data.is_just_cause) break;

      items.push({
        desc: 'Férias proporcionais + 1/3',
        value: verbas.feriasProporcionais + verbas.tercoFerias,
        isCredit: true,
      });
      items.push({ desc: '13º proporcional', value: verbas.decimoTerceiroProporcional, isCredit: true });
      if (verbas.inssRetidoDecimoTerceiro > 0) {
        items.push({ desc: 'INSS retido s/ 13º proporcional', value: verbas.inssRetidoDecimoTerceiro, isCredit: false });
      }

      if (verbas.multaFgts > 0) {
        items.push({ desc: verbas.multaFgtsLabel, value: verbas.multaFgts, isCredit: true });
      }
      if (verbas.indenizacaoRescisaoAntecipada > 0) {
        items.push({
          desc: verbas.indenizacaoRescisaoAntecipadaLabel,
          value: verbas.indenizacaoRescisaoAntecipada,
          isCredit: verbas.indenizacaoRescisaoAntecipadaIsCredit,
        });
      }
      if (verbas.avisoPrevio > 0) {
        items.push({
          desc: `Aviso prévio ${verbas.avisoPrevioIsCredit ? 'indenizado' : '(desconto)'}`,
          value: verbas.avisoPrevio,
          isCredit: verbas.avisoPrevioIsCredit,
        });
      }
      break;
    }

    case 'ESTAGIO': {
      items.push({ desc: `Saldo de bolsa-auxílio (${dayOfMonth} dias)`, value: verbas.saldoSalario, isCredit: true });
      if (verbas.recessoProporcional > 0) {
        items.push({
          desc: `Recesso remunerado proporcional (${Math.round(verbas.recessoDias)} dias)`,
          value: verbas.recessoProporcional,
          isCredit: true,
        });
      }
      break;
    }

    case 'PJ': {
      if (verbas.pagamentoProporcionalPJ > 0) {
        items.push({
          desc: `Pagamento proporcional PJ (${dayOfMonth}/${daysInMonth} dias)`,
          value: verbas.pagamentoProporcionalPJ,
          isCredit: true,
        });
      }
      break;
    }

    case 'SOCIO':
    default:
      break;
  }

  return { items, verbas };
}

/** Wrapper fino de `calculateTerminationBreakdown` para os chamadores que só precisam da
 *  lista de itens de crédito/débito (persistência, fallback de exibição). */
export function calculateAutoCalcs(
  employee: Employee,
  data: TerminationWizardData,
  payrollProfile?: Partial<PayrollProfile>,
): AutoCalcItem[] {
  return calculateTerminationBreakdown(employee, data, payrollProfile).items;
}
