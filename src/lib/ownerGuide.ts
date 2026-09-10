import {
  OwnerGuideStepId,
  type OwnerGuideCounts,
  type OwnerGuideState,
  type OwnerGuideStep,
  type OwnerGuideStepState,
} from '@/types/ownerGuide';

/**
 * Os passos do guia do dono, e o cálculo do progresso (PUL-250).
 *
 * Regras que este arquivo carrega, e que valem mais que a ordem da lista:
 *
 * 1. **Todo passo tem prova no dado.** Nenhum conclui por clique em "avançar". Ler um texto
 *    não monta a empresa de ninguém, e um guia que se declara concluído sem nada cadastrado
 *    seria um guia mentindo para si mesmo.
 *
 * 2. **A ordem é a da dependência real**, não a do menu: custo da pessoa antes de projeto,
 *    porque é dele que sai o custo hora; serviço antes de projeto, porque é o serviço que
 *    liga o projeto ao centro de custo (ADR-0031); hora no fim, porque é ela que transforma
 *    cadastro em margem.
 *
 * 3. **O texto diz o que falta se o passo faltar**, nunca onde clicar. "Sem isso o Pulse
 *    mostra projeto mas não mostra margem" ensina; "clique em Novo" não.
 *
 * Sem estado e sem I/O de propósito: dá para conferir a regra lendo, e o hook só serve os
 * números.
 */

/** Só o dono cadastrado ainda não é um time. */
const HAS_TEAM = 2;

export const OWNER_GUIDE_STEPS: readonly OwnerGuideStep[] = [
  {
    id: OwnerGuideStepId.PEOPLE,
    title: 'Quem trabalha com você',
    why: 'O custo da hora sai do custo de cada pessoa. Sem isso o Pulse mostra o projeto, mas não mostra margem.',
    cta: 'Cadastrar a primeira pessoa',
    route: '/employees',
    selectors: ['[data-tour="nav-/employees"]', '[data-tour="nav-group-/employees"]'],
    fallback: 'Abra Pessoas no menu lateral para cadastrar quem trabalha com você.',
    isDone: (c) => c.employees >= HAS_TEAM,
  },
  {
    id: OwnerGuideStepId.CLIENTS,
    title: 'Para quem você entrega',
    why: 'Todo projeto nasce de um cliente. É por ele que a receita e a margem se agrupam.',
    cta: 'Cadastrar o primeiro cliente',
    route: '/clients',
    selectors: ['[data-tour="nav-/clients"]', '[data-tour="nav-group-/clients"]'],
    fallback: 'Abra Clientes no menu lateral para cadastrar o primeiro.',
    isDone: (c) => c.clients > 0,
  },
  {
    id: OwnerGuideStepId.CATALOG,
    title: 'O que você vende',
    why: 'O serviço é o que liga o projeto ao centro de custo. Sem ele, a hora lançada não tem onde ser lida.',
    cta: 'Criar o primeiro serviço',
    route: '/comercial/servicos',
    selectors: ['[data-tour="nav-/comercial/servicos"]', '[data-tour="nav-group-/clients"]'],
    fallback: 'Abra Comercial e depois Serviços para criar o primeiro.',
    isDone: (c) => c.services > 0,
  },
  {
    id: OwnerGuideStepId.PROJECT,
    title: 'Seu primeiro projeto, com time',
    why: 'Projeto sem ninguém alocado não consome hora, e sem hora não existe margem realizada. Por isso este passo pede as duas coisas.',
    cta: 'Criar o projeto e alocar o time',
    route: '/projetos',
    selectors: ['[data-tour="nav-/projetos"]', '[data-tour="nav-group-/projetos"]'],
    fallback: 'Abra Projetos no menu lateral, crie o projeto e inclua o time nele.',
    isDone: (c) => c.projects > 0 && c.projectMembers > 0,
  },
  {
    id: OwnerGuideStepId.HOURS,
    title: 'A primeira hora lançada',
    why: 'É a hora que transforma cadastro em número. Depois dela, custo e margem aparecem nas análises.',
    cta: 'Lançar hora no projeto',
    route: '/my-timesheet',
    selectors: ['[data-tour="nav-/my-timesheet"]'],
    fallback: 'Abra Meu Espaço e depois Timesheet para lançar as horas da semana.',
    isDone: (c) => c.hours > 0,
  },
];

export const EMPTY_COUNTS: OwnerGuideCounts = {
  employees: 0,
  clients: 0,
  services: 0,
  projects: 0,
  projectMembers: 0,
  hours: 0,
};

/**
 * O progresso, derivado do que existe cadastrado.
 *
 * Um passo posterior já feito NÃO adianta os anteriores: quem já lança hora mas nunca
 * cadastrou cliente continua com o passo de cliente pendente, porque a lacuna é real. O
 * guia oferece sempre o primeiro pendente, não o próximo da lista.
 */
export function buildOwnerGuideState(counts: OwnerGuideCounts): OwnerGuideState {
  const evaluated = OWNER_GUIDE_STEPS.map((step) => ({ step, done: step.isDone(counts) }));
  const firstPending = evaluated.find((entry) => !entry.done);

  const steps: OwnerGuideStepState[] = evaluated.map((entry) => ({
    ...entry,
    current: entry.step.id === firstPending?.step.id,
  }));

  return {
    steps,
    nextStep: firstPending?.step ?? null,
    doneCount: evaluated.filter((entry) => entry.done).length,
    total: OWNER_GUIDE_STEPS.length,
    complete: !firstPending,
  };
}
