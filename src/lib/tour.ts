import { hasAnyCapability } from '@/lib/access/capabilities';
import type { TourStep } from '@/types/tour';

/**
 * Os passos do tour guiado, e o recorte por perfil (PUL-251).
 *
 * **O tour é montado pela mesma fonte que o menu.** Cada passo declara a capacidade do item
 * de navegação que ele apresenta, então quem não vê o item também não ouve falar dele. Sem
 * isso o tour promete telas que a pessoa não pode abrir — foi o que aconteceu no
 * projete.app, onde o convidado recebia um tour de dono falando de Configurações e Equipe, e
 * só apareceu no Amplitude depois.
 *
 * Lá a segmentação teve de ser adivinhada por heurística de tempo (quem entrou mais de cinco
 * minutos depois do escritório é convidado). Aqui não se adivinha: a capacidade é dado
 * (ADR-0027), é a mesma que a RLS aplica, e o gate `check:tour` confere que a capacidade do
 * passo bate com a do item de menu que ele aponta.
 *
 * Consequência prática: cada perfil recebe um tour do tamanho da sua realidade. O
 * Colaborador ouve falar de timesheet e dos projetos dele; o Admin ouve o resto.
 *
 * O tom das falas: o tsuru diz PARA QUE serve a tela, nunca onde clicar. Quem está sendo
 * apresentado à casa não precisa de instrução, precisa de mapa.
 */

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'welcome',
    title: 'Oi, eu sou o tsuru',
    body: 'Vou te mostrar a casa em um minuto. O Pulse existe para responder uma pergunta: cada projeto seu dá lucro? Tudo aqui serve a isso.',
    selectors: [],
  },
  {
    id: 'nav',
    title: 'Tudo começa por aqui',
    body: 'Este menu muda conforme o seu acesso: você vê só o que pode abrir. Nada de tela vazia por falta de permissão.',
    selectors: ['[data-tour="nav-/my-timesheet"]', '[data-tour="nav-/dashboard"]'],
    fallback: 'O menu lateral fica à esquerda e muda conforme o seu acesso: você vê só o que pode abrir.',
  },
  {
    id: 'timesheet',
    title: 'A hora é o coração',
    body: 'É lançando hora que o Pulse aprende quanto cada projeto custou. Sem isso ele mostra o planejado e nunca o realizado.',
    selectors: ['[data-tour="nav-/my-timesheet"]'],
    fallback: 'Timesheet, no menu lateral: é onde você lança as horas da semana.',
  },
  {
    id: 'my-projects',
    title: 'Onde você está alocado',
    body: 'Seus projetos, com o que se espera de você em cada um. É a lista que alimenta a sua semana de horas.',
    selectors: ['[data-tour="nav-/my-projects"]'],
    fallback: 'Meus Projetos, no menu lateral, lista onde você está alocado.',
    // Quem enxerga o portfólio inteiro tem o passo de Projetos, não este. Mesmo par que o
    // menu já trata com `hiddenWhenCan`.
    hiddenWhenCan: 'portfolio:ler',
  },
  {
    id: 'projects',
    title: 'O portfólio inteiro',
    body: 'Cada projeto com time, valor, prazo e margem. Aqui você vê o que está apertando antes de o mês fechar.',
    selectors: ['[data-tour="nav-/projetos"]', '[data-tour="nav-group-/projetos"]'],
    fallback: 'Projetos, no menu lateral, reúne o portfólio com margem e prazo de cada um.',
    requiresCapability: 'portfolio:ler',
  },
  {
    id: 'pipeline',
    title: 'O que ainda não é projeto',
    body: 'As oportunidades em aberto, por etapa. Quando uma fecha, ela vira projeto sem você redigitar nada.',
    selectors: ['[data-tour="nav-/pipeline"]'],
    fallback: 'Pipeline, no menu lateral, mostra as oportunidades em aberto por etapa.',
    requiresCapability: 'pipeline:ler',
  },
  {
    id: 'people',
    title: 'Quem faz o trabalho',
    body: 'O custo de cada pessoa vive aqui, e é dele que sai o custo da hora. É o número que transforma esforço em dinheiro.',
    selectors: ['[data-tour="nav-/employees"]', '[data-tour="nav-group-/employees"]'],
    fallback: 'Pessoas, no menu lateral, guarda o time e o custo de cada um.',
    requiresCapability: 'pessoa:ler-ficha-completa',
  },
  {
    id: 'catalog',
    title: 'Clientes e o que você vende',
    body: 'Em Cadastros ficam os clientes e o catálogo de serviços. O serviço é o que liga o projeto ao centro de custo.',
    selectors: ['[data-tour="nav-/clients"]', '[data-tour="nav-group-/clients"]'],
    fallback: 'Cadastros, no menu lateral, tem Clientes e Serviços.',
    requiresCapability: ['cliente:ler', 'catalogo:editar'],
  },
  {
    id: 'analytics',
    title: 'A resposta que você veio buscar',
    body: 'Aqui a hora lançada encontra o valor vendido, e a margem aparece por projeto, por cliente e por centro de custo.',
    selectors: ['[data-tour="nav-/analises/financeiro"]', '[data-tour="nav-group-/analises/meu-time"]'],
    fallback: 'Análises, no menu lateral, é onde custo e receita se encontram.',
    requiresCapability: ['financeiro:ler', 'timesheet-terceiro:ler'],
  },
  {
    id: 'admin',
    title: 'A casa por dentro',
    body: 'Perfis de acesso, encargos, feriados e centros de custo. Sua empresa já nasceu com o essencial preenchido, e você ajusta o que for seu.',
    selectors: ['[data-tour="nav-/admin"]'],
    fallback: 'Configurações, no menu lateral, reúne os cadastros base da empresa.',
    requiresCapability: 'configuracao:editar',
  },
  {
    id: 'help',
    title: 'Se perder, é aqui',
    body: 'A Central de Ajuda explica cada tela, e guarda a trilha de primeiros passos. Este tour também volta de lá quando você quiser.',
    selectors: ['[data-tour="nav-/ajuda"]'],
    fallback: 'Ajuda, no fim do menu lateral, explica cada tela e traz este tour de volta.',
  },
  {
    id: 'done',
    title: 'É seu',
    body: 'Agora você tem o mapa. Se quiser companhia para montar a empresa, eu fico no canto da tela mostrando o próximo passo.',
    selectors: [],
  },
];

/**
 * Os passos que esta pessoa deve ver, na ordem.
 *
 * `granted` são as capacidades efetivas da sessão. Passo sem exigência é de todo mundo.
 */
export function stepsForCapabilities(granted: readonly string[]): readonly TourStep[] {
  return TOUR_STEPS.filter((step) => {
    if (step.hiddenWhenCan && hasAnyCapability(granted, step.hiddenWhenCan)) return false;
    return hasAnyCapability(granted, step.requiresCapability);
  });
}
