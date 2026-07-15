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
  /** FGTS sobre salário/pró-labore + 13º + férias — soma parte de `chargesAmount`. */
  fgtsAmount: number;
  /** INSS patronal sobre salário/pró-labore + 13º + férias — soma parte de `chargesAmount`. */
  inssPatronalAmount: number;
  /** Resto de `chargesAmount` (RAT, Terceiros, Outros) — para que FGTS + INSS Patronal + isso feche com `chargesAmount`. */
  outrosEncargosAmount: number;
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

  const fgtsAmount = breakdown.details.fgts + breakdown.details.fgts13 + breakdown.details.fgtsFerias;
  const inssPatronalAmount = breakdown.details.inss + breakdown.details.inss13 + breakdown.details.inssFerias;

  return {
    employeeId: e.id,
    nome: e.nome,
    cargo: e.cargo,
    tipoContratacao: e.tipoContratacao,
    baseAmount: breakdown.baseAmount,
    chargesAmount: breakdown.chargesAmount,
    fgtsAmount,
    inssPatronalAmount,
    outrosEncargosAmount: breakdown.chargesAmount - fgtsAmount - inssPatronalAmount,
    provisionsAmount: breakdown.provisionsAmount,
    benefitsAmount: breakdown.benefitsAmount,
    toolsAmount: breakdown.toolsAmount,
    totalMonthlyCost: breakdown.totalMonthlyCost,
    inssFuncionario: breakdown.details.inssFuncionario,
  };
}
