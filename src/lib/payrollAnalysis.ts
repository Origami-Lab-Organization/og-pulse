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
): PayrollAnalysisRow {
  const breakdown = calculateEmployeeCost({
    tipoContratacao: e.tipoContratacao,
    salarioBruto: e.salarioMensal,
    bolsaAuxilio: e.bolsaAuxilio,
    valorContratoPj: e.valorContratoPj,
    proLabore: e.proLabore,
    dividendos: e.dividendos,
    benefitsTotalMonthly: e.totalBenefitsCost,
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
