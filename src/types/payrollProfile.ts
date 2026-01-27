export interface PayrollProfile {
  id: string;
  tenantId: string;
  // CLT/Apprentice rates
  fgtsRateClt: number;
  fgtsRateApprentice: number;
  inssPatronalRate: number;
  ratRate: number;
  terceirosRate: number;
  outrosRate: number;
  // Pro-Labore rates
  inssPatronalProlaboreRate: number;
  fgtsProlaboreRate: number;
  // Apply on 13th
  applyFgtsOn13th: boolean;
  applyInssOn13th: boolean;
  applyRatOn13th: boolean;
  applyTerceirosOn13th: boolean;
  applyOutrosOn13th: boolean;
  // Apply on vacation
  applyFgtsOnVacation: boolean;
  applyInssOnVacation: boolean;
  applyRatOnVacation: boolean;
  applyTerceirosOnVacation: boolean;
  applyOutrosOnVacation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollProfileDB {
  id: string;
  tenant_id: string;
  fgts_rate_clt: number;
  fgts_rate_apprentice: number;
  inss_patronal_rate: number;
  rat_rate: number;
  terceiros_rate: number;
  outros_rate: number;
  inss_patronal_prolabore_rate: number;
  fgts_prolabore_rate: number;
  apply_fgts_on_13th: boolean;
  apply_inss_on_13th: boolean;
  apply_rat_on_13th: boolean;
  apply_terceiros_on_13th: boolean;
  apply_outros_on_13th: boolean;
  apply_fgts_on_vacation: boolean;
  apply_inss_on_vacation: boolean;
  apply_rat_on_vacation: boolean;
  apply_terceiros_on_vacation: boolean;
  apply_outros_on_vacation: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePayrollProfileInput {
  tenantId: string;
  fgtsRateClt?: number;
  fgtsRateApprentice?: number;
  inssPatronalRate?: number;
  ratRate?: number;
  terceirosRate?: number;
  outrosRate?: number;
  inssPatronalProlaboreRate?: number;
  fgtsProlaboreRate?: number;
  applyFgtsOn13th?: boolean;
  applyInssOn13th?: boolean;
  applyRatOn13th?: boolean;
  applyTerceirosOn13th?: boolean;
  applyOutrosOn13th?: boolean;
  applyFgtsOnVacation?: boolean;
  applyInssOnVacation?: boolean;
  applyRatOnVacation?: boolean;
  applyTerceirosOnVacation?: boolean;
  applyOutrosOnVacation?: boolean;
}

export const DEFAULT_PAYROLL_PROFILE: Omit<PayrollProfile, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> = {
  fgtsRateClt: 0.08,
  fgtsRateApprentice: 0.02,
  inssPatronalRate: 0.20,
  ratRate: 0.03,
  terceirosRate: 0.058,
  outrosRate: 0,
  inssPatronalProlaboreRate: 0.20,
  fgtsProlaboreRate: 0,
  applyFgtsOn13th: true,
  applyInssOn13th: true,
  applyRatOn13th: true,
  applyTerceirosOn13th: true,
  applyOutrosOn13th: false,
  applyFgtsOnVacation: true,
  applyInssOnVacation: true,
  applyRatOnVacation: true,
  applyTerceirosOnVacation: true,
  applyOutrosOnVacation: false,
};
