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

export interface PayrollLineItem {
  name: string;
  value: number;
}

export interface PayrollAnalysisEmployeeInput {
  id: string;
  nome: string;
  cargo: string;
  status: string;
  /** Só usado por buildPayrollHistory (Custo x Hora) — buildCashPayrollHistory (Folha de Pagamento) ignora este campo de propósito. */
  alocaEmProjetos: boolean;
  tipoContratacao: ContractType;
  salarioMensal: number;
  bolsaAuxilio: number;
  valorContratoPj: number;
  proLabore: number;
  dividendos: number;
  totalBenefitsCost: number;
  totalToolsCost: number;
  /** Itens de benefício ATIVOS hoje — sem histórico por item, então mostrados como referência atual mesmo em meses passados. */
  benefitsBreakdown: PayrollLineItem[];
  /** Itens de ferramenta ATIVOS hoje — mesma ressalva de `benefitsBreakdown`. */
  toolsBreakdown: PayrollLineItem[];
  /** Horas de trabalho por dia — usada para calcular o volume de horas úteis do mês (Custo/Hora). */
  jornadaDiaria: number;
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

/**
 * Marco financeiro do colaborador (employee_versions) — captura tipo de contratação,
 * salário, pró-labore, jornada e cargo vigentes a partir de `effectiveFrom`. Usada para
 * corrigir o cálculo em meses passados quando esses campos mudaram (ex.: transição
 * Menor Aprendiz -> CLT). `bolsaAuxilio`/`valorContratoPj`/`dividendos` são versionados
 * como os demais campos financeiros principais, mas podem ser `null` em versões criadas
 * antes desses campos existirem — cai para o cadastro atual nesse caso, mesmo
 * comportamento de antes. `totalBenefitsCost`/`totalToolsCost` só existem (não nulos) em
 * versões já fechadas (congelados no fechamento); a versão aberta usa a soma ao vivo do
 * cadastro atual.
 */
export interface EmployeeVersionInput {
  employeeId: string;
  /** 'YYYY-MM-DD' */
  effectiveFrom: string;
  /** 'YYYY-MM-DD' exclusivo (o dia em que a próxima versão começa), ou null se é a versão aberta/atual. */
  effectiveUntil: string | null;
  tipoContratacao: ContractType;
  salarioMensal: number;
  proLabore: number;
  jornadaDiaria: number;
  bolsaAuxilio: number | null;
  valorContratoPj: number | null;
  dividendos: number | null;
  totalBenefitsCost: number | null;
  totalToolsCost: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * MS_PER_DAY);

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

/** Fração pró-rata (dias corridos de `window` ÷ dias do mês) — 0 se `window` é null. */
function calendarFractionForWindow(window: { start: Date; end: Date } | null, daysInMonth: number): number {
  if (!window) return 0;
  const workedDays = Math.round((window.end.getTime() - window.start.getTime()) / MS_PER_DAY) + 1;
  return Math.min(1, workedDays / daysInMonth);
}

/** Dias úteis (considerando feriados) dentro de `window` — 0 se `window` é null. */
function businessDaysForWindow(window: { start: Date; end: Date } | null, holidays: Holiday[]): number {
  if (!window) return 0;
  return countWorkingDays(window.start, window.end, holidays);
}

interface ResolvedSegment {
  start: Date;
  end: Date;
  tipoContratacao: ContractType;
  salarioMensal: number;
  proLabore: number;
  jornadaDiaria: number;
  bolsaAuxilio: number;
  valorContratoPj: number;
  dividendos: number;
  totalBenefitsCost: number;
  totalToolsCost: number;
}

/**
 * Segmentos do mês por marco financeiro (employee_versions) que se sobrepõem a ele,
 * recortados pela janela de emprego (admissão/desligamento) e ordenados
 * cronologicamente — permite que uma mudança de tipo de contratação/salário/jornada
 * no meio do histórico (ex.: Menor Aprendiz -> CLT) seja refletida corretamente nos
 * meses antigos, em vez de aplicar retroativamente os dados atuais do cadastro.
 * Sem versões que se sobreponham ao mês, cai para um único segmento com os dados
 * atuais do cadastro — mesmo comportamento (estimado) de antes desta função existir.
 */
function resolveVersionSegments(
  e: PayrollAnalysisEmployeeInput,
  versions: EmployeeVersionInput[],
  monthStart: Date,
  monthEnd: Date,
): ResolvedSegment[] {
  const employmentWindow = effectiveEmploymentWindow(e, monthStart, monthEnd);
  if (!employmentWindow) return [];

  const currentSegment = (start: Date, end: Date): ResolvedSegment => ({
    start,
    end,
    tipoContratacao: e.tipoContratacao,
    salarioMensal: e.salarioMensal,
    proLabore: e.proLabore,
    jornadaDiaria: e.jornadaDiaria,
    bolsaAuxilio: e.bolsaAuxilio,
    valorContratoPj: e.valorContratoPj,
    dividendos: e.dividendos,
    totalBenefitsCost: e.totalBenefitsCost,
    totalToolsCost: e.totalToolsCost,
  });

  const overlapping = versions
    .filter((v) => v.employeeId === e.id)
    .filter((v) => {
      const vStart = parseDateString(v.effectiveFrom);
      const vEnd = v.effectiveUntil ? parseDateString(v.effectiveUntil) : null;
      return vStart <= monthEnd && (!vEnd || vEnd > monthStart);
    })
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));

  // Duas versões com o mesmo (effectiveFrom, effectiveUntil) já ocorreram na prática (duplo
  // clique em "Novo Marco Financeiro") e contariam o período em dobro — salvaguarda de cálculo.
  const deduped: EmployeeVersionInput[] = [];
  for (const v of overlapping) {
    const isDuplicate = deduped.some(
      (kept) => kept.effectiveFrom === v.effectiveFrom && kept.effectiveUntil === v.effectiveUntil,
    );
    if (!isDuplicate) deduped.push(v);
  }

  const versionSegments = deduped
    .map((v): ResolvedSegment => {
      const vStart = parseDateString(v.effectiveFrom);
      const vEndExclusive = v.effectiveUntil ? parseDateString(v.effectiveUntil) : addDays(monthEnd, 1);
      const segStart = vStart > employmentWindow.start ? vStart : employmentWindow.start;
      const segEndInclusive = addDays(vEndExclusive, -1);
      const segEnd = segEndInclusive < employmentWindow.end ? segEndInclusive : employmentWindow.end;
      return {
        start: segStart,
        end: segEnd,
        tipoContratacao: v.tipoContratacao,
        salarioMensal: v.salarioMensal,
        proLabore: v.proLabore,
        jornadaDiaria: v.jornadaDiaria,
        bolsaAuxilio: v.bolsaAuxilio ?? e.bolsaAuxilio,
        valorContratoPj: v.valorContratoPj ?? e.valorContratoPj,
        dividendos: v.dividendos ?? e.dividendos,
        totalBenefitsCost: v.totalBenefitsCost ?? e.totalBenefitsCost,
        totalToolsCost: v.totalToolsCost ?? e.totalToolsCost,
      };
    })
    .filter((seg) => seg.start <= seg.end);

  if (versionSegments.length === 0) {
    return [currentSegment(employmentWindow.start, employmentWindow.end)];
  }

  // Preenche com os dados atuais qualquer trecho da janela de emprego não coberto por versão
  // (histórico incompleto é um caso real já conhecido) — senão zerava base/encargos/horas.
  const filled: ResolvedSegment[] = [];
  let cursor = employmentWindow.start;
  for (const seg of versionSegments) {
    if (seg.start > cursor) filled.push(currentSegment(cursor, addDays(seg.start, -1)));
    filled.push(seg);
    cursor = addDays(seg.end, 1);
  }
  if (cursor <= employmentWindow.end) filled.push(currentSegment(cursor, employmentWindow.end));

  return filled;
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
  /** Provisão de 13º salário (principal, sem encargos) — parte de `provisionsAmount`. */
  provisao13Amount: number;
  /** Provisão de férias + 1/3 (principal, sem encargos) — parte de `provisionsAmount`. */
  provisaoFeriasAmount: number;
  /** Provisão de recesso remunerado (só Estágio) — parte de `provisionsAmount`. */
  provisaoRecessoAmount: number;
  /** FGTS + INSS Patronal incidentes sobre as provisões acima — parte de `provisionsAmount`. */
  encargosSobreProvisoesAmount: number;
  /** Fatia de `encargosSobreProvisoesAmount` que é só FGTS — resto é GPS (INSS Patronal + RAT/Terceiros/Outros), usado pela Folha de Pagamento (regime de caixa) para diferir o GPS da rescisão ao mês seguinte, como já faz com `inssPatronalAmount`/`outrosEncargosAmount`. */
  fgtsSobreProvisoesAmount: number;
  benefitsAmount: number;
  toolsAmount: number;
  /** Itens de benefício ATIVOS hoje (referência) — ver ressalva em `PayrollAnalysisEmployeeInput`. */
  benefitsBreakdown: PayrollLineItem[];
  /** Itens de ferramenta ATIVOS hoje (referência) — ver ressalva em `PayrollAnalysisEmployeeInput`. */
  toolsBreakdown: PayrollLineItem[];
  /** Data efetiva de desligamento ('YYYY-MM-DD'), ou null se nunca desligado — repassada de `PayrollAnalysisEmployeeInput.terminationDate`. */
  terminationDate: string | null;
  /**
   * Fatia de `baseAmount` referente ao saldo de salário da rescisão deste mês (regime de
   * caixa) — 0 fora do mês de desligamento e no regime de competência (Custo x Hora), onde
   * não há mistura de meses. O resto de `baseAmount` é o salário do mês anterior, já pago
   * normalmente (ver `buildCashRows` em payrollHistory.ts).
   */
  rescissionBaseAmount: number;
  /** Fatia de `fgtsAmount` referente ao FGTS sobre o saldo de salário da rescisão deste mês — mesma ressalva de `rescissionBaseAmount`. INSS Patronal/RAT/Terceiros da rescisão nunca entram no mês corrente (diferidos para o mês seguinte via GPS, ver `deferredGpsSegments`). */
  rescissionChargesAmount: number;
  /** Fatia de `provisao13Amount` liquidada na rescisão deste mês — mesma ressalva de `rescissionBaseAmount`. */
  rescissionProvisao13Amount: number;
  /** Fatia de `provisaoFeriasAmount` liquidada na rescisão deste mês — mesma ressalva de `rescissionBaseAmount`. */
  rescissionProvisaoFeriasAmount: number;
  /** Fatia de `provisaoRecessoAmount` liquidada na rescisão deste mês — mesma ressalva de `rescissionBaseAmount`. */
  rescissionProvisaoRecessoAmount: number;
  /** Fatia de `encargosSobreProvisoesAmount` atribuível à rescisão deste mês — só o FGTS (`fgtsSobreProvisoesAmount`), já que o GPS sobre as provisões da rescisão é diferido para o mês seguinte, igual `rescissionChargesAmount`. */
  rescissionEncargosSobreProvisoesAmount: number;
  /** Fatia de `inssFuncionario` referente ao INSS retido sobre o saldo de salário da rescisão deste mês — mesma ressalva de `rescissionBaseAmount`. */
  rescissionInssFuncionarioAmount: number;
  totalMonthlyCost: number;
  /**
   * INSS retido do colaborador (tabela progressiva) — descontado do próprio
   * salário bruto, não é custo do empregador. Informativo, para conferência
   * do GPS/eSocial; não soma em `totalMonthlyCost` nem em `chargesAmount`.
   */
  inssFuncionario: number;
  /** Horas úteis que o colaborador efetivamente trabalha no mês (jornada diária × dias úteis, já considerando admissão/desligamento parcial). */
  hoursWorked: number;
  /**
   * `totalMonthlyCost ÷ hoursWorked` — mesma fórmula de `getFallbackHourlyCost`
   * (src/lib/employeeCost.ts), mas usando as horas realmente trabalhadas no mês
   * em vez do mês cheio, para refletir admissão/desligamento parcial.
   */
  hourlyCost: number;
}

/**
 * Linha de custo de um único colaborador — reaproveitada tanto pela folha atual quanto
 * pela evolução histórica. `versions` (marcos financeiros do colaborador, já filtrados
 * para este `e.id`) permite corrigir o cálculo quando tipo de contratação/salário/
 * pró-labore/jornada mudaram no meio do histórico — sem nenhuma versão que se
 * sobreponha ao mês, o comportamento é idêntico ao anterior (estimado com os dados
 * atuais do cadastro).
 */
export function calculatePayrollAnalysisRow(
  e: PayrollAnalysisEmployeeInput,
  payrollProfile: Partial<PayrollProfile>,
  month: PayrollMonthWindow,
  holidays: Holiday[],
  versions: EmployeeVersionInput[] = [],
): PayrollAnalysisRow {
  const monthStart = parseDateString(month.start);
  const monthEnd = parseDateString(month.end);
  const daysInMonth = monthEnd.getDate();
  const businessDaysInMonth = getBusinessDaysInMonth(monthStart.getFullYear(), monthStart.getMonth(), holidays);

  const segments = resolveVersionSegments(e, versions, monthStart, monthEnd);

  // Ferramentas: valor cheio do mês, sem proporcionalidade — usa o segmento vigente no fim do
  // período empregado (não faz sentido "ratear" uma cobrança de valor cheio por segmento).
  const toolsAmount = segments[segments.length - 1]?.totalToolsCost ?? e.totalToolsCost;

  let baseAmount = 0;
  let chargesAmount = 0;
  let fgtsAmount = 0;
  let inssPatronalAmount = 0;
  let outrosEncargosAmount = 0;
  let provisionsAmount = 0;
  let provisao13Amount = 0;
  let provisaoFeriasAmount = 0;
  let provisaoRecessoAmount = 0;
  let encargosSobreProvisoesAmount = 0;
  let fgtsSobreProvisoesAmount = 0;
  let inssFuncionario = 0;
  let benefitsAmount = 0;
  let salaryOnlyCost = 0;
  let hoursWorked = 0;
  let tipoContratacaoForRow = e.tipoContratacao;

  for (const seg of segments) {
    tipoContratacaoForRow = seg.tipoContratacao;
    const segFraction = calendarFractionForWindow({ start: seg.start, end: seg.end }, daysInMonth);
    const segBusinessDays = businessDaysForWindow({ start: seg.start, end: seg.end }, holidays);

    // Benefícios: ponderados por dias úteis de cada segmento dentro do mês — se o marco
    // financeiro muda no meio do mês, cada trecho contribui só a sua parte proporcional.
    if (businessDaysInMonth > 0) benefitsAmount += (seg.totalBenefitsCost / businessDaysInMonth) * segBusinessDays;
    hoursWorked += segBusinessDays * seg.jornadaDiaria;

    if (segFraction <= 0) continue;

    // Encargos sobre provisões de 13º/férias entram em `provisionsAmount`, não aqui.
    const breakdown = calculateEmployeeCost({
      tipoContratacao: seg.tipoContratacao,
      salarioBruto: seg.salarioMensal * segFraction,
      bolsaAuxilio: seg.bolsaAuxilio * segFraction,
      valorContratoPj: seg.valorContratoPj * segFraction,
      proLabore: seg.proLabore * segFraction,
      dividendos: seg.dividendos * segFraction,
      benefitsTotalMonthly: 0,
      toolsTotalMonthly: 0,
      payrollProfile,
    });

    const encargosSobreProvisoes = breakdown.details.encargos13 + breakdown.details.encargosFerias;

    baseAmount += breakdown.baseAmount;
    chargesAmount += breakdown.chargesAmount;
    fgtsAmount += breakdown.details.fgts;
    inssPatronalAmount += breakdown.details.inss;
    outrosEncargosAmount += breakdown.chargesAmount - breakdown.details.fgts - breakdown.details.inss - encargosSobreProvisoes;
    provisionsAmount += breakdown.provisionsAmount + encargosSobreProvisoes;
    provisao13Amount += breakdown.details.provisao13;
    provisaoFeriasAmount += breakdown.details.provisaoFerias;
    provisaoRecessoAmount += breakdown.details.provisaoRecesso;
    encargosSobreProvisoesAmount += encargosSobreProvisoes;
    fgtsSobreProvisoesAmount += breakdown.details.fgts13 + breakdown.details.fgtsFerias;
    inssFuncionario += breakdown.details.inssFuncionario;
    // totalMonthlyCost de cada segmento já exclui benefícios/ferramentas (passados como 0
    // acima) — soma o total autoritativo do segmento em vez de rederivar de
    // chargesAmount+provisionsAmount, que se sobrepõem por design (ver payrollHistory.ts).
    salaryOnlyCost += breakdown.totalMonthlyCost;
  }

  const totalMonthlyCost = salaryOnlyCost + benefitsAmount + toolsAmount;
  const hourlyCost = hoursWorked > 0 ? totalMonthlyCost / hoursWorked : 0;

  return {
    employeeId: e.id,
    nome: e.nome,
    cargo: e.cargo,
    tipoContratacao: tipoContratacaoForRow,
    baseAmount,
    chargesAmount,
    fgtsAmount,
    inssPatronalAmount,
    outrosEncargosAmount,
    provisionsAmount,
    provisao13Amount,
    provisaoFeriasAmount,
    provisaoRecessoAmount,
    encargosSobreProvisoesAmount,
    fgtsSobreProvisoesAmount,
    benefitsAmount,
    toolsAmount,
    benefitsBreakdown: e.benefitsBreakdown,
    toolsBreakdown: e.toolsBreakdown,
    terminationDate: e.terminationDate,
    // Sem mistura salário/rescisão em regime de competência — só `buildCashRows` popula estes campos.
    rescissionBaseAmount: 0,
    rescissionChargesAmount: 0,
    rescissionProvisao13Amount: 0,
    rescissionProvisaoFeriasAmount: 0,
    rescissionProvisaoRecessoAmount: 0,
    rescissionEncargosSobreProvisoesAmount: 0,
    rescissionInssFuncionarioAmount: 0,
    totalMonthlyCost,
    inssFuncionario,
    hoursWorked,
    hourlyCost,
  };
}

interface ContractTypeGroupAccum {
  tipoContratacao: ContractType;
  baseAmount: number;
  chargesAmount: number;
  fgtsAmount: number;
  inssPatronalAmount: number;
  outrosEncargosAmount: number;
  provisionsAmount: number;
  provisao13Amount: number;
  provisaoFeriasAmount: number;
  provisaoRecessoAmount: number;
  encargosSobreProvisoesAmount: number;
  fgtsSobreProvisoesAmount: number;
  benefitsAmount: number;
  toolsAmount: number;
  inssFuncionario: number;
  salaryOnlyCost: number;
  hoursWorked: number;
}

function newContractTypeGroup(tipoContratacao: ContractType): ContractTypeGroupAccum {
  return {
    tipoContratacao,
    baseAmount: 0,
    chargesAmount: 0,
    fgtsAmount: 0,
    inssPatronalAmount: 0,
    outrosEncargosAmount: 0,
    provisionsAmount: 0,
    provisao13Amount: 0,
    provisaoFeriasAmount: 0,
    provisaoRecessoAmount: 0,
    encargosSobreProvisoesAmount: 0,
    fgtsSobreProvisoesAmount: 0,
    benefitsAmount: 0,
    toolsAmount: 0,
    inssFuncionario: 0,
    salaryOnlyCost: 0,
    hoursWorked: 0,
  };
}

/**
 * Como `calculatePayrollAnalysisRow`, mas retorna uma linha para CADA trecho contínuo de
 * tipo de contratação dentro do mês, em vez de somar tudo numa linha só — usada apenas
 * pela Folha de Pagamento (regime de caixa), quando o colaborador troca de tipo de
 * contratação no meio do mês (ex.: Estagiário -> CLT), para que cada trecho apareça como
 * sua própria linha auditável. Custo x Hora não usa esta função — continua com uma linha
 * só por mês via `calculatePayrollAnalysisRow`. A soma das linhas retornadas aqui é sempre
 * igual, campo a campo, ao resultado de `calculatePayrollAnalysisRow` para os mesmos
 * argumentos (mesmo cálculo por segmento, só agrupado em vez de somado).
 */
export function calculatePayrollAnalysisRowsByContractType(
  e: PayrollAnalysisEmployeeInput,
  payrollProfile: Partial<PayrollProfile>,
  month: PayrollMonthWindow,
  holidays: Holiday[],
  versions: EmployeeVersionInput[] = [],
): PayrollAnalysisRow[] {
  const monthStart = parseDateString(month.start);
  const monthEnd = parseDateString(month.end);
  const daysInMonth = monthEnd.getDate();
  const businessDaysInMonth = getBusinessDaysInMonth(monthStart.getFullYear(), monthStart.getMonth(), holidays);

  const segments = resolveVersionSegments(e, versions, monthStart, monthEnd);
  if (segments.length === 0) return [];

  // Ferramentas: valor cheio do mês, sem proporcionalidade — atribuído inteiramente ao trecho
  // vigente no fim do período empregado (mesma regra de `calculatePayrollAnalysisRow`); os
  // demais trechos não recebem nada, para a soma entre linhas não contar em dobro.
  const toolsAmountForRow = segments[segments.length - 1].totalToolsCost;

  const groups: ContractTypeGroupAccum[] = [];

  segments.forEach((seg, i) => {
    let group = groups[groups.length - 1];
    if (!group || group.tipoContratacao !== seg.tipoContratacao) {
      group = newContractTypeGroup(seg.tipoContratacao);
      groups.push(group);
    }

    const segFraction = calendarFractionForWindow({ start: seg.start, end: seg.end }, daysInMonth);
    const segBusinessDays = businessDaysForWindow({ start: seg.start, end: seg.end }, holidays);

    if (businessDaysInMonth > 0) group.benefitsAmount += (seg.totalBenefitsCost / businessDaysInMonth) * segBusinessDays;
    group.hoursWorked += segBusinessDays * seg.jornadaDiaria;
    if (i === segments.length - 1) group.toolsAmount += toolsAmountForRow;

    if (segFraction <= 0) return;

    const breakdown = calculateEmployeeCost({
      tipoContratacao: seg.tipoContratacao,
      salarioBruto: seg.salarioMensal * segFraction,
      bolsaAuxilio: seg.bolsaAuxilio * segFraction,
      valorContratoPj: seg.valorContratoPj * segFraction,
      proLabore: seg.proLabore * segFraction,
      dividendos: seg.dividendos * segFraction,
      benefitsTotalMonthly: 0,
      toolsTotalMonthly: 0,
      payrollProfile,
    });

    const encargosSobreProvisoes = breakdown.details.encargos13 + breakdown.details.encargosFerias;

    group.baseAmount += breakdown.baseAmount;
    group.chargesAmount += breakdown.chargesAmount;
    group.fgtsAmount += breakdown.details.fgts;
    group.inssPatronalAmount += breakdown.details.inss;
    group.outrosEncargosAmount +=
      breakdown.chargesAmount - breakdown.details.fgts - breakdown.details.inss - encargosSobreProvisoes;
    group.provisionsAmount += breakdown.provisionsAmount + encargosSobreProvisoes;
    group.provisao13Amount += breakdown.details.provisao13;
    group.provisaoFeriasAmount += breakdown.details.provisaoFerias;
    group.provisaoRecessoAmount += breakdown.details.provisaoRecesso;
    group.encargosSobreProvisoesAmount += encargosSobreProvisoes;
    group.fgtsSobreProvisoesAmount += breakdown.details.fgts13 + breakdown.details.fgtsFerias;
    group.inssFuncionario += breakdown.details.inssFuncionario;
    group.salaryOnlyCost += breakdown.totalMonthlyCost;
  });

  return groups.map(
    (g): PayrollAnalysisRow => ({
      employeeId: e.id,
      nome: e.nome,
      cargo: e.cargo,
      tipoContratacao: g.tipoContratacao,
      baseAmount: g.baseAmount,
      chargesAmount: g.chargesAmount,
      fgtsAmount: g.fgtsAmount,
      inssPatronalAmount: g.inssPatronalAmount,
      outrosEncargosAmount: g.outrosEncargosAmount,
      provisionsAmount: g.provisionsAmount,
      provisao13Amount: g.provisao13Amount,
      provisaoFeriasAmount: g.provisaoFeriasAmount,
      provisaoRecessoAmount: g.provisaoRecessoAmount,
      encargosSobreProvisoesAmount: g.encargosSobreProvisoesAmount,
      fgtsSobreProvisoesAmount: g.fgtsSobreProvisoesAmount,
      benefitsAmount: g.benefitsAmount,
      toolsAmount: g.toolsAmount,
      benefitsBreakdown: e.benefitsBreakdown,
      toolsBreakdown: e.toolsBreakdown,
      terminationDate: e.terminationDate,
      rescissionBaseAmount: 0,
      rescissionChargesAmount: 0,
      rescissionProvisao13Amount: 0,
      rescissionProvisaoFeriasAmount: 0,
      rescissionProvisaoRecessoAmount: 0,
      rescissionEncargosSobreProvisoesAmount: 0,
      rescissionInssFuncionarioAmount: 0,
      totalMonthlyCost: g.salaryOnlyCost + g.benefitsAmount + g.toolsAmount,
      inssFuncionario: g.inssFuncionario,
      hoursWorked: g.hoursWorked,
      hourlyCost: 0,
    }),
  );
}
