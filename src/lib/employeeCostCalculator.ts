import { PayrollProfile, DEFAULT_PAYROLL_PROFILE } from '@/types/payrollProfile';
import { ContractType } from '@/types/employee';

export interface CostCalculationInput {
  tipoContratacao: ContractType;
  salarioBruto: number;
  bolsaAuxilio: number;
  valorContratoPj: number;
  proLabore: number;
  dividendos: number;
  benefitsTotalMonthly: number;
  toolsTotalMonthly: number;
  payrollProfile?: Partial<PayrollProfile>;
}

export interface CostBreakdownDetails {
  fgts: number;
  inss: number;
  rat: number;
  terceiros: number;
  outros: number;
  provisao13: number;
  provisaoFerias: number;
  provisaoRecesso: number;
  encargos13: number;
  encargosFerias: number;
}

export interface CostBreakdown {
  baseAmount: number;
  chargesAmount: number;
  provisionsAmount: number;
  benefitsAmount: number;
  toolsAmount: number;
  totalMonthlyCost: number;
  totalAnnualCost: number;
  details: CostBreakdownDetails;
}

const getProfile = (partial?: Partial<PayrollProfile>): typeof DEFAULT_PAYROLL_PROFILE => {
  return {
    ...DEFAULT_PAYROLL_PROFILE,
    ...partial,
  };
};

const sum13thApplicableRates = (profile: typeof DEFAULT_PAYROLL_PROFILE, fgtsRate: number): number => {
  let total = 0;
  if (profile.applyFgtsOn13th) total += fgtsRate;
  if (profile.applyInssOn13th) total += profile.inssPatronalRate;
  if (profile.applyRatOn13th) total += profile.ratRate;
  if (profile.applyTerceirosOn13th) total += profile.terceirosRate;
  if (profile.applyOutrosOn13th) total += profile.outrosRate;
  return total;
};

const sumVacationApplicableRates = (profile: typeof DEFAULT_PAYROLL_PROFILE, fgtsRate: number): number => {
  let total = 0;
  if (profile.applyFgtsOnVacation) total += fgtsRate;
  if (profile.applyInssOnVacation) total += profile.inssPatronalRate;
  if (profile.applyRatOnVacation) total += profile.ratRate;
  if (profile.applyTerceirosOnVacation) total += profile.terceirosRate;
  if (profile.applyOutrosOnVacation) total += profile.outrosRate;
  return total;
};

export function calculateEmployeeCost(input: CostCalculationInput): CostBreakdown {
  const profile = getProfile(input.payrollProfile);
  
  let baseAmount = 0;
  let chargesAmount = 0;
  let provisionsAmount = 0;
  
  const details: CostBreakdownDetails = {
    fgts: 0,
    inss: 0,
    rat: 0,
    terceiros: 0,
    outros: 0,
    provisao13: 0,
    provisaoFerias: 0,
    provisaoRecesso: 0,
    encargos13: 0,
    encargosFerias: 0,
  };

  switch (input.tipoContratacao) {
    case 'CLT':
    case 'MENOR_APRENDIZ': {
      baseAmount = input.salarioBruto;
      const fgtsRate = input.tipoContratacao === 'CLT' 
        ? profile.fgtsRateClt 
        : profile.fgtsRateApprentice;

      // Charges on salary
      details.fgts = baseAmount * fgtsRate;
      details.inss = baseAmount * profile.inssPatronalRate;
      details.rat = baseAmount * profile.ratRate;
      details.terceiros = baseAmount * profile.terceirosRate;
      details.outros = baseAmount * profile.outrosRate;

      // Provisions
      details.provisao13 = baseAmount / 12;
      details.provisaoFerias = (baseAmount * (1 + 1/3)) / 12; // base * 1.333... / 12

      // Charges on provisions
      const rates13 = sum13thApplicableRates(profile, fgtsRate);
      const ratesVacation = sumVacationApplicableRates(profile, fgtsRate);
      
      details.encargos13 = details.provisao13 * rates13;
      details.encargosFerias = details.provisaoFerias * ratesVacation;

      chargesAmount = details.fgts + details.inss + details.rat + details.terceiros + details.outros
                    + details.encargos13 + details.encargosFerias;
      provisionsAmount = details.provisao13 + details.provisaoFerias;
      break;
    }

    case 'ESTAGIO': {
      baseAmount = input.bolsaAuxilio;
      // No charges for interns
      details.provisaoRecesso = baseAmount / 12;
      provisionsAmount = details.provisaoRecesso;
      break;
    }

    case 'PJ': {
      baseAmount = input.valorContratoPj;
      // No charges or provisions for PJ
      break;
    }

    case 'SOCIO': {
      baseAmount = input.proLabore + input.dividendos;
      
      // Charges only on pró-labore, not dividends
      if (input.proLabore > 0) {
        details.inss = input.proLabore * profile.inssPatronalProlaboreRate;
        details.fgts = input.proLabore * profile.fgtsProlaboreRate;
        chargesAmount = details.inss + details.fgts;
      }
      break;
    }

    default:
      // Fallback - treat as CLT
      baseAmount = input.salarioBruto;
  }

  const totalMonthlyCost = baseAmount + chargesAmount + provisionsAmount 
                          + input.benefitsTotalMonthly + input.toolsTotalMonthly;

  return {
    baseAmount,
    chargesAmount,
    provisionsAmount,
    benefitsAmount: input.benefitsTotalMonthly,
    toolsAmount: input.toolsTotalMonthly,
    totalMonthlyCost,
    totalAnnualCost: totalMonthlyCost * 12,
    details,
  };
}

export function getBaseFieldLabel(tipoContratacao: ContractType): string {
  switch (tipoContratacao) {
    case 'CLT':
    case 'MENOR_APRENDIZ':
      return 'Salário Bruto';
    case 'ESTAGIO':
      return 'Bolsa-Auxílio';
    case 'PJ':
      return 'Valor Mensal do Contrato';
    case 'SOCIO':
      return 'Pró-Labore';
    default:
      return 'Salário Bruto';
  }
}

export function showsChargesSection(tipoContratacao: ContractType): boolean {
  return tipoContratacao === 'CLT' || tipoContratacao === 'MENOR_APRENDIZ' || tipoContratacao === 'SOCIO';
}

export function showsProvisionsSection(tipoContratacao: ContractType): boolean {
  return tipoContratacao === 'CLT' || tipoContratacao === 'MENOR_APRENDIZ' || tipoContratacao === 'ESTAGIO';
}
