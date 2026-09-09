import type { ContentPage } from '@/types/landing';
import { ContentKind } from '@/types/landing';
import { TRIAL } from '@/landing/site';
import { SLUG } from '@/landing/slugs';

/** Páginas por persona (PUL-242, segunda leva). Mesmas regras de `pages.ts`. */

const UPDATED = '2026-09-09';

const agencias: ContentPage = {
  slug: SLUG.AGENCIAS,
  kind: ContentKind.PERSONA,
  navLabel: 'Para agências',
  eyebrow: 'Para agências',
  title: 'Software para agências: saiba a margem de cada cliente, não só o faturamento do mês',
  seoTitle: 'Software de gestão para agências de marketing e design | Origami Pulse',
  description:
    'O que uma agência precisa em um software de gestão: fee mensal e jobs no mesmo lugar, horas por cliente, custo real da equipe e margem por cliente e por projeto. Teste grátis por 14 dias.',
  lead:
    'Agência vende horas de gente criativa embaladas em fee mensal, jobs e projetos. O software de gestão certo para uma agência é o que mostra quanto cada cliente consome de equipe e quanto sobra do que ele paga, mês a mês, antes de renovar o contrato. Faturar bem e ter margem são coisas diferentes, e a diferença mora nas horas.',
  sections: [
    {
      title: 'O que uma agência precisa controlar',
      bullets: [
        'Quantas horas cada cliente consumiu no mês, de quem, e quanto essas horas custaram.',
        'Fee mensal contra horas do mês: o cliente de retainer está dando lucro ou virou um poço?',
        'Jobs avulsos e projetos: preço fechado contra horas de fato gastas.',
        'Quem está sobrecarregado e quem tem espaço, para aceitar ou não o próximo job.',
        'Pipeline de novos negócios e propostas, com valor e próxima ação.',
      ],
    },
    {
      title: 'Fee mensal, job e projeto no mesmo modelo',
      paragraphs: [
        'O catálogo de serviços do Origami Pulse tem modelos de cobrança que cobrem o dia a dia da agência: recorrente para o fee mensal, escopo fixo para jobs e projetos, taxa de sucesso para acordos por resultado, e combinações. Cada serviço vendido vira projeto, e o projeto recebe alocação e horas.',
      ],
      table: {
        caption: 'Como cada formato de venda da agência aparece no Pulse',
        head: ['Formato', 'Modelo de cobrança', 'O que a margem compara'],
        rows: [
          ['Fee mensal (retainer)', 'Recorrente', 'Mensalidade do mês contra horas e custos do mês'],
          ['Job avulso', 'Escopo fixo', 'Preço fechado contra horas apontadas até a entrega'],
          ['Campanha com bônus por resultado', 'Taxa de sucesso, ou combinação com fixo', 'Fixo mais o variável reconhecido contra o custo total'],
          ['Projeto longo (site, rebranding)', 'Escopo fixo com parcelas', 'Parcelas recebidas contra custo acumulado, mês a mês'],
        ],
      },
    },
    {
      title: 'O que o Origami Pulse entrega para agências',
      bullets: [
        'Pipeline com oportunidades por etapa, valor estimado e follow-up.',
        'Orçamento versionado sobre o catálogo, com margem calculada antes de enviar a proposta.',
        'Alocação por pessoa, projeto e mês, com leitura de sobrecarga e ociosidade.',
        'Apontamento de horas em grade semanal, pré-preenchida pela alocação, com uso no celular.',
        'Custo hora por pessoa (CLT, PJ, estágio, sócio), com encargos, benefícios e ferramentas.',
        'Margem realizada por projeto, cliente e gerente, ao lado da planejada.',
      ],
    },
    {
      title: 'A conversa de renovação muda',
      paragraphs: [
        'Com horas por cliente e custo hora real, a renovação do fee deixa de ser sensação e vira número: o cliente consumiu 30% a mais de horas do que o contrato previa, ou está confortavelmente dentro. Dá para reajustar, renegociar escopo ou trocar a equipe alocada com dado na mão, e não depois de perder a margem do ano.',
      ],
    },
    {
      title: 'Como começar',
      paragraphs: [
        `Cadastre a agência e o administrador, confirme o e-mail, convide a equipe e cadastre os clientes e contratos em andamento. Com uma semana de horas apontadas, a margem de cada cliente já aparece. ${TRIAL.label}, sem cartão de crédito. ${TRIAL.afterwards}`,
      ],
    },
  ],
  faq: [
    {
      question: 'Serve para agência que trabalha com fee mensal?',
      answer:
        'Sim. O modelo de cobrança recorrente representa o fee, e a margem é lida mês a mês: a mensalidade contra as horas apontadas e os custos daquele mês. É o formato em que um retainer mostra se está ficando mais caro de sustentar do que o cliente paga.',
    },
    {
      question: 'Como o Pulse trata freelancers?',
      answer:
        'Freelancer contratado para um projeto entra como fornecedor do projeto, com valor por mês, e compõe o custo ao lado das horas da equipe interna. Freelancer recorrente pode ser cadastrado como pessoa PJ, com custo hora e horas apontadas como qualquer membro da equipe.',
    },
    {
      question: 'Dá para ver a margem por cliente, e não só por projeto?',
      answer:
        'Sim. As análises consolidam a margem realizada por projeto, cliente e gerente, no período que você escolher. Cliente com vários jobs e um fee aparece somado.',
    },
    {
      question: 'A equipe precisa apontar hora todo dia?',
      answer:
        'A grade é semanal e vem pré-preenchida pela alocação, então quem seguiu o planejado só confirma. O fechamento é por semana. Quanto mais frequente o apontamento, mais cedo a margem aparece, mas a ferramenta não exige lançamento diário.',
    },
  ],
  related: [SLUG.MARGEM, SLUG.ALOCACAO, SLUG.CUSTO_HORA],
  updatedAt: UPDATED,
};

const softwareHouse: ContentPage = {
  slug: SLUG.SOFTWARE_HOUSE,
  kind: ContentKind.PERSONA,
  navLabel: 'Para software houses',
  eyebrow: 'Para software houses',
  title: 'PSA para software house: alocação de devs, horas por projeto e margem de cada contrato',
  seoTitle: 'PSA para software house e estúdio de produto | Origami Pulse',
  description:
    'Software house precisa saber a margem de cada contrato, não só a velocidade do time. Veja como um PSA liga alocação de desenvolvedores, horas apontadas, custo por senioridade e margem por projeto, ao lado do quadro de atividades.',
  lead:
    'Software house vende tempo de desenvolvedores em contratos de escopo fechado, squads alocados ou sustentação recorrente. A ferramenta de tarefas mostra o que o time está fazendo; ela não mostra quanto cada contrato custa nem quanto sobra. Um PSA (Professional Services Automation) fecha esse buraco: alocação, horas, custo por pessoa e margem por projeto na mesma base em que as atividades acontecem.',
  sections: [
    {
      title: 'O que uma software house precisa controlar',
      bullets: [
        'Alocação de cada desenvolvedor por projeto e mês, com o percentual comprometido.',
        'Horas apontadas por projeto, comparadas ao planejado e ao contratado.',
        'Custo hora real por pessoa e senioridade, com encargos e ferramentas, para PJ e CLT.',
        'Margem de cada contrato: escopo fechado, squad alocado ou sustentação mensal.',
        'Pipeline de propostas e renovações, com valor e etapa.',
      ],
    },
    {
      title: 'Três tipos de contrato, uma leitura de margem',
      table: {
        caption: 'Contratos comuns em software house e como o Pulse lê a margem',
        head: ['Contrato', 'Modelo de cobrança', 'Como a margem aparece'],
        rows: [
          ['Escopo fechado (projeto)', 'Escopo fixo, com parcelas', 'Preço fechado contra horas e custos acumulados; desvio visível antes da entrega'],
          ['Squad alocado (time dedicado)', 'Recorrente', 'Mensalidade contra custo real das pessoas alocadas no mês'],
          ['Sustentação e evolução', 'Recorrente, com escopo mensal', 'Mensalidade contra horas apontadas no mês, mês a mês'],
        ],
      },
    },
    {
      title: 'Atividades e horas no mesmo lugar',
      paragraphs: [
        'O Origami Pulse tem quadro de atividades por projeto, com sprints, e a hora apontada se liga ao projeto. O time continua trabalhando por atividade; a gestão passa a ver, por projeto, quanto foi consumido de quem e a que custo. Sem exportar planilha da ferramenta de tarefas para cruzar com a folha.',
      ],
    },
    {
      title: 'Custo por senioridade sem planilha paralela',
      paragraphs: [
        'Cada pessoa tem tipo de contratação, remuneração, benefícios, ferramentas e jornada. O custo hora sai do custo mensal completo dividido pelas horas úteis do mês, e é aplicado a cada hora apontada. Um projeto feito por sêniores mostra a margem real dele, e não a margem de um custo médio da empresa.',
      ],
    },
    {
      title: 'Como começar',
      paragraphs: [
        `Cadastre a empresa e o administrador, convide o time e cadastre os contratos em andamento como projetos. Com uma semana de horas, a margem de cada contrato já aparece. ${TRIAL.label}, sem cartão de crédito. ${TRIAL.afterwards}`,
      ],
    },
  ],
  faq: [
    {
      question: 'O Pulse substitui a ferramenta de tarefas do time?',
      answer:
        'Pode substituir para equipes que querem quadro, sprints e horas no mesmo lugar. Equipes que já têm uma ferramenta de tarefas madura podem manter o quadro lá e usar o Pulse para alocação, horas, custo e margem. A decisão é do time; o que não dá é a margem continuar em planilha.',
    },
    {
      question: 'Como funciona a alocação de um dev em dois projetos?',
      answer:
        'A alocação é por pessoa, projeto e mês, em horas planejadas. Uma pessoa pode estar em quantos projetos precisar; a soma aparece contra a capacidade dela no mês, e o excesso fica visível como sobrecarga antes de virar atraso.',
    },
    {
      question: 'Squad alocado tem margem?',
      answer:
        'Tem, e é a mais direta: a mensalidade do squad contra o custo real das pessoas alocadas no mês. Quando um sênior substitui um pleno no squad, a margem daquele mês mostra o efeito.',
    },
    {
      question: 'PJ e CLT entram no mesmo cálculo?',
      answer:
        'Sim. Cada pessoa tem um tipo de contratação, e o custo mensal é montado conforme ele: salário e encargos para CLT, valor do contrato para PJ, mais benefícios e ferramentas em todos os casos.',
    },
  ],
  related: [SLUG.ALOCACAO, SLUG.CUSTO_HORA, SLUG.PSA],
  updatedAt: UPDATED,
};

const arquitetura: ContentPage = {
  slug: SLUG.ARQUITETURA,
  kind: ContentKind.PERSONA,
  navLabel: 'Para arquitetura',
  eyebrow: 'Para escritórios de arquitetura',
  title: 'Gestão de projetos para escritório de arquitetura: horas por etapa, parcelas e margem por projeto',
  seoTitle: 'Gestão de projetos para escritório de arquitetura | Origami Pulse',
  description:
    'Escritório de arquitetura precisa saber se o projeto pago por etapas ainda dá margem quando a obra atrasa. Veja como acompanhar horas por etapa, parcelas recebidas, custo real da equipe e margem por projeto e por cliente.',
  lead:
    'Escritório de arquitetura vende projeto por etapas e recebe por parcelas, mas gasta horas por semana. O descasamento entre o que entra e o que se gasta é onde a margem some: o cliente atrasa a aprovação, a equipe segue detalhando, a parcela não vem, e ninguém sabe quanto o projeto já custou. Um software de gestão de projetos para arquitetura precisa juntar horas, parcelas e custo da equipe no mesmo lugar.',
  sections: [
    {
      title: 'O que um escritório de arquitetura precisa controlar',
      bullets: [
        'Horas apontadas por projeto e por etapa (estudo preliminar, anteprojeto, executivo, acompanhamento de obra).',
        'Parcelas contratadas, emitidas e recebidas, com o que está atrasado.',
        'Custo hora real de cada pessoa, incluindo sócios, estagiários e colaboradores PJ.',
        'Margem por projeto e por cliente, planejada e realizada.',
        'Alocação da equipe nos próximos meses, para aceitar ou não o próximo projeto.',
      ],
    },
    {
      title: 'Etapas, parcelas e horas no mesmo projeto',
      paragraphs: [
        'No Origami Pulse, o projeto carrega as parcelas (pendente, emitida, recebida, atrasada), os marcos de entrega e a alocação por mês. As horas apontadas entram por projeto e atividade, e cada hora leva o custo real de quem a fez. A margem realizada é a receita recebida contra o custo acumulado, mês a mês, e a planejada vem do orçamento que fechou o contrato.',
      ],
      table: {
        caption: 'Exemplo de leitura mês a mês em um projeto residencial de R$ 90.000 em quatro parcelas',
        head: ['Mês', 'Parcela recebida', 'Horas apontadas', 'Custo acumulado', 'Leitura'],
        rows: [
          ['1', 'R$ 22.500', '80 h', 'R$ 7.200', 'Dentro do planejado'],
          ['2', 'R$ 22.500', '140 h', 'R$ 19.800', 'Detalhamento acima do previsto'],
          ['3', 'R$ 0 (aprovação do cliente atrasou)', '110 h', 'R$ 29.700', 'Alerta: custo sobe, receita para'],
          ['4', 'R$ 22.500', '60 h', 'R$ 35.100', 'Margem do projeto até aqui: 48% de R$ 67.500 recebidos'],
        ],
      },
      bullets: [
        'Sem o cruzamento, o mês 3 passa despercebido: o escritório segue gastando horas em um projeto que parou de pagar.',
      ],
    },
    {
      title: 'O que o Origami Pulse entrega para escritórios de arquitetura',
      bullets: [
        'Orçamento por serviço do catálogo (projeto completo, etapa avulsa, consultoria, acompanhamento de obra), com margem calculada sobre o custo real da equipe.',
        'Projeto com parcelas, marcos, equipe alocada e horas apontadas.',
        'Custo hora por pessoa e tipo de contratação, com encargos e ferramentas (licenças de software do escritório entram no custo).',
        'Margem realizada por projeto e por cliente, ao lado da planejada.',
        'Pipeline de propostas com valor e próxima ação.',
      ],
    },
    {
      title: 'Como começar',
      paragraphs: [
        `Cadastre o escritório e o administrador, convide a equipe e cadastre os projetos em andamento com suas parcelas. Com uma semana de horas apontadas, a margem de cada projeto já aparece. ${TRIAL.label}, sem cartão de crédito. ${TRIAL.afterwards}`,
      ],
    },
  ],
  faq: [
    {
      question: 'Dá para separar horas por etapa do projeto?',
      answer:
        'Sim. As horas são apontadas por projeto e atividade, e as atividades podem representar as etapas (estudo preliminar, anteprojeto, executivo, obra). A leitura por etapa mostra onde o projeto consumiu mais do que o previsto.',
    },
    {
      question: 'Como o Pulse trata sócios que também projetam?',
      answer:
        'Sócio é um tipo de contratação, com pró-labore e, se fizer sentido, distribuição de lucros tratada como remuneração do trabalho. O custo hora do sócio entra na margem do projeto como o de qualquer pessoa que aponta hora. Sem isso, projeto feito pelos sócios parece mais lucrativo do que é.',
    },
    {
      question: 'Acompanhamento de obra cabe no mesmo projeto?',
      answer:
        'Cabe como etapa do mesmo projeto ou como projeto separado com modelo recorrente (visitas mensais), conforme o contrato. Nos dois casos as horas e a receita ficam na mesma base e a margem é lida do mesmo jeito.',
    },
    {
      question: 'Funciona para escritório pequeno?',
      answer:
        'Sim. O modelo é por empresa, não por usuário, então um escritório de quatro pessoas usa o mesmo produto que um de quarenta. O ganho aparece assim que há mais de um projeto ao mesmo tempo.',
    },
  ],
  related: [SLUG.MARGEM, SLUG.ORCAMENTO, SLUG.ALOCACAO],
  updatedAt: UPDATED,
};

const engenharia: ContentPage = {
  slug: SLUG.ENGENHARIA,
  kind: ContentKind.PERSONA,
  navLabel: 'Para engenharia',
  eyebrow: 'Para escritórios de engenharia',
  title: 'Software para escritório de engenharia: custo por hora técnica, horas por projeto e margem real',
  seoTitle: 'Software de gestão para escritório de engenharia e projetos | Origami Pulse',
  description:
    'Escritório de engenharia e consultoria técnica precisa saber quanto custa a hora técnica e quanto cada projeto consome dela. Veja como acompanhar alocação, horas, fornecedores e margem por projeto sem planilha paralela.',
  lead:
    'Escritório de engenharia vende hora técnica em projetos, laudos, consultorias e fiscalização de obra, muitas vezes com preço fechado por proposta e prazo definido por terceiros. A margem depende de duas coisas que quase nunca estão na mesma planilha: o custo real da hora de cada engenheiro e as horas de fato gastas em cada projeto. Um software de gestão para engenharia precisa juntar as duas e mostrar o resultado enquanto o projeto acontece.',
  sections: [
    {
      title: 'O que um escritório de engenharia precisa controlar',
      bullets: [
        'Custo hora técnica por pessoa, com encargos, benefícios, ferramentas e licenças de software.',
        'Horas apontadas por projeto, comparadas às horas estimadas na proposta.',
        'Fornecedores e materiais do projeto (ensaios, topografia, sondagem, terceiros), por mês.',
        'Parcelas contratadas e recebidas, com atraso visível.',
        'Alocação da equipe técnica nos próximos meses e capacidade para novas propostas.',
      ],
    },
    {
      title: 'Hora técnica: o número que a proposta precisa',
      paragraphs: [
        'Propostas de engenharia costumam ser montadas em horas por atividade multiplicadas por um valor hora. O erro mais comum é usar um valor hora que não reflete o custo real da equipe: salário nominal, sem encargos, dividido por 220 horas. O custo hora real sai do custo mensal completo de cada pessoa dividido pelas horas úteis do mês, e costuma ficar bem acima do que a planilha da proposta assume.',
      ],
      table: {
        caption: 'Efeito do custo hora na margem de uma proposta de 400 horas vendida a R$ 180 por hora',
        head: ['Base do custo', 'Custo hora', 'Custo do projeto', 'Margem'],
        rows: [
          ['Salário nominal ÷ 220 h', 'R$ 45', 'R$ 18.000', '75% (ilusão)'],
          ['Custo completo ÷ horas úteis', 'R$ 82', 'R$ 32.800', '54% (real)'],
          ['Com 20% de horas a mais que o previsto', 'R$ 82', 'R$ 39.360', '45% (o que acontece)'],
        ],
      },
    },
    {
      title: 'O que o Origami Pulse entrega para engenharia',
      bullets: [
        'Custo hora por pessoa e tipo de contratação, recalculado quando a remuneração muda.',
        'Orçamento sobre o catálogo de serviços (projeto, laudo, consultoria, fiscalização), com margem calculada antes de enviar.',
        'Projeto com parcelas, marcos, fornecedores e materiais por mês, equipe alocada e horas apontadas.',
        'Margem realizada por projeto, cliente e gerente, ao lado da planejada.',
        'Alocação por pessoa e mês, com sobrecarga e ociosidade visíveis.',
      ],
    },
    {
      title: 'Terceiros e ensaios entram no custo',
      paragraphs: [
        'Sondagem, ensaios de laboratório, topografia e outros terceiros são lançados como fornecedores do projeto, por mês, e somam ao custo ao lado das horas da equipe. Materiais e licenças específicas do projeto entram do mesmo jeito. A margem que aparece é a do projeto inteiro, não só a da mão de obra.',
      ],
    },
    {
      title: 'Como começar',
      paragraphs: [
        `Cadastre o escritório e o administrador, convide a equipe e cadastre os projetos em andamento. Com uma semana de horas apontadas, a margem de cada projeto já aparece. ${TRIAL.label}, sem cartão de crédito. ${TRIAL.afterwards}`,
      ],
    },
  ],
  faq: [
    {
      question: 'Serve para consultoria técnica cobrada por hora?',
      answer:
        'Sim. O contrato por hora entra como projeto com receita reconhecida pelas horas faturadas, e a margem compara o valor hora vendido com o custo hora real de quem trabalhou. É o formato em que a diferença entre valor hora e custo hora aparece com mais clareza.',
    },
    {
      question: 'Como lançar ensaios e terceiros no projeto?',
      answer:
        'Como fornecedores do projeto, com valor por mês, ou como materiais. Eles compõem o custo do projeto ao lado das horas da equipe e aparecem na margem do mês em que acontecem.',
    },
    {
      question: 'Dá para comparar horas estimadas na proposta com horas gastas?',
      answer:
        'Sim. O orçamento aprovado carrega as horas planejadas por papel; a alocação distribui por mês; o apontamento registra o realizado. A leitura de planejado contra realizado mostra o desvio por projeto enquanto ele ainda está aberto.',
    },
    {
      question: 'Licenças de software entram no custo hora?',
      answer:
        'Entram como ferramentas no custo mensal de cada pessoa, rateadas, e por isso no custo hora. Licença comprada só para um projeto entra como material do projeto.',
    },
  ],
  related: [SLUG.CUSTO_HORA, SLUG.ORCAMENTO, SLUG.MARGEM],
  updatedAt: UPDATED,
};

export const PERSONA_PAGES: readonly ContentPage[] = [agencias, softwareHouse, arquitetura, engenharia];
