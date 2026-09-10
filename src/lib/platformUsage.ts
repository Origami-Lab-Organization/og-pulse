import { PlanKind } from '@/lib/tenantPlan';
import {
  ActivationStepId,
  EngagementLevel,
  TrialState,
  type ActivationStep,
  type ActivationTally,
  type PlatformUsageRow,
  type PlatformUsageSummary,
  type TenantUsage,
} from '@/types/platformUsage';

/**
 * As regras do painel de uso (PUL-258). Puro: sem estado, sem I/O, sem `Date.now()` solto —
 * o `now` sempre entra por parâmetro, para o resultado ser o mesmo em qualquer leitura.
 *
 * O FUNIL É A TRILHA DO GUIA. Os marcos aqui são, na ordem, os mesmos passos que o tsuru
 * pede ao dono em `src/lib/ownerGuide.ts` (PUL-250), mais três sinais que só a plataforma vê:
 * entrou, viu o tour e voltou depois do primeiro dia. Isso não é coincidência arrumada: se o
 * guia pede A, B e C, o painel tem de medir A, B e C — senão a casa ensina uma coisa e mede
 * outra, e o número não diz se o guia funciona.
 *
 * O DIAGNÓSTICO QUE IMPORTA é a diferença entre ENTRAR e CRIAR. Um cliente que abre o Pulse
 * toda semana e nunca cadastrou nada aparece "ativo" em qualquer contador de login, e está
 * morrendo. `zombies` mede exatamente isso.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_DAYS = 2;
const COOLING_DAYS = 7;
const TRIAL_ENDING_DAYS = 7;

/**
 * O autocadastro entrou em produção em 09/09/2026 (PUL-227). Tenant anterior nasceu à mão
 * ou de seed de demonstração, sem passar pelo cadastro nem pelo onboarding, e entraria no
 * funil como "nunca ativou" mesmo tendo dados. Fica fora da medição e a tela diz quantos são
 * — mesma escolha que o projete.app fez com o corte de instrumentação de login.
 */
export const SELF_SIGNUP_START = new Date('2026-09-09T00:00:00Z');

/** Só o dono cadastrado ainda não é um time. */
const HAS_TEAM = 2;

export const ACTIVATION_STEPS: readonly ActivationStep[] = [
  {
    id: ActivationStepId.SIGNED_IN,
    label: 'Entrou',
    detail: 'confirmou o e-mail e fez o primeiro acesso',
    reached: (r) => !!r.last_sign_in_at,
  },
  {
    id: ActivationStepId.SAW_TOUR,
    label: 'Viu o tour',
    detail: 'o tsuru apresentou a casa',
    reached: (r) => r.tour_seen_count > 0,
  },
  {
    id: ActivationStepId.BROUGHT_TEAM,
    label: 'Chamou o time',
    detail: 'cadastrou mais alguém além de si',
    reached: (r) => r.people_count >= HAS_TEAM,
  },
  {
    id: ActivationStepId.ADDED_CLIENT,
    label: 'Cadastrou cliente',
    detail: 'tem para quem entregar',
    reached: (r) => r.client_count > 0,
  },
  {
    id: ActivationStepId.BUILT_CATALOG,
    label: 'Montou o catálogo',
    detail: 'definiu o que vende',
    reached: (r) => r.service_count > 0,
  },
  {
    id: ActivationStepId.CREATED_PROJECT,
    label: 'Projeto com time',
    detail: 'projeto criado e gente alocada nele',
    reached: (r) => r.project_count > 0 && r.member_count > 0,
  },
  {
    id: ActivationStepId.LOGGED_HOURS,
    label: 'Lançou hora',
    detail: 'é a hora que faz a margem existir',
    reached: (r) => r.logged_hours_count > 0,
  },
  {
    id: ActivationStepId.CAME_BACK,
    label: 'Voltou no dia seguinte',
    detail: 'criou algo 24h depois de se cadastrar',
    reached: (r) =>
      !!r.last_created_at &&
      new Date(r.last_created_at).getTime() - new Date(r.created_at).getTime() >= DAY_MS,
  },
];

export function classifyEngagement(lastSignIn: string | null, now: Date): EngagementLevel {
  if (!lastSignIn) return EngagementLevel.IDLE;
  const elapsed = now.getTime() - new Date(lastSignIn).getTime();
  if (elapsed <= ACTIVE_DAYS * DAY_MS) return EngagementLevel.ACTIVE;
  if (elapsed <= COOLING_DAYS * DAY_MS) return EngagementLevel.COOLING;
  return EngagementLevel.IDLE;
}

/** Dias inteiros até o fim do teste. Negativo quando já venceu. */
function daysUntil(iso: string, now: Date): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS);
}

export function classifyTrial(row: PlatformUsageRow, now: Date): { state: TrialState; daysLeft: number | null } {
  // Sem data de fim ou já promovido a ativo: não está em teste.
  if (!row.trial_ends_at || row.plan !== PlanKind.TRIAL) return { state: TrialState.NONE, daysLeft: null };
  const daysLeft = daysUntil(row.trial_ends_at, now);
  if (daysLeft < 0) return { state: TrialState.EXPIRED, daysLeft };
  if (daysLeft <= TRIAL_ENDING_DAYS) return { state: TrialState.ENDING, daysLeft };
  return { state: TrialState.RUNNING, daysLeft };
}

function toTenantUsage(row: PlatformUsageRow, now: Date): TenantUsage {
  const trial = classifyTrial(row, now);
  return {
    row,
    engagement: classifyEngagement(row.last_sign_in_at, now),
    trial: trial.state,
    trialDaysLeft: trial.daysLeft,
    reached: new Set(ACTIVATION_STEPS.filter((s) => s.reached(row, now)).map((s) => s.id)),
    inFunnel: new Date(row.created_at) >= SELF_SIGNUP_START,
  };
}

/** Entrou e nunca criou nada: o cliente que um contador de login mostraria como saudável. */
function isZombie(t: TenantUsage): boolean {
  return !!t.row.last_sign_in_at && !t.row.last_created_at;
}

function tally(tenants: readonly TenantUsage[], base: number): ActivationTally[] {
  return ACTIVATION_STEPS.map((step) => {
    const count = tenants.filter((t) => t.reached.has(step.id)).length;
    return { step, count, percent: base > 0 ? (count / base) * 100 : 0 };
  });
}

export function summarizePlatformUsage(rows: readonly PlatformUsageRow[], now: Date): PlatformUsageSummary {
  // Mais recente primeiro: quem entrou ontem é quem precisa de atenção hoje.
  const tenants = rows
    .map((row) => toTenantUsage(row, now))
    .sort((a, b) => new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime());

  const funnel = tenants.filter((t) => t.inFunnel);

  return {
    tenants,
    funnelBase: funnel.length,
    outsideFunnel: tenants.length - funnel.length,
    activation: tally(funnel, funnel.length),
    // Conta sobre TODOS, não só o funil: um teste vencendo é dinheiro na mesa,
    // independente de como a empresa entrou.
    trialsEndingSoon: tenants.filter((t) => t.trial === TrialState.ENDING).length,
    zombies: tenants.filter(isZombie).length,
  };
}
