/**
 * Conteúdo da Central de Ajuda.
 *
 * Cada tópico responde três coisas, na ordem em que a pessoa pergunta: o que a tela é, como
 * ela usa, e como pedir o mesmo pelo MCP no chat.
 *
 * Duas regras que este arquivo respeita:
 *
 * 1. **O tópico é governado pela mesma capacidade da rota** (ADR-0027). Ajuda de tela que a
 *    pessoa não abre é ruído, e pior, sugere acesso que ela não tem. `requiresCapability`
 *    aqui é sempre igual ao `requireCapability` da rota em `App.tsx`.
 * 2. **Só existe o que existe.** Onde não há ferramenta de MCP, o tópico diz isso em vez de
 *    prometer. As ferramentas listadas foram conferidas em `apps/mcp-drive/src/index.ts` e
 *    `apps/mcp-activities/src/index.ts`.
 */
import type { CapabilityRequirement } from '@/lib/access/capabilities';

export type McpServer = 'drive' | 'activities';

export interface HelpMcp {
  /** Qual servidor atende. `null` quando ainda não há ferramenta para o assunto. */
  server: McpServer | null;
  /** Nomes exatos das ferramentas, como o cliente de MCP as expõe. */
  tools?: string[];
  /** Frase que a pessoa pode digitar no chat. Escrita como se falasse, não como comando. */
  example?: string;
  /** Quando não há ferramenta, o que dizer no lugar. */
  note?: string;
}

export interface HelpTopic {
  id: string;
  title: string;
  /** Rota da tela, quando o tópico tem uma. */
  route?: string;
  /** Mesma capacidade da rota. Ausente = todo mundo autenticado vê o tópico. */
  requiresCapability?: CapabilityRequirement;
  /** O que a tela é, em uma ou duas frases. */
  what: string;
  /** Como a pessoa interage. Passos, não features. */
  how: string[];
  mcp: HelpMcp;
}

export interface HelpGroup {
  id: string;
  label: string;
  topics: HelpTopic[];
}

const SEM_MCP_ESCRITA_PROPRIA: HelpMcp = {
  server: null,
  note:
    'Não há ferramenta de MCP para isto, e é decisão, não falta: apontamento e marcação são registro pessoal com efeito em folha e cobrança. Um modelo lançando hora em seu nome tiraria de você a autoria do dado.',
};

export const HELP_GROUPS: HelpGroup[] = [
  {
    id: 'meu-dia',
    label: 'Meu dia',
    topics: [
      {
        id: 'timesheet',
        title: 'Timesheet — apontar as próprias horas',
        route: '/my-timesheet',
        what:
          'Onde você registra as horas trabalhadas por projeto e atividade, e submete o período para aprovação.',
        how: [
          'Escolha a semana no seletor de período.',
          'Lance as horas na linha do projeto e da atividade correspondente. Só aparecem os projetos em que você está alocado.',
          'Confira o total do período antes de submeter — depois de submetido, a correção passa por quem aprova.',
          'Submeta. O período fica travado para edição e vai para a fila de aprovação.',
        ],
        mcp: SEM_MCP_ESCRITA_PROPRIA,
      },
      {
        id: 'meus-projetos',
        title: 'Meus Projetos — a visão de execução',
        route: '/my-projects',
        what:
          'A lista dos projetos em que você atua, com as suas horas e o andamento. É a visão de quem executa, sem financeiro do projeto.',
        how: [
          'Clique no projeto para abrir a visão de execução.',
          'Projeto em fase de planejamento não abre: o gerente avisa quando iniciar.',
          'Quem enxerga o portfólio completo abre a tela cheia do projeto no lugar desta.',
        ],
        mcp: {
          server: 'drive',
          tools: ['list_projects', 'find_project'],
          example: 'Quais projetos eu tenho em andamento e quem é o gerente de cada um?',
        },
      },
      {
        id: 'ponto',
        title: 'Meu Ponto — marcação de jornada',
        route: '/jornada',
        what:
          'Registro de entrada, intervalo e saída, com resumo diário e banco de horas. É separado do timesheet: ponto é jornada, timesheet é alocação de esforço em projeto.',
        how: [
          'Marque entrada, intervalo e saída no dia corrente.',
          'Confira o resumo diário e o saldo de banco de horas.',
          'Divergência em dia fechado vira pedido de ajuste, com justificativa, e vai para aprovação.',
        ],
        mcp: SEM_MCP_ESCRITA_PROPRIA,
      },
    ],
  },
  {
    id: 'comercial',
    label: 'Pipeline e Orçamentos',
    topics: [
      {
        id: 'pipeline',
        title: 'Pipeline — oportunidades por etapa',
        route: '/pipeline',
        requiresCapability: 'pipeline:ler',
        what:
          'O quadro das oportunidades comerciais por etapa, com valor e próxima ação. Arrastar entre etapas é o que move a oportunidade.',
        how: [
          'Arraste o cartão para a etapa nova. A data da mudança fica registrada.',
          'Abra a oportunidade para registrar a próxima ação e a data — é o que alimenta o alerta de oportunidade parada.',
          'O valor da oportunidade vem do orçamento aprovado quando existe um; sem orçamento, é a estimativa que você informar.',
        ],
        mcp: {
          server: 'drive',
          tools: [
            'list_opportunities',
            'create_opportunity',
            'update_opportunity',
            'move_opportunity_stage',
          ],
          example:
            'Cria uma oportunidade para a Acme, product studio, 80 mil estimados, e move a da Beta para negociação.',
          note:
            'Ganho e Perda não passam pelo chat: fechar negócio ativa o orçamento e cria o projeto, e dar perda arquiva e cancela os follow-ups pendentes. As duas ficam na tela, onde o Pulse pergunta o que falta decidir. Criar, editar e mover entre as etapas do funil e o Follow Up funcionam, dentro do que o seu perfil permite.',
        },
      },
      {
        id: 'orcamentos',
        title: 'Orçamentos — montar e versionar',
        route: '/budgets/new',
        requiresCapability: 'orcamento:ler',
        what:
          'Composição do orçamento por cargo, material, assinatura e fornecedor, com margem calculada e versionamento.',
        how: [
          'Escolha o cliente e o tipo de serviço; o catálogo preenche os cargos disponíveis.',
          'Informe horas por cargo e por mês. A margem é recalculada a cada mudança.',
          'Margem abaixo do mínimo bloqueia o salvamento e pede aprovação de quem tem alçada.',
          'Salvar cria uma versão nova em vez de sobrescrever — o histórico da negociação fica inteiro.',
        ],
        mcp: {
          server: null,
          note:
            'Não há ferramenta de MCP para orçamento. O que o orçamento decide (preço, margem, alçada) é compromisso comercial, e o modelo não tem como confirmar a intenção de quem negocia. Consulte pelo pipeline e monte na tela.',
        },
      },
      {
        id: 'clientes',
        title: 'Clientes',
        route: '/clients',
        requiresCapability: 'cliente:ler',
        what: 'Cadastro dos clientes, com os dados que orçamento, projeto e nota fiscal consomem.',
        how: [
          'Busque pelo nome antes de criar — cliente duplicado divide o histórico em dois.',
          'Abra o cliente para ver os projetos e as oportunidades ligadas a ele.',
          'Editar exige a capacidade de editar cliente; ler não.',
        ],
        mcp: {
          server: null,
          note:
            'Sem ferramenta própria. O nome do cliente aparece nas listas de projeto e de oportunidade pelo MCP, em `list_projects` e `list_opportunities`.',
        },
      },
      {
        id: 'servicos',
        title: 'Serviços e catálogo',
        route: '/comercial/servicos',
        requiresCapability: 'catalogo:editar',
        what:
          'A árvore de serviços e atividades que alimenta orçamento e apontamento. Mexer aqui muda o que aparece para todo mundo.',
        how: [
          'Crie a linha de serviço primeiro, depois os itens dentro dela.',
          'Marque se o item é serviço ou atividade: é o que define onde ele aparece no apontamento.',
          'Item em uso não é excluído, é desativado — para não quebrar orçamento e histórico.',
        ],
        mcp: {
          server: null,
          note: 'Sem ferramenta de MCP. É cadastro-base do tenant e muda o que todos veem.',
        },
      },
    ],
  },
  {
    id: 'projetos',
    label: 'Projetos',
    topics: [
      {
        id: 'portfolio',
        title: 'Portfólio — todos os projetos',
        route: '/projetos',
        requiresCapability: 'portfolio:ler',
        what:
          'A lista completa dos projetos com cliente, gerente, período e etapa. É a porta de entrada para a tela do projeto.',
        how: [
          'Filtre por etapa, cliente ou gerente para achar o projeto.',
          'Abra o projeto para chegar em equipe, atividades, financeiro, arquivos e OKRs.',
          'A etapa do portfólio é o que governa o que a tela do projeto mostra.',
        ],
        mcp: {
          server: 'drive',
          tools: ['list_projects', 'find_project'],
          example: 'Quais projetos estão na etapa de entrega de valor?',
        },
      },
      {
        id: 'atividades',
        title: 'Atividades do projeto — o kanban',
        route: '/projetos',
        requiresCapability: 'projeto:ler',
        what:
          'O quadro de cards do projeto, com colunas de Product Backlog a Done, sprint, pontos, responsável e bloqueio.',
        how: [
          'Crie o card na coluna de backlog e descreva a user story e os critérios de aceitação.',
          'Associe o card à sprint quando ele entrar no ciclo.',
          'Avance o card uma coluna por vez. Card bloqueado não avança, e a coluna recusa entrada acima do limite de trabalho em andamento.',
          'Bloqueio exige motivo. É o que aparece no status da sprint como impedimento.',
        ],
        mcp: {
          server: 'activities',
          tools: [
            'list_project_cards',
            'get_card_details',
            'create_card',
            'update_card',
            'move_card',
            'block_card',
            'unblock_card',
            'archive_card',
            'get_sprint_status',
            'list_sprints',
            'assign_card_to_sprint',
          ],
          example:
            'Cria um card no projeto Cobrança Automática para ajustar o relatório de horas, com 3 pontos, e joga na sprint atual.',
          note:
            'Só para LER o quadro, o og-pulse-drive também resolve, com list_project_activities — útil se você instalou apenas ele. Criar, mover e bloquear exigem o og-pulse-activities.',
        },
      },
      {
        id: 'arquivos',
        title: 'Arquivos do projeto — pasta no OneDrive',
        route: '/projetos',
        requiresCapability: 'arquivo-projeto:ler',
        what:
          'A pasta do projeto no OneDrive, vinculada ao registro do projeto no Pulse. O Pulse guarda o vínculo; o arquivo mora no OneDrive.',
        how: [
          'Abra a aba de arquivos na tela do projeto para navegar na pasta.',
          'Projeto sem pasta vinculada precisa da pasta criada antes do primeiro arquivo.',
          'O acesso ao arquivo é o seu acesso no OneDrive — o Pulse não amplia nem reduz isso.',
        ],
        mcp: {
          server: 'drive',
          tools: [
            'microsoft_login',
            'microsoft_status',
            'list_project_folder',
            'create_project_folder',
            'upload_to_project',
          ],
          example:
            'Sobe o arquivo ~/Downloads/ata-kickoff.docx na pasta Execução do projeto Cobrança Automática.',
        },
      },
      {
        id: 'alocacoes',
        title: 'Alocações — quem está em quê',
        route: '/projetos/alocacoes',
        requiresCapability: 'alocacao:ler',
        what:
          'Horas planejadas por pessoa e por mês, com a carga total contra a capacidade. É planejamento, não apontamento.',
        how: [
          'Escolha o ano e filtre por gerente ou projeto.',
          'Expanda a pessoa para ver a quebra por projeto.',
          'Editar a célula do mês muda o planejado. Mês fechado e alocação interna dependem de alçada específica.',
          'O semáforo compara planejado com capacidade: é ele que mostra sobrecarga antes de ela acontecer.',
        ],
        mcp: {
          server: 'drive',
          tools: ['list_project_team'],
          example: 'Quem está alocado no projeto Cobrança Automática e quantas horas cada um tem?',
        },
      },
      {
        id: 'financeiro-projeto',
        title: 'Financeiro do projeto',
        route: '/analises/financeiro',
        requiresCapability: 'financeiro:ler',
        what:
          'Receita, custo, comissão e margem do projeto. É dado sensível: a barreira está no banco, não na tela.',
        how: [
          'Abra a aba financeira do projeto ou a análise financeira consolidada.',
          'Custo lançado em período fechado só é corrigido por quem tem alçada para reabrir.',
          'A margem vem da hora lançada, não da planejada — divergência aqui costuma ser apontamento faltando.',
        ],
        mcp: {
          server: null,
          note:
            'De propósito nenhuma ferramenta de MCP devolve valor de contrato, custo ou margem. As listas de projeto pelo MCP dizem isso explicitamente na própria descrição. Consulte financeiro na tela, autenticado.',
        },
      },
      {
        id: 'okrs',
        title: 'OKRs e estratégia',
        route: '/estrategia',
        requiresCapability: 'iniciativa:editar',
        what:
          'Objetivos, resultados-chave, iniciativas e check-ins, no ciclo vigente. Também existem OKRs por projeto.',
        how: [
          'Escolha o ciclo. Objetivo sem ciclo não entra no acompanhamento.',
          'Registre o check-in no resultado-chave: é o check-in que move o progresso, não a edição da meta.',
          'Iniciativa é o trabalho que persegue o resultado — ligue uma à outra para o quadro fazer sentido.',
        ],
        mcp: {
          server: 'drive',
          tools: ['list_project_okrs'],
          example: 'Como está o progresso dos OKRs do projeto Cobrança Automática?',
        },
      },
    ],
  },
  {
    id: 'pessoas',
    label: 'Pessoas',
    topics: [
      {
        id: 'funcionarios',
        title: 'Funcionários — ficha completa',
        route: '/employees',
        requiresCapability: 'pessoa:ler-ficha-completa',
        what:
          'Cadastro das pessoas com dados pessoais, contrato, custo, benefícios e ferramentas.',
        how: [
          'Busque a pessoa e abra a ficha.',
          'Mudança com efeito financeiro cria uma versão com data de vigência, em vez de sobrescrever o histórico.',
          'O perfil de acesso aparece na ficha, mas é alterado em Configurações → Perfis de Acesso.',
        ],
        mcp: {
          server: null,
          note:
            'Sem ferramenta de MCP. Dado pessoal e remuneração não passam por um contexto de modelo — é a mesma razão pela qual as ferramentas de projeto não devolvem custo.',
        },
      },
      {
        id: 'meu-time',
        title: 'Meu Time — apontamento de terceiros',
        route: '/analises/meu-time',
        requiresCapability: 'timesheet-terceiro:ler',
        what:
          'O acompanhamento do apontamento da equipe: quem lançou, quem está atrasado e qual o ritmo.',
        how: [
          'Filtre pelo período e pelo seu time.',
          'A lente de aderência mostra quem tem lançamento faltando.',
          'Corrigir apontamento de outra pessoa exige a capacidade de editar timesheet de terceiro.',
        ],
        mcp: {
          server: null,
          note: 'Sem ferramenta de MCP para apontamento, próprio ou de terceiro.',
        },
      },
      {
        id: 'ferias',
        title: 'Férias',
        route: '/rh/ferias',
        requiresCapability: 'ferias:gerir',
        what: 'Solicitações de férias, saldo por pessoa e aprovação.',
        how: [
          'A pessoa solicita pela própria área; a aprovação acontece aqui.',
          'O aprovador é quem está designado para aquela pessoa, não qualquer gerente.',
          'O saldo considera o período aquisitivo — não é contagem simples de dias.',
        ],
        mcp: { server: null, note: 'Sem ferramenta de MCP. Aprovação é ato de gestão com efeito trabalhista.' },
      },
      {
        id: 'recrutamento',
        title: 'Vagas e candidaturas',
        route: '/rh/vagas',
        requiresCapability: ['vaga:editar', 'candidatura:ler'],
        what:
          'Vagas publicadas, candidaturas recebidas e currículos. A página pública de candidatura sai daqui.',
        how: [
          'Publique a vaga para gerar o link público de candidatura.',
          'A candidatura chega na lista e notifica quem responde por recrutamento.',
          'O currículo é lido dentro do seu tenant — nunca de outro.',
        ],
        mcp: { server: null, note: 'Sem ferramenta de MCP. Currículo é dado pessoal de terceiro que nem é usuário do sistema.' },
      },
      {
        id: 'desligamentos',
        title: 'Desligamentos',
        route: '/rh/desligamentos',
        requiresCapability: 'desligamento:executar',
        what: 'Processo de desligamento, com documentos e verbas.',
        how: [
          'Abra o desligamento a partir da ficha da pessoa.',
          'Os documentos e as verbas ficam ligados ao desligamento, não à ficha.',
          'A pessoa desligada sai das listas ativas e passa a aparecer em funcionários desligados.',
        ],
        mcp: { server: null, note: 'Sem ferramenta de MCP.' },
      },
    ],
  },
  {
    id: 'configuracao',
    label: 'Configuração',
    topics: [
      {
        id: 'perfis',
        title: 'Perfis de Acesso — quem vê o quê',
        route: '/admin',
        requiresCapability: 'configuracao:editar',
        what:
          'Os perfis do tenant e as capacidades que cada um concede. Ligar uma capacidade aqui muda o acesso no banco, não só na tela — passou a ser configuração, não deploy.',
        how: [
          'Abra o perfil no card para ver e alterar o que ele pode.',
          'A aba Pessoas move alguém de perfil. Cada pessoa tem exatamente um perfil.',
          'Acumulação de função tem dois caminhos: criar um perfil composto, ou dar uma exceção pontual na aba Exceções. Se a mesma exceção aparece em três pessoas, o que falta é um perfil.',
          'Ninguém altera o próprio acesso, nem sendo admin. E o banco recusa deixar o tenant sem alguém capaz de gerir perfis.',
        ],
        mcp: {
          server: null,
          note:
            'Sem ferramenta de MCP, por desenho. Conceder acesso é a última coisa que se delega a um modelo — e o banco recusaria de todo modo, porque a escrita de perfil exige admin e nega auto-alteração.',
        },
      },
      {
        id: 'admin',
        title: 'Portal do Admin — parâmetros da empresa',
        route: '/admin',
        requiresCapability: 'configuracao:editar',
        what:
          'Tabela de preços por cargo, encargos e perfil de folha, configurações financeiras, feriados, tipos de atividade e lembretes.',
        how: [
          'Cada aba é um parâmetro que o resto do sistema consome — mudança aqui reflete em orçamento, custo e folha.',
          'Feriado cadastrado entra no cálculo de capacidade e de dias úteis.',
          'Lembrete de timesheet dispara para quem tem apontamento faltando.',
        ],
        mcp: { server: null, note: 'Sem ferramenta de MCP. É parâmetro-base do tenant.' },
      },
    ],
  },
];
