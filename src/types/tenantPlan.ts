/** Plano do tenant (PUL-224). A fonte de verdade é `tenants.plan` / `tenants.trial_ends_at`. */

export type PlanKind = 'trial' | 'active';

/** Linha como vem do banco. */
export interface TenantPlanRow {
  plan: string;
  trial_ends_at: string | null;
}

/** Leitura pronta para a interface. */
export interface TenantPlan {
  plan: PlanKind;
  trialEndsAt: string | null;
  /** Dias corridos até o fim do teste (arredondado para cima). `null` quando não é teste. */
  daysLeft: number | null;
  /** Teste com prazo vencido. Plano ativo nunca expira. */
  expired: boolean;
}

/** Estado passado à tela de boas-vindas pelo cadastro. */
export interface WelcomeState {
  email?: string;
  justRegistered?: boolean;
  confirmationEmailSent?: boolean;
  autoConfirmed?: boolean;
}
