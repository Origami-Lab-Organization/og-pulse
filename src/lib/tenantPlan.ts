import type { PlanKind as PlanKindType, TenantPlan, TenantPlanRow } from '@/types/tenantPlan';

/** Valores canônicos de `tenants.plan`. Comparar sempre pelo membro. */
export const PlanKind = {
  TRIAL: 'trial',
  ACTIVE: 'active',
} as const satisfies Record<string, PlanKindType>;

/** Duração do período de teste em dias corridos (PUL-224). Espelha o trigger `tenants_default_trial`. */
export const TRIAL_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Traduz a linha do banco para a leitura que a interface usa. Regra: só teste expira;
 * teste sem prazo (não deveria existir, o CHECK impede) é tratado como expirado para
 * não abrir acesso por acidente.
 */
export function resolveTenantPlan(row: TenantPlanRow | null | undefined, now: Date = new Date()): TenantPlan | null {
  if (!row) return null;
  if (row.plan !== PlanKind.TRIAL) {
    return { plan: PlanKind.ACTIVE, trialEndsAt: null, daysLeft: null, expired: false };
  }
  if (!row.trial_ends_at) {
    return { plan: PlanKind.TRIAL, trialEndsAt: null, daysLeft: 0, expired: true };
  }
  const endsAt = new Date(row.trial_ends_at);
  const remainingMs = endsAt.getTime() - now.getTime();
  return {
    plan: PlanKind.TRIAL,
    trialEndsAt: row.trial_ends_at,
    daysLeft: Math.max(0, Math.ceil(remainingMs / DAY_MS)),
    expired: remainingMs <= 0,
  };
}
