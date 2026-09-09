import type { ContentPage } from '@/types/landing';
import { ContentKind } from '@/types/landing';
import { SITE, TRIAL } from '@/landing/site';
import { SLUG } from '@/landing/slugs';
import { PERSONA_PAGES } from '@/landing/pages-personas';
import { GUIDE_PAGES } from '@/landing/pages-guias';

/**
 * Páginas públicas de conteúdo (PUL-242): uma por intenção de busca, todas pré-renderizadas
 * no build e derivadas para sitemap, `llms.txt`, rodapé e JSON-LD a partir desta lista.
 *
 * Regras de escrita (skill SEO & GEO): resposta direta no `lead`, listas e tabelas, FAQ
 * com schema; só funcionalidades que existem; sem citar concorrentes; nomenclatura da casa
 * (Oportunidade, Pipeline, Orçamento). Adicionar página = adicionar item em uma das três
 * listas (`pages.ts`, `pages-guias.ts`, `pages-personas.ts`) e o slug em `slugs.ts`.
 */

const UPDATED = '2026-09-09';

const psa: ContentPage = {
  slug: SLUG.PSA,
  kind: ContentKind.DEFINITION,
  navLabel: 'O que é PSA',
  eyebrow: 'Guia definicional',
  title: 'O que é PSA (Professional Services Automation)',
  seoTitle: 'O que é PSA (Professional Services Automation) | Origami Pulse',
  description:
    'PSA é o software que administra o ciclo completo de uma empresa de serviços por projeto: da oportunidade ao orçamento, da alocação às horas, do custo à margem. Entenda o que é, para quem serve e como se diferencia de ERP e ferramenta de tarefas.',
  lead:
    'PSA, sigla de Professional Services Automation (automação de serviços profissionais), é a categoria de software que administra o ciclo completo de uma empresa que vende serviços por projeto: da oportunidade comercial ao orçamento, da alocação de pessoas ao apontamento de horas, e do custo real à margem entregue. Diferente de uma ferramenta de tarefas, que organiza o trabalho, o PSA responde quanto cada projeto custou e quanto sobrou.',
  sections: [
    {
      title: 'O que um PSA faz',
      paragraphs: [
        'Um PSA junta em uma base só as quatro coisas que uma empresa de serviços costuma manter separadas: o comercial, os projetos, as pessoas e o dinheiro. Na prática, ele cobre:',
      ],
      bullets: [
        'Pipeline comercial: oportunidades por etapa, com valor estimado, follow-up e histórico de interações.',
        'Orçamentos e propostas: montados sobre um catálogo de serviços com modelos de cobrança (escopo fixo, recorrente, taxa de sucesso e combinações), com versões e margem calculada antes de vender.',
        'Alocação e capacidade: quantas horas cada pessoa tem planejadas em cada projeto, por mês, e quem está sobrecarregado ou ocioso.',
        'Apontamento de horas: as horas trabalhadas por pessoa, projeto e atividade, que viram custo do projeto.',
        'Custo de pessoas: salário, encargos, benefícios e ferramentas compondo o custo por hora de cada pessoa, por tipo de contratação.',
        'Margem por projeto: receita contratada contra o custo das horas, fornecedores e materiais, planejado e realizado, por projeto, cliente e gerente.',
        'Faturamento: parcelas do projeto, emissão e recebimento acompanhados junto da margem.',
      ],
    },
    {
      title: 'PSA, ERP e ferramenta de tarefas: qual a diferença',
      paragraphs: [
        'As três categorias se sobrepõem em alguma coisa, mas respondem a perguntas diferentes. O ERP olha a empresa inteira pela contabilidade; a ferramenta de tarefas olha o trabalho do dia; o PSA olha o projeto como unidade de negócio.',
      ],
      table: {
        caption: 'Comparação entre PSA, ERP e ferramenta de tarefas',
        head: ['', 'PSA', 'ERP', 'Ferramenta de tarefas'],
        rows: [
          ['Unidade central', 'O projeto vendido', 'A empresa e seus lançamentos', 'A tarefa e o quadro'],
          ['Pergunta que responde', 'Quanto este projeto custou e quanto sobrou?', 'Quanto a empresa faturou, pagou e deve?', 'O que está em andamento e quem faz?'],
          ['Custo de pessoas', 'Por hora, aplicado a cada hora apontada', 'Folha de pagamento, agregada', 'Não trata'],
          ['Comercial', 'Oportunidade, orçamento e proposta ligados ao projeto', 'Pedido e nota fiscal', 'Não trata'],
          ['Quem usa no dia a dia', 'Sócios, gerentes de projeto e a equipe que aponta horas', 'Financeiro e contabilidade', 'Toda a equipe'],
        ],
      },
    },
    {
      title: 'Para quem o PSA faz sentido',
      paragraphs: [
        'O PSA serve para qualquer empresa cujo produto é o tempo de gente qualificada embalado em projetos. Alguns sinais de que a sua empresa se encaixa:',
      ],
      bullets: [
        'Vende horas, entregas ou projetos com escopo, e não produtos de estoque.',
        'Tem pessoas alocadas em mais de um projeto ao mesmo tempo.',
        'Precifica propostas com base no custo da equipe que vai entregar.',
        'Precisa saber a margem de cada cliente, e não só o resultado do mês.',
        'Já sentiu que um projeto deu prejuízo e só descobriu depois de encerrado.',
      ],
    },
    {
      title: 'Sinais de que a planilha não dá mais conta',
      bullets: [
        'A margem de um projeto é calculada uma vez, no fim, e ninguém confia no número.',
        'O custo da hora de cada pessoa foi estimado há mais de um ano.',
        'Horas em uma ferramenta, oportunidades em outra, custos na planilha do financeiro.',
        'O orçamento novo é o anterior com outro nome de cliente.',
        'Dois gerentes têm versões diferentes de quem está alocado em quê neste mês.',
      ],
    },
    {
      title: 'Como o Origami Pulse implementa o PSA',
      paragraphs: [
        `O ${SITE.name} é um PSA brasileiro, feito pela ${SITE.maker.name} para empresas de serviços. O fluxo é um só: a oportunidade entra no pipeline, vira orçamento versionado com margem calculada sobre o custo real da equipe, o orçamento aprovado vira projeto, o projeto recebe alocação de pessoas por mês, as pessoas apontam horas, cada hora carrega o custo de quem a fez, e a margem realizada aparece ao lado da planejada, por projeto, cliente e gerente.`,
        `Cada empresa tem seu ambiente isolado, com permissões por perfil. ${TRIAL.label}, sem cartão de crédito, com todas as funcionalidades.`,
      ],
    },
  ],
  faq: [
    {
      question: 'O que significa PSA?',
      answer:
        'PSA é a sigla de Professional Services Automation, em português "automação de serviços profissionais". É a categoria de software que gerencia o ciclo comercial, operacional e financeiro de empresas que vendem serviços por projeto.',
    },
    {
      question: 'PSA é a mesma coisa que ERP?',
      answer:
        'Não. O ERP olha a empresa pela contabilidade: faturamento, contas a pagar e receber, estoque. O PSA olha o projeto como unidade de negócio: quanto custou em horas, fornecedores e materiais, e quanto sobrou. Muitas empresas de serviços usam os dois, o PSA para operar e o ERP para a contabilidade.',
    },
    {
      question: 'Empresa pequena precisa de PSA?',
      answer:
        'Precisa quem já tem mais de um projeto ao mesmo tempo e pessoas divididas entre eles. Com cinco pessoas e três clientes, a planilha ainda funciona; com quinze pessoas e dez projetos, a margem por projeto some da planilha. O Origami Pulse é por empresa, não por usuário, justamente para caber em equipes pequenas.',
    },
    {
      question: 'PSA substitui a ferramenta de tarefas?',
      answer:
        'Não necessariamente. A ferramenta de tarefas organiza o trabalho do dia; o PSA transforma horas em custo e custo em margem. O Pulse tem apontamento de horas e atividades de projeto, o que para muitas equipes dispensa a ferramenta separada, mas a decisão é da equipe.',
    },
    {
      question: 'Quanto custa um PSA?',
      answer: `O ${SITE.name} tem ${TRIAL.label.toLowerCase()}, sem cartão de crédito, com todas as funcionalidades. ${TRIAL.afterwards} Contato: ${SITE.contactEmail}.`,
    },
  ],
  related: [SLUG.MARGEM, SLUG.CUSTO_HORA, SLUG.CONSULTORIAS],
  updatedAt: UPDATED,
};

const margem: ContentPage = {
  slug: SLUG.MARGEM,
  kind: ContentKind.PROBLEM,
  navLabel: 'Margem por projeto',
  eyebrow: 'Rentabilidade',
  title: 'Controle de margem por projeto: como saber o que sobra de cada entrega',
  seoTitle: 'Controle de margem por projeto em empresas de serviços | Origami Pulse',
  description:
    'Margem por projeto é a receita do projeto menos o custo das horas, fornecedores e materiais. Veja a fórmula, um exemplo numérico, a diferença entre margem planejada e realizada, e como acompanhá-la mês a mês.',
  lead:
    'Margem por projeto é a diferença entre o que o cliente paga por um projeto e o que ele custa para ser entregue: as horas da equipe valorizadas pelo custo real de cada pessoa, mais fornecedores e materiais. Em empresa de serviços, é o número que separa o projeto que sustenta a empresa do que consome o lucro dos outros. O problema é que ele costuma aparecer só no fechamento contábil, quando não dá mais para corrigir escopo, equipe ou preço.',
  sections: [
    {
      title: 'A fórmula, sem mistério',
      paragraphs: [
        'Margem bruta do projeto = receita do projeto menos custos diretos. Margem percentual = margem bruta dividida pela receita. O que muda de empresa para empresa é o que entra em cada parcela:',
      ],
      bullets: [
        'Receita: o valor contratado do projeto, ou a receita reconhecida no período quando o projeto é recorrente ou tem parcelas.',
        'Custo de mão de obra: horas apontadas no projeto multiplicadas pelo custo hora de quem as apontou. É a maior parcela na maioria dos serviços.',
        'Fornecedores: terceiros contratados para o projeto, por mês.',
        'Materiais: licenças, insumos e outros gastos diretos lançados no projeto.',
      ],
      table: {
        caption: 'Exemplo de margem de um projeto de R$ 120.000',
        head: ['Item', 'Cálculo', 'Valor'],
        rows: [
          ['Receita contratada', '', 'R$ 120.000'],
          ['Mão de obra', '640 horas × R$ 95 de custo hora', 'R$ 60.800'],
          ['Fornecedores', 'Consultor externo, 2 meses', 'R$ 12.000'],
          ['Materiais', 'Licenças de software do projeto', 'R$ 3.200'],
          ['Custo total', '60.800 + 12.000 + 3.200', 'R$ 76.000'],
          ['Margem bruta', '120.000 − 76.000', 'R$ 44.000 (36,7%)'],
        ],
      },
    },
    {
      title: 'Margem planejada e margem realizada',
      paragraphs: [
        'A margem planejada nasce no orçamento: horas estimadas por papel, multiplicadas pelo custo hora da equipe prevista, mais fornecedores e materiais previstos, contra o preço proposto. Ela responde se vale a pena vender.',
        'A margem realizada nasce da operação: horas de fato apontadas, custo hora de quem de fato trabalhou, fornecedores e materiais de fato pagos. Ela responde se valeu a pena ter vendido, e o quanto antes ela for lida, mais cedo dá para agir.',
        'O que importa é a distância entre as duas. Um desvio de 10 pontos percentuais no segundo mês de um projeto de seis é um alerta; o mesmo desvio descoberto no fechamento é só uma constatação.',
      ],
    },
    {
      title: 'Por que a margem chega atrasada',
      bullets: [
        'As horas ficam em uma ferramenta, o custo das pessoas na planilha do financeiro e os fornecedores no e-mail. Alguém precisa juntar as pontas, e isso acontece uma vez por mês, se tanto.',
        'O custo hora usado é o salário nominal, ou um custo médio da empresa, e não o custo real de cada pessoa.',
        'O fechamento contábil é mensal e agregado: mostra o resultado da empresa, não de cada projeto.',
        'Ninguém compara planejado e realizado no mesmo lugar, então o desvio não tem dono.',
      ],
    },
    {
      title: 'Como acompanhar mês a mês',
      bullets: [
        'Mantenha o custo hora de cada pessoa atualizado, com encargos, benefícios e ferramentas, e recalcule quando a remuneração mudar.',
        'Feche o apontamento de horas toda semana. Hora apontada com um mês de atraso é chute com data.',
        'Lance fornecedores e materiais no projeto, no mês em que acontecem, e não só no contas a pagar.',
        'Leia planejado contra realizado por projeto todo mês, e por cliente e gerente pelo menos por trimestre.',
        'Quando o desvio aparecer, aja no que ainda está aberto: escopo, equipe alocada, preço da próxima fase.',
      ],
    },
    {
      title: 'Como o Origami Pulse faz isso',
      paragraphs: [
        `No ${SITE.name}, o orçamento é montado sobre o catálogo de serviços e o custo real da equipe, então a margem planejada existe antes da venda. O orçamento aprovado vira projeto; as pessoas apontam horas na grade semanal, pré-preenchida pela alocação; cada hora carrega o custo hora de quem a fez; fornecedores e materiais são lançados no projeto por mês. A margem realizada aparece ao lado da planejada, por projeto, cliente e gerente, enquanto o projeto ainda está acontecendo.`,
      ],
    },
  ],
  faq: [
    {
      question: 'Qual é uma boa margem para projeto de serviços?',
      answer:
        'Depende do tipo de serviço e do quanto a empresa carrega de custo indireto. Consultorias e agências costumam trabalhar com meta de margem bruta por projeto entre 30% e 50%, para que, depois dos custos da empresa que não são de projeto, sobre lucro. Mais importante que o número é ter uma meta declarada e comparar cada projeto com ela.',
    },
    {
      question: 'Margem bruta e margem líquida do projeto são a mesma coisa?',
      answer:
        'Não. A margem bruta considera só os custos diretos do projeto: horas, fornecedores e materiais. A margem líquida rateia também custos da empresa, como aluguel, administrativo e impostos. Para decidir sobre um projeto, a bruta é a que dá para agir; a líquida serve para saber se a empresa como um todo está saudável.',
    },
    {
      question: 'O custo do gerente de projeto entra na margem?',
      answer:
        'Entra quando o gerente aponta horas no projeto, valorizadas pelo custo hora dele. Gerente que não aponta hora vira custo indireto da empresa e sai da margem bruta. O ideal é apontar: a gestão é parte do custo real de entregar.',
    },
    {
      question: 'Como calcular margem em projeto recorrente, com mensalidade?',
      answer:
        'Mês a mês: a receita reconhecida do mês (a mensalidade) contra as horas apontadas no mês e os custos lançados no mês. É o formato em que um projeto recorrente mostra se está ficando mais caro de sustentar do que o cliente paga.',
    },
  ],
  related: [SLUG.CUSTO_HORA, SLUG.PSA, SLUG.CONSULTORIAS],
  updatedAt: UPDATED,
};

const consultorias: ContentPage = {
  slug: SLUG.CONSULTORIAS,
  kind: ContentKind.PERSONA,
  navLabel: 'Para consultorias',
  eyebrow: 'Para consultorias',
  title: 'Software de gestão para consultorias: do pipeline à margem de cada projeto',
  seoTitle: 'Software de gestão para consultorias (PSA) | Origami Pulse',
  description:
    'O que uma consultoria precisa em um software de gestão: pipeline e orçamentos, alocação de consultores, apontamento de horas, custo real da equipe e margem por projeto e por cliente. Teste grátis por 14 dias.',
  lead:
    'Consultoria vende tempo de gente qualificada embalado em projetos. O software de gestão certo para uma consultoria é o que liga a proposta comercial ao custo real da equipe que vai entregá-la, e mostra a margem de cada projeto enquanto ele acontece, não meses depois. Essa categoria de software tem nome: PSA, Professional Services Automation.',
  sections: [
    {
      title: 'O que uma consultoria precisa controlar',
      bullets: [
        'Quais oportunidades estão em negociação, em que etapa, por quanto, e qual é a próxima ação de cada uma.',
        'Quanto custa entregar uma proposta antes de assiná-la: horas por papel, custo hora de quem vai trabalhar, terceiros.',
        'Quem está alocado em quê neste mês e no próximo, e quem tem capacidade sobrando.',
        'Quantas horas cada projeto consumiu de fato, e de quem.',
        'Quanto cada pessoa custa por hora, com encargos, benefícios e ferramentas, e não só o salário.',
        'A margem de cada projeto, cliente e gerente, planejada e realizada.',
      ],
    },
    {
      title: 'O que o Origami Pulse entrega para consultorias',
      bullets: [
        'Pipeline com oportunidades por etapa, valor estimado, follow-up e histórico de interações.',
        'Catálogo de serviços com modelos de cobrança (escopo fixo, recorrente, taxa de sucesso e combinações) e orçamento versionado com margem calculada.',
        'Alocação de consultores por projeto e mês, com planejado contra realizado e leitura de capacidade.',
        'Apontamento de horas em grade semanal, pré-preenchida pela alocação, com fechamento de semana e uso no celular.',
        'Custo hora por pessoa e tipo de contratação (CLT, PJ, estágio, sócio), com encargos, benefícios e ferramentas.',
        'Margem realizada por projeto, cliente e gerente, ao lado da planejada, e saúde operacional dos projetos em andamento.',
        'Ambiente isolado por empresa, com permissões por perfil e trilha de alterações.',
      ],
    },
    {
      title: 'Um fluxo só, da oportunidade à margem',
      paragraphs: [
        'O ganho não está em cada função isolada, e sim em elas estarem na mesma base. A oportunidade vira orçamento com margem calculada sobre a equipe real. O orçamento aprovado vira projeto sem redigitar nada. O projeto recebe a alocação por mês, que pré-preenche a grade de horas de cada consultor. Cada hora apontada carrega o custo de quem a fez. A margem realizada aparece ao lado da planejada. Quando o próximo orçamento for montado, o histórico de custo já está lá.',
      ],
    },
    {
      title: 'Ferramenta de tarefas, ERP ou PSA?',
      paragraphs: [
        'A ferramenta de tarefas organiza o dia da equipe, mas não sabe quanto uma hora custa nem quanto o cliente pagou. O ERP sabe o que a empresa faturou e pagou, mas não por projeto e não em tempo de agir. O PSA fica no meio: trata o projeto como unidade de negócio e conversa com os dois quando preciso. Para uma consultoria, é a camada que faltava entre o comercial e a contabilidade.',
      ],
    },
    {
      title: 'Como começar',
      paragraphs: [
        `Cadastre a empresa e o administrador (nome, CNPJ, e-mail), confirme o e-mail, convide a equipe e cadastre clientes, serviços e projetos pelo próprio sistema, sem importação obrigatória. Com uma semana de horas apontadas, a margem realizada de cada projeto já aparece. ${TRIAL.label}, sem cartão de crédito. ${TRIAL.afterwards}`,
      ],
    },
  ],
  faq: [
    {
      question: 'Serve para uma consultoria pequena, com cinco pessoas?',
      answer:
        'Sim. O modelo é por empresa, não por usuário, então uma consultoria de cinco pessoas usa as mesmas funcionalidades que uma de cinquenta. O ganho aparece assim que há mais de um projeto ao mesmo tempo e pessoas divididas entre eles.',
    },
    {
      question: 'Consultores PJ e CLT entram no mesmo cálculo de custo?',
      answer:
        'Sim. Cada pessoa tem um tipo de contratação, e o custo mensal é montado conforme ele: salário e encargos para CLT, valor do contrato para PJ, bolsa para estágio, pró-labore para sócio, mais benefícios e ferramentas em todos os casos. O custo hora sai desse total dividido pelas horas úteis do mês.',
    },
    {
      question: 'Consigo ver a margem por cliente e por gerente, e não só por projeto?',
      answer:
        'Sim. As análises consolidam a margem realizada por projeto, cliente e gerente de projeto, para o período escolhido, com planejado contra realizado.',
    },
    {
      question: 'Preciso importar planilhas para começar?',
      answer:
        'Não. Pessoas, clientes, serviços e projetos entram pelo próprio sistema. Muitas consultorias começam pelos projetos em andamento e deixam o histórico na planilha antiga.',
    },
  ],
  related: [SLUG.PSA, SLUG.MARGEM, SLUG.CUSTO_HORA],
  updatedAt: UPDATED,
};

const custoHora: ContentPage = {
  slug: SLUG.CUSTO_HORA,
  kind: ContentKind.PROBLEM,
  navLabel: 'Custo hora de funcionário',
  eyebrow: 'Custo de pessoas',
  title: 'Custo hora de funcionário: como calcular o custo real de cada pessoa da equipe',
  seoTitle: 'Custo hora de funcionário: como calcular | Origami Pulse',
  description:
    'Custo hora é o custo mensal completo de uma pessoa (salário, encargos, benefícios e ferramentas) dividido pelas horas úteis do mês. Veja a fórmula por tipo de contratação, um exemplo numérico e os erros mais comuns.',
  lead:
    'Custo hora de funcionário é quanto uma hora de trabalho de uma pessoa custa para a empresa: o custo mensal completo dela, com salário, encargos, benefícios e ferramentas, dividido pelas horas úteis que ela tem no mês. É o número que transforma horas apontadas em custo de projeto, e por isso é a base de qualquer cálculo de margem em empresa de serviços. Usar o salário nominal no lugar dele é o erro mais comum, e o mais caro.',
  sections: [
    {
      title: 'A fórmula',
      paragraphs: ['Custo hora = custo mensal completo ÷ horas úteis do mês. As duas parcelas merecem cuidado:'],
      bullets: [
        'Custo mensal completo: tudo que a empresa paga por causa daquela pessoa naquele mês, e não só o que cai na conta dela.',
        'Horas úteis do mês: jornada diária multiplicada pelos dias úteis do mês, descontando feriados. Um mês com 21 dias úteis e jornada de 8 horas tem 168 horas úteis; o mesmo cálculo com 220 horas fixas subestima o custo em 30%.',
        'Recalcular quando a remuneração muda ou quando o mês tem menos dias úteis. Custo hora é dado vivo, não constante anual.',
      ],
    },
    {
      title: 'O que entra no custo mensal, por tipo de contratação',
      table: {
        caption: 'Composição do custo mensal por tipo de contratação',
        head: ['Tipo', 'Base', 'Acrescenta-se', 'Em todos os casos'],
        rows: [
          ['CLT', 'Salário mensal', 'Encargos patronais e provisões de 13º e férias', 'Benefícios e ferramentas'],
          ['PJ', 'Valor do contrato mensal', 'Nada de encargos; o que a empresa pagar além do contrato', 'Benefícios e ferramentas'],
          ['Estágio', 'Bolsa-auxílio', 'Auxílios previstos no termo', 'Benefícios e ferramentas'],
          ['Sócio', 'Pró-labore', 'Distribuição de lucros, se for tratada como remuneração do trabalho', 'Benefícios e ferramentas'],
        ],
      },
    },
    {
      title: 'Exemplo numérico',
      table: {
        caption: 'Custo hora de uma pessoa CLT com salário de R$ 8.000',
        head: ['Item', 'Valor'],
        rows: [
          ['Salário', 'R$ 8.000'],
          ['Encargos e provisões (estimativa de 45%)', 'R$ 3.600'],
          ['Benefícios (alimentação, saúde, transporte)', 'R$ 900'],
          ['Ferramentas (licenças, equipamento rateado)', 'R$ 300'],
          ['Custo mensal completo', 'R$ 12.800'],
          ['Horas úteis (8 h × 21 dias úteis)', '168 h'],
          ['Custo hora', 'R$ 76,19'],
        ],
      },
      paragraphs: [
        'Repare que o custo hora ficou 60% acima do "salário dividido por 220" (R$ 36,36). Em um projeto de 640 horas, a diferença entre os dois números é de mais de R$ 25.000 de custo que a planilha não veria.',
      ],
    },
    {
      title: 'Erros comuns',
      bullets: [
        'Usar o salário nominal, sem encargos, benefícios e ferramentas.',
        'Dividir por 220 horas fixas em vez das horas úteis do mês, ignorando feriados.',
        'Ignorar férias e 13º: são custo do ano inteiro, então entram como provisão mensal.',
        'Nunca atualizar depois de um aumento ou de uma mudança de benefício.',
        'Usar um custo hora médio para toda a equipe: um projeto feito por sêniores parece mais lucrativo do que é, e um feito por juniores, menos.',
      ],
    },
    {
      title: 'Do custo hora à margem do projeto',
      paragraphs: [
        'Cada hora apontada em um projeto, multiplicada pelo custo hora de quem a apontou, é o custo de mão de obra daquele projeto. Somado a fornecedores e materiais e comparado à receita, dá a margem realizada. Sem custo hora confiável, a margem por projeto é um número decorativo; com ele, é a base para precificar a próxima proposta sobre o histórico real.',
      ],
    },
    {
      title: 'Como o Origami Pulse calcula',
      paragraphs: [
        `No ${SITE.name}, cada pessoa tem tipo de contratação, remuneração, benefícios, ferramentas e jornada diária. A empresa cadastra seus feriados. O custo hora sai do custo mensal completo dividido pelas horas úteis do mês, e é aplicado automaticamente a cada hora apontada em projeto. Quando a remuneração muda, o custo passa a valer dali em diante, e o histórico dos meses anteriores fica preservado.`,
      ],
    },
  ],
  faq: [
    {
      question: 'Custo hora é o mesmo que valor hora de venda?',
      answer:
        'Não. Custo hora é quanto a hora custa para a empresa. Valor hora é quanto a empresa cobra por ela. A diferença entre os dois, descontados fornecedores e materiais, é a margem do projeto. Vender por um valor hora sem conhecer o custo hora é vender sem saber se há margem.',
    },
    {
      question: 'Devo dividir o custo mensal por 220 horas?',
      answer:
        'Não. 220 é a jornada legal mensal de referência da CLT, não as horas que a pessoa tem disponíveis para trabalhar em projeto. Use jornada diária vezes dias úteis do mês, descontando feriados. Em meses curtos o custo hora sobe, e é assim mesmo.',
    },
    {
      question: 'Como tratar férias e 13º no custo hora?',
      answer:
        'Como provisão mensal: um doze avos do 13º e um doze avos das férias com o terço constitucional entram no custo de cada mês, para que a hora de janeiro e a de dezembro custem a mesma coisa. Encargos sobre essas provisões entram junto.',
    },
    {
      question: 'E quem não aponta horas em projeto, como o administrativo?',
      answer:
        'O custo dessas pessoas não entra no custo direto de nenhum projeto; é despesa da empresa, coberta pela margem bruta dos projetos. Por isso a meta de margem bruta por projeto precisa ser maior que zero com folga: ela paga quem não aponta hora.',
    },
  ],
  related: [SLUG.MARGEM, SLUG.PSA, SLUG.CONSULTORIAS],
  updatedAt: UPDATED,
};

/**
 * Ordem = ordem no `llms.txt` e no sitemap. O rodapé agrupa por intenção (ver `content.ts`).
 * Segunda leva em `pages-guias.ts` (problema e definição) e `pages-personas.ts` (persona).
 */
export const CONTENT_PAGES: readonly ContentPage[] = [psa, margem, custoHora, ...GUIDE_PAGES, consultorias, ...PERSONA_PAGES];

export function findContentPage(slug: string): ContentPage | undefined {
  return CONTENT_PAGES.find((page) => page.slug === slug);
}
