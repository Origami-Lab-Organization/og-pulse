/**
 * Guia de primeiros passos do dono da empresa (PUL-250).
 *
 * O progresso não é guardado em lugar nenhum: é derivado destes números. Ver o comentário
 * da migration `20260910150000_owner_guide.sql` para o porquê.
 */

export const OwnerGuideStepId = {
  PEOPLE: 'people',
  CLIENTS: 'clients',
  CATALOG: 'catalog',
  PROJECT: 'project',
  HOURS: 'hours',
} as const;
export type OwnerGuideStepId = (typeof OwnerGuideStepId)[keyof typeof OwnerGuideStepId];

/** O que existe cadastrado hoje. É daqui que sai o progresso. */
export interface OwnerGuideCounts {
  /** Inclui o próprio dono, que já nasce cadastrado — por isso o passo pede mais de um. */
  employees: number;
  clients: number;
  services: number;
  projects: number;
  projectMembers: number;
  /** Horas lançadas em projeto. É o que faz a margem realizada existir. */
  hours: number;
}

export interface OwnerGuideStep {
  id: OwnerGuideStepId;
  title: string;
  /** Por que este passo existe. Nunca "clique aqui" — sempre a consequência de faltar. */
  why: string;
  cta: string;
  route: string;
  /**
   * Âncoras `data-tour` em ordem de preferência: a primeira que estiver visível recebe o
   * holofote. Cascata porque a filha do menu só existe no DOM com o grupo aberto — sem o
   * grupo como segunda opção, o holofote nunca acenderia para quem navega com tudo fechado.
   */
  selectors: readonly string[];
  /** Texto usado quando a âncora não está na tela (menu recolhido, mobile, refactor). */
  fallback: string;
  isDone: (counts: OwnerGuideCounts) => boolean;
}

export interface OwnerGuideStepState {
  step: OwnerGuideStep;
  done: boolean;
  /** O primeiro pendente. É o único que o guia oferece por vez. */
  current: boolean;
}

export interface OwnerGuideState {
  steps: readonly OwnerGuideStepState[];
  /** `null` quando tudo está feito. */
  nextStep: OwnerGuideStep | null;
  doneCount: number;
  total: number;
  complete: boolean;
}
