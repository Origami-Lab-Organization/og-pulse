/**
 * Fonte única de verdade da landing page pública.
 *
 * Tudo que descreve o produto para fora — copy da página, JSON-LD, `llms.txt`,
 * `sitemap.xml` e metatags sociais — nasce daqui. A regra do Harness
 * (skill SEO & GEO) é que identidade e oferta não vivam em arquivo estático que
 * desatualiza sozinho: o build (`scripts/prerender-landing.mjs`) lê este módulo
 * e gera os artefatos. Mudou a oferta? Muda aqui, e só aqui.
 *
 * Sem React aqui de propósito: o módulo é importado tanto pela página quanto
 * pelo script de build em Node. Os contratos vivem em `src/types/landing.ts`.
 */

import type {
  ComparisonRow,
  FaqItem,
  Feature,
  FooterColumn,
  HeroStat,
  JsonLd,
  LegalDocument,
  PublicRoute,
  Pain,
  Spotlight,
} from '@/types/landing';

export const SITE = {
  /** Origem canônica. Uma só, sem www — a mesma usada pelas Edge Functions. */
  origin: 'https://origamipulse.com.br',
  name: 'Origami Pulse',
  shortName: 'Pulse',
  maker: {
    name: 'Origami Lab',
    url: 'https://origamilab.com.br',
  },
  /** Contato definido em 09/09/2026 para pedir o uso após o período de teste. */
  contactEmail: 'italo@origamilab.com.br',
  locale: 'pt_BR',
  language: 'pt-BR',
  logoPath: '/brand/origami-pulse-logo.png',
  ogImagePath: '/og-image.png',
} as const;

export const TRIAL = {
  days: 14,
  label: 'Teste grátis por 14 dias',
  afterwards:
    'Ao fim do período de teste, fale com a Origami Lab para continuar usando a ferramenta.',
} as const;

export const SEO = {
  title: 'Origami Pulse | Rentabilidade de projetos para empresas de serviços',
  description:
    'Software de PSA para consultorias, agências e escritórios técnicos: pipeline comercial, orçamentos, alocação, horas e margem real por projeto em um só lugar. Teste grátis por 14 dias.',
  canonical: `${SITE.origin}/`,
} as const;

export const NAV = {
  login: '/login',
  register: '/register',
  terms: '/termos',
  privacy: '/privacidade',
  /** Âncoras absolutas (`/#secao`): funcionam na home e a partir de qualquer outra página pública. */
  features: '/#funcionalidades',
  howItWorks: '/#como-funciona',
  faq: '/#perguntas-frequentes',
} as const;

export const HERO = {
  eyebrow: 'PSA para empresas de serviços',
  title: 'Saiba qual projeto dá lucro de verdade.',
  subtitle:
    'O Origami Pulse reúne pipeline comercial, orçamentos, alocação de equipe, apontamento de horas e custo de pessoas para mostrar a margem real de cada projeto, antes do fim do mês.',
  primaryCta: 'Começar teste grátis',
  secondaryCta: 'Entrar na minha conta',
  note: `${TRIAL.label}. Sem cartão de crédito.`,
} as const;

/**
 * Bloco definicional (GEO): resposta direta no primeiro parágrafo, do jeito
 * que um motor generativo cita. Mesmo texto vai para o `llms.txt`.
 */
export const DEFINITION = {
  heading: 'O que é o Origami Pulse',
  answer:
    'Origami Pulse é um software brasileiro de PSA (Professional Services Automation) para empresas de serviços que precisam saber a rentabilidade real de cada projeto. Ele reúne, em uma única plataforma por empresa, o pipeline comercial com oportunidades e orçamentos, a alocação da equipe, o apontamento de horas, o custo de cada pessoa e a margem realizada por projeto, cliente e gerente.',
  psaHeading: 'O que é PSA',
  psaAnswer:
    'PSA, sigla de Professional Services Automation, é a categoria de software que administra o ciclo completo de uma empresa que vende serviços por projeto: da oportunidade comercial ao orçamento, da alocação de pessoas ao apontamento de horas, e do custo real à margem entregue. Diferente de uma ferramenta de tarefas, o PSA responde quanto cada projeto custou e quanto sobrou.',
} as const;

export const PROBLEM = {
  eyebrow: 'O problema',
  title: 'Você fatura bem. Sabe o que sobra?',
  paragraphs: [
    'Empresas de serviços descobrem que um projeto foi deficitário meses depois de encerrado. Precificam o próximo no feeling, sem histórico de custo real. E os dados moram em três ferramentas e cinco planilhas.',
    'O Pulse junta comercial, projetos e pessoas numa base só, para a margem aparecer enquanto o projeto ainda está acontecendo.',
  ],
  pains: [
    {
      title: 'A margem chega atrasada',
      description: 'O resultado do projeto aparece no fechamento contábil, quando não dá mais para corrigir escopo, equipe ou preço.',
    },
    {
      title: 'O preço sai no feeling',
      description: 'Sem o custo real de cada hora, o orçamento novo copia o anterior e repete o erro com juros.',
    },
    {
      title: 'Cada dado mora num lugar',
      description: 'Oportunidades numa ferramenta, horas em outra, custos na planilha do financeiro. Ninguém junta as pontas a tempo.',
    },
  ] as readonly Pain[],
} as const;

export const FEATURES: readonly Feature[] = [
  {
    icon: 'TrendingUp',
    title: 'Margem real por projeto',
    description:
      'Custo de mão de obra pelo apontamento de horas, fornecedores e materiais contra a receita contratada. A margem realizada aparece ao lado da planejada.',
  },
  {
    icon: 'FileText',
    title: 'Pipeline e orçamentos',
    description:
      'Oportunidades por etapa, catálogo de serviços com modelos de cobrança (escopo fixo, recorrente, taxa de sucesso e combinações) e orçamento versionado com margem calculada.',
  },
  {
    icon: 'FolderKanban',
    title: 'Alocação e capacidade',
    description:
      'Planeje horas por pessoa e mês, compare com o realizado e veja quem está sobrecarregado ou ocioso antes que vire atraso.',
  },
  {
    icon: 'Clock',
    title: 'Apontamento de horas sem fricção',
    description:
      'Grade semanal com pré-preenchimento pela alocação, fechamento de semana e leitura no celular. A hora lançada alimenta o custo do projeto.',
  },
  {
    icon: 'Users',
    title: 'Custo real de cada pessoa',
    description:
      'Salário, encargos, benefícios e ferramentas compõem o custo por hora de cada colaborador, por tipo de contratação, sem planilha paralela.',
  },
  {
    icon: 'Shield',
    title: 'Uma empresa, um ambiente',
    description:
      'Cada empresa tem seu espaço isolado no banco de dados, com permissões por perfil e trilha de quem alterou o quê.',
  },
] as const;

export const AUDIENCE = {
  eyebrow: 'Para quem',
  title: 'Feito para quem vende horas e projetos',
  items: [
    'Consultorias de gestão e tecnologia',
    'Agências de marketing e design',
    'Software houses e estúdios de produto',
    'Escritórios de arquitetura e engenharia',
  ],
} as const;

export const COMPARISON = {
  eyebrow: 'Antes e depois',
  title: 'Planilhas e ferramenta de tarefas, ou o Pulse',
  columns: ['Planilhas + tarefas', 'Origami Pulse'],
  rows: [
    {
      topic: 'Custo da hora de cada pessoa',
      spreadsheets: 'Estimado uma vez por ano, se tanto',
      pulse: 'Calculado a partir de salário, encargos, benefícios e ferramentas',
    },
    {
      topic: 'Margem do projeto',
      spreadsheets: 'Conhecida no fechamento, meses depois',
      pulse: 'Acompanhada mês a mês, planejado contra realizado',
    },
    {
      topic: 'Orçamento novo',
      spreadsheets: 'Copiado do anterior, no feeling',
      pulse: 'Montado sobre o catálogo de serviços e o custo real da equipe',
    },
    {
      topic: 'Alocação da equipe',
      spreadsheets: 'Planejada e apontada em lugares diferentes',
      pulse: 'Planejada e apontada na mesma base, com desvio visível',
    },
    {
      topic: 'Dados de várias empresas',
      spreadsheets: 'Um arquivo por cliente, sem controle de acesso',
      pulse: 'Ambiente isolado por empresa, com perfis de acesso',
    },
  ] as readonly ComparisonRow[],
} as const;

export const TRIAL_SECTION = {
  eyebrow: 'Como funciona',
  title: `${TRIAL.days} dias para ver a margem dos seus projetos`,
  steps: [
    {
      title: 'Cadastre a empresa',
      description: 'Nome, CNPJ e o administrador. Leva menos de dois minutos.',
    },
    {
      title: 'Convide o time e cadastre os projetos',
      description:
        'Pessoas, clientes, serviços e projetos entram pelo próprio sistema. Sem importação obrigatória.',
    },
    {
      title: 'Aponte horas e leia a margem',
      description:
        'Com uma semana de horas lançadas, a margem realizada de cada projeto já aparece.',
    },
    {
      title: 'Decida com dados',
      description: `Ao fim dos ${TRIAL.days} dias, escreva para ${SITE.contactEmail} para continuar usando.`,
    },
  ],
} as const;

export const FAQ: readonly FaqItem[] = [
  {
    question: 'O que é o Origami Pulse?',
    answer: DEFINITION.answer,
  },
  {
    question: 'Para quem o Origami Pulse é indicado?',
    answer:
      'Para empresas que vendem serviços por projeto e precisam saber a rentabilidade de cada um: consultorias, agências, software houses, estúdios de produto e escritórios de arquitetura e engenharia. O modelo é por empresa, não por usuário.',
  },
  {
    question: 'Como funciona o teste grátis de 14 dias?',
    answer:
      'Você cadastra a empresa e o administrador, convida o time e usa todas as funcionalidades por 14 dias, sem cartão de crédito. Ao fim do período, para continuar usando, escreva para italo@origamilab.com.br. Seus dados ficam guardados enquanto a conversa acontece.',
  },
  {
    question: 'O que acontece quando o período de teste termina?',
    answer:
      'O acesso ao ambiente da empresa é pausado e a tela orienta a falar com a Origami Lab pelo e-mail italo@origamilab.com.br. Nada é apagado: quando o uso é liberado, tudo volta como estava.',
  },
  {
    question: 'Como o Pulse calcula o custo real de um colaborador?',
    answer:
      'Somando salário, encargos, benefícios e ferramentas de cada pessoa, conforme o tipo de contratação, e dividindo pela jornada. Esse custo por hora é aplicado a cada hora apontada em projeto, e é assim que a margem realizada é calculada.',
  },
  {
    question: 'Posso criar orçamentos e propostas comerciais?',
    answer:
      'Sim. O orçamento parte do catálogo de serviços da empresa, com modelos de cobrança como escopo fixo, recorrente, taxa de sucesso e combinações, e calcula a margem com base no custo real da equipe. Cada orçamento tem versões, e o aprovado vira projeto.',
  },
  {
    question: 'Os dados da minha empresa ficam separados dos de outras?',
    answer:
      'Sim. Cada empresa tem um ambiente isolado, com a separação garantida no banco de dados e permissões por perfil de acesso. Dados financeiros e de pessoas só aparecem para quem tem a capacidade correspondente.',
  },
  {
    question: 'Funciona no celular?',
    answer:
      'Sim. O apontamento de horas e as tarefas do dia funcionam como aplicativo instalável no celular, com leitura mesmo sem conexão.',
  },
  {
    question: 'Quem faz o Origami Pulse?',
    answer:
      'A Origami Lab, empresa brasileira de consultoria e tecnologia. O Pulse nasceu da necessidade da própria Origami de saber qual projeto dava lucro de verdade.',
  },
] as const;

export const FINAL_CTA = {
  eyebrow: 'Comece agora',
  title: 'Veja a margem dos seus projetos ainda esta semana.',
  subtitle: `${TRIAL.label}, sem cartão de crédito. Depois, é só falar com a gente.`,
  cta: 'Começar teste grátis',
} as const;

export const FOOTER = {
  tagline: 'Feito pela Origami Lab.',
  links: [
    { label: 'Entrar', href: NAV.login },
    { label: 'Funcionalidades', href: NAV.features },
    { label: 'Perguntas frequentes', href: NAV.faq },
    { label: 'Termos de uso', href: NAV.terms },
    { label: 'Privacidade', href: NAV.privacy },
  ],
} as const;

/** Fatos curtos do hero. Só o que já é decisão ou característica real do produto. */
export const HERO_STATS: readonly HeroStat[] = [
  { value: `${TRIAL.days} dias`, label: 'de teste, sem cartão' },
  { value: '1 base', label: 'para comercial, projetos e pessoas' },
  { value: 'Por empresa', label: 'não por usuário' },
] as const;

/** Faixa em movimento com os segmentos atendidos. */
export const MARQUEE: readonly string[] = [
  'Consultorias',
  'Agências',
  'Software houses',
  'Estúdios de produto',
  'Arquitetura',
  'Engenharia',
  'Serviços profissionais',
] as const;

/** Três destaques com ilustração do produto ao lado. */
export const SPOTLIGHTS: readonly Spotlight[] = [
  {
    eyebrow: 'Comercial',
    title: 'Do orçamento ao projeto, sem planilha no meio',
    description:
      'A Oportunidade avança por etapa no Pipeline, o orçamento nasce do catálogo de serviços com o custo real da equipe, e o aprovado vira projeto com receita, equipe e marcos já definidos.',
    bullets: ['Etapas com pré-requisitos, não com achismo', 'Modelos de cobrança do seu catálogo', 'Versões do orçamento comparáveis'],
    mock: 'pipeline',
  },
  {
    eyebrow: 'Operação',
    title: 'Alocação planejada e horas apontadas, lado a lado',
    description:
      'Você planeja horas por pessoa e mês; o time aponta na grade semanal já pré-preenchida pelo plano. O desvio aparece por projeto e por pessoa, antes de virar atraso ou estouro.',
    bullets: ['Capacidade por pessoa e por mês', 'Semana fechada com um clique', 'Funciona no celular, como app'],
    mock: 'allocation',
  },
  {
    eyebrow: 'Financeiro',
    title: 'Margem realizada de cada projeto, todo mês',
    description:
      'Cada hora apontada carrega o custo real de quem a fez. Somada a fornecedores e materiais, mostra a margem realizada contra a planejada, por projeto, cliente e gerente.',
    bullets: ['Custo por hora por tipo de contratação', 'Planejado contra realizado, mês a mês', 'Leitura por projeto, cliente e gerente'],
    mock: 'margin',
  },
] as const;

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    title: 'Produto',
    links: [
      { label: 'Funcionalidades', href: NAV.features },
      { label: 'Como funciona', href: NAV.howItWorks },
      { label: 'Perguntas frequentes', href: NAV.faq },
    ],
  },
  {
    title: 'Conta',
    links: [
      { label: 'Entrar', href: NAV.login },
      { label: 'Começar teste grátis', href: NAV.register },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Termos de uso', href: NAV.terms },
      { label: 'Política de privacidade', href: NAV.privacy },
    ],
  },
] as const;

/** Página 404 (PUL-240). O tsuru fica em `src/landing/OrigamiCrane.tsx`. */
export const NOT_FOUND = {
  eyebrow: 'Erro 404',
  title: 'Essa página dobrou para outro lado.',
  description: 'O endereço que você abriu não existe ou mudou de lugar. Nada se perdeu: o Origami Pulse continua aqui.',
  primaryCta: 'Ir para a página inicial',
  secondaryCta: 'Entrar na minha conta',
  hint: 'Chegou aqui por um link de dentro do produto? Escreva para',
  hintAfter: 'e a gente ajusta.',
} as const;

/**
 * Documentos legais (`/termos`, `/privacidade`). Versão inicial: registra só o que já é
 * decisão de produto (ADR-0028) e aponta o contato. O texto completo é tarefa própria;
 * até lá as páginas ficam `noindex` (ver PUBLIC_ROUTES).
 */
export const LEGAL: Record<'terms' | 'privacy', LegalDocument> = {
  terms: {
    title: 'Termos de uso',
    lead:
      'As condições para usar o Origami Pulse. Este documento está sendo finalizado; até a publicação da versão completa, valem as condições combinadas diretamente com a Origami Lab e o que está descrito abaixo.',
    updatedAt: '2026-09-09',
    sections: [
      {
        title: 'O que já vale hoje',
        bullets: [
          `O teste grátis dura ${TRIAL.days} dias corridos a partir da criação da empresa, sem cartão de crédito e com todas as funcionalidades liberadas.`,
          'Ao fim do teste, o acesso é pausado e os dados são preservados. Para continuar usando, a empresa fala com a Origami Lab.',
          'A conta é da empresa, não da pessoa: quem cria a empresa é o administrador e convida as demais pessoas.',
          'O e-mail do administrador precisa ser confirmado antes do primeiro acesso.',
        ],
      },
      {
        title: 'Uso aceitável',
        paragraphs: [
          'O Origami Pulse é uma ferramenta de gestão para empresas de serviços. Cada empresa é responsável pelos dados que cadastra, pelas pessoas que convida e pelo uso que faz das informações geradas.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Política de privacidade',
    lead:
      'Como o Origami Pulse trata os dados da sua empresa e das pessoas que trabalham nela. Este documento está sendo finalizado; o que está abaixo já é como o produto funciona hoje.',
    updatedAt: '2026-09-09',
    sections: [
      {
        title: 'O que já vale hoje',
        bullets: [
          'Os dados cadastrados pertencem à empresa que os cadastrou e ficam isolados por empresa: nenhuma outra empresa os acessa.',
          'O acesso é individual, por e-mail e senha ou por conta Microsoft da empresa. Quem administra a empresa define o que cada pessoa vê.',
          'Dados financeiros, de custo e de pessoas são protegidos no banco de dados, com regras de acesso por perfil, e não apenas na tela.',
          'A Origami Lab não vende dados e não os usa para fins fora da operação do produto.',
          'O site público não usa cookies de rastreamento: a medição de audiência é feita sem cookies, sem guardar o endereço IP e sem identificar a pessoa. Dentro da área logada, usamos analytics de produto, com gravação de sessão, para entender o uso e melhorar o Pulse; isso só começa depois do login.',
        ],
      },
      {
        title: 'Direitos sobre dados pessoais',
        paragraphs: [
          `Para acesso, correção ou exclusão de dados pessoais, escreva para ${SITE.contactEmail}. Pedidos de pessoas que trabalham em uma empresa cliente são atendidos junto com a administração dessa empresa.`,
        ],
      },
    ],
  },
};

/**
 * "© 2026 Origami Lab. Todos os direitos reservados." com o ano de agora. Usada pelo
 * rodapé público e pelo rodapé do app: no build sai o ano da compilação e o cliente
 * re-renderiza com o ano real ao carregar.
 */
export function copyrightLine(now: Date = new Date()): string {
  return `© ${now.getFullYear()} ${SITE.maker.name}. Todos os direitos reservados.`;
}

/* ------------------------------------------------------------------------ */
/* Artefatos derivados: JSON-LD, llms.txt e sitemap                          */
/* ------------------------------------------------------------------------ */

export function buildJsonLd(): JsonLd[] {
  const organization: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.maker.url}/#organization`,
    name: SITE.maker.name,
    url: SITE.maker.url,
    logo: `${SITE.origin}${SITE.logoPath}`,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: SITE.contactEmail,
        availableLanguage: ['Portuguese'],
      },
    ],
  };

  const website: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.origin}/#website`,
    url: `${SITE.origin}/`,
    name: SITE.name,
    inLanguage: SITE.language,
    publisher: { '@id': `${SITE.maker.url}/#organization` },
  };

  const software: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE.origin}/#software`,
    name: SITE.name,
    url: `${SITE.origin}/`,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Professional Services Automation',
    operatingSystem: 'Web',
    inLanguage: SITE.language,
    description: DEFINITION.answer,
    featureList: FEATURES.map((f) => f.title),
    offers: {
      '@type': 'Offer',
      name: TRIAL.label,
      price: '0',
      priceCurrency: 'BRL',
      description: `${TRIAL.days} dias de uso completo, sem cartão de crédito. ${TRIAL.afterwards}`,
      availability: 'https://schema.org/InStock',
      url: `${SITE.origin}${NAV.register}`,
    },
    author: { '@id': `${SITE.maker.url}/#organization` },
  };

  const faq: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE.origin}/#faq`,
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return [organization, website, software, faq];
}

/** Rotas públicas indexáveis. O app (login, dashboard…) é `noindex` de propósito. */
/**
 * Páginas públicas pré-renderizadas no build (`scripts/prerender-landing.mjs`).
 * Termos e privacidade ficam `indexable: false` (noindex, fora do sitemap) enquanto o
 * texto completo não é publicado: página fina indexada vale menos que nenhuma (PUL-240).
 * Quando o texto entrar, basta virar a chave aqui.
 */
export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { path: '/', title: SEO.title, description: SEO.description, indexable: true, changefreq: 'weekly', priority: '1.0' },
  {
    path: NAV.terms,
    title: 'Termos de uso | Origami Pulse',
    description:
      'Condições de uso do Origami Pulse: teste grátis de 14 dias sem cartão, conta por empresa, confirmação de e-mail e continuidade após o teste com a Origami Lab.',
    indexable: false,
    changefreq: 'monthly',
    priority: '0.3',
  },
  {
    path: NAV.privacy,
    title: 'Política de privacidade | Origami Pulse',
    description:
      'Como o Origami Pulse trata os dados da sua empresa e das pessoas: isolamento por empresa, acesso individual por perfil e contato para direitos do titular.',
    indexable: false,
    changefreq: 'monthly',
    priority: '0.3',
  },
] as const;

/** Página 404: `dist/404.html`, servida pela Vercel com status 404. Nunca indexável. */
export const NOT_FOUND_ROUTE: PublicRoute = {
  path: '/404',
  title: 'Página não encontrada | Origami Pulse',
  description: 'O endereço que você abriu não existe ou mudou de lugar. Volte para a página inicial ou entre na sua conta.',
  indexable: false,
};

export function buildSitemap(lastmod: string): string {
  const urls = PUBLIC_ROUTES.filter((r) => r.indexable).map(
    (r) =>
      `  <url>\n    <loc>${SITE.origin}${r.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${r.changefreq ?? 'monthly'}</changefreq>\n    <priority>${r.priority ?? '0.5'}</priority>\n  </url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/**
 * llms.txt (llmstxt.org): identidade oficial, oferta, links canônicos e
 * desambiguação para motores generativos. Gerado no build a partir daqui.
 */
export function buildLlmsTxt(): string {
  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${DEFINITION.answer}`,
    '',
    `${SITE.name} é um produto da ${SITE.maker.name} (${SITE.maker.url}). Site oficial: ${SITE.origin}/. Idioma: português do Brasil.`,
    '',
    '## Oferta',
    '',
    `- ${TRIAL.label}, sem cartão de crédito, com todas as funcionalidades.`,
    `- ${TRIAL.afterwards} Contato: ${SITE.contactEmail}.`,
    '- Modelo por empresa (multiempresa), não por usuário.',
    '',
    '## O que o produto faz',
    '',
    ...FEATURES.map((f) => `- ${f.title}: ${f.description}`),
    '',
    '## Para quem',
    '',
    ...AUDIENCE.items.map((i) => `- ${i}`),
    '',
    '## Termos do produto',
    '',
    `- PSA: ${DEFINITION.psaAnswer}`,
    '- Oportunidade: negócio comercial em andamento no pipeline, do primeiro contato ao fechamento.',
    '- Orçamento: proposta comercial montada sobre o catálogo de serviços, com versões e margem calculada.',
    '- Alocação: horas planejadas por pessoa e mês em cada projeto, comparadas ao apontado.',
    '- Margem realizada: receita do projeto menos o custo das horas apontadas e demais custos lançados.',
    '',
    '## Perguntas frequentes',
    '',
    ...FAQ.flatMap((item) => [`### ${item.question}`, '', item.answer, '']),
    '## Links canônicos',
    '',
    `- Página inicial: ${SITE.origin}/`,
    `- Entrar: ${SITE.origin}${NAV.login}`,
    `- Cadastrar empresa: ${SITE.origin}${NAV.register}`,
    `- Termos de uso: ${SITE.origin}${NAV.terms}`,
    `- Política de privacidade: ${SITE.origin}${NAV.privacy}`,
    `- Empresa responsável: ${SITE.maker.url}`,
    '',
    '## Desambiguação',
    '',
    `- "Origami Pulse" e "Pulse" nesta página referem-se ao software da ${SITE.maker.name}. O aplicativo (área logada) não é indexável; a referência pública é ${SITE.origin}/.`,
    '',
  ];
  return lines.join('\n');
}
