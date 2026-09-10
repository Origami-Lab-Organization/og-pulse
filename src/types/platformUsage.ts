/**
 * Uso dos clientes, para a Origami operar o produto (PUL-258, ADR-0033).
 *
 * O que NÃO existe aqui, e nunca deve passar a existir: nome de projeto, nome de cliente
 * final, valor de contrato, margem, custo, salário. A função do banco devolve contagem e
 * data, e o painel responde "este cliente está usando?", não "o que ele está fazendo".
 */

/** Uma linha crua de `platform_tenant_usage()`. */
export interface PlatformUsageRow {
  tenant_id: string;
  tenant_name: string;
  plan: string;
  trial_ends_at: string | null;
  created_at: string;
  segment: string | null;
  /** Contato comercial da conta: o admin que se cadastrou. */
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  last_sign_in_at: string | null;
  /** Última vez que alguém CRIOU dado. Diferente de ter entrado. */
  last_created_at: string | null;
  people_count: number;
  signed_in_count: number;
  tour_seen_count: number;
  client_count: number;
  service_count: number;
  project_count: number;
  member_count: number;
  logged_hours_count: number;
  opportunity_count: number;
  cost_center_count: number;
}

/** Quão vivo está o cliente, pela última entrada de alguém. */
export const EngagementLevel = {
  ACTIVE: 'active',
  COOLING: 'cooling',
  IDLE: 'idle',
} as const;
export type EngagementLevel = (typeof EngagementLevel)[keyof typeof EngagementLevel];

/** Situação do período de teste. `none` = já é cliente pagante. */
export const TrialState = {
  NONE: 'none',
  RUNNING: 'running',
  ENDING: 'ending',
  EXPIRED: 'expired',
} as const;
export type TrialState = (typeof TrialState)[keyof typeof TrialState];

export interface TenantUsage {
  row: PlatformUsageRow;
  engagement: EngagementLevel;
  trial: TrialState;
  /** Dias até o teste vencer; negativo se já venceu. `null` para quem não está em teste. */
  trialDaysLeft: number | null;
  /** Quais marcos de ativação este cliente já cumpriu. */
  reached: ReadonlySet<ActivationStepId>;
  /**
   * Entrou pelo autocadastro, e por isso conta no funil. Tenant anterior a isso foi criado
   * à mão ou por seed, e distorceria a medição.
   */
  inFunnel: boolean;
}

export const ActivationStepId = {
  SIGNED_IN: 'signed-in',
  SAW_TOUR: 'saw-tour',
  BROUGHT_TEAM: 'brought-team',
  ADDED_CLIENT: 'added-client',
  BUILT_CATALOG: 'built-catalog',
  CREATED_PROJECT: 'created-project',
  LOGGED_HOURS: 'logged-hours',
  CAME_BACK: 'came-back',
} as const;
export type ActivationStepId = (typeof ActivationStepId)[keyof typeof ActivationStepId];

export interface ActivationStep {
  id: ActivationStepId;
  label: string;
  /** O que este marco significa para o negócio, não o que ele mede tecnicamente. */
  detail: string;
  reached: (row: PlatformUsageRow, now: Date) => boolean;
}

export interface ActivationTally {
  step: ActivationStep;
  count: number;
  /** Sobre a base do funil, em pontos percentuais. */
  percent: number;
}

export interface PlatformUsageSummary {
  tenants: readonly TenantUsage[];
  /** Quantos entraram pelo autocadastro. É a base de todo percentual. */
  funnelBase: number;
  /** Quantos ficaram fora dele, para a tela dizer isso em vez de esconder. */
  outsideFunnel: number;
  activation: readonly ActivationTally[];
  /** Em teste, vencendo nos próximos sete dias. É a lista de quem ligar hoje. */
  trialsEndingSoon: number;
  /** Entrou mas nunca criou nada: o diagnóstico que um contador de login não dá. */
  zombies: number;
}
