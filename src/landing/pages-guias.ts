import type { ContentPage } from '@/types/landing';
import { ContentKind } from '@/types/landing';
import { SITE, TRIAL } from '@/landing/site';
import { SLUG } from '@/landing/slugs';

/** Páginas por problema e definicionais (PUL-242, segunda leva). Mesmas regras de `pages.ts`. */

const UPDATED = '2026-09-09';

const alocacao: ContentPage = {
  slug: SLUG.ALOCACAO,
  kind: ContentKind.PROBLEM,
  navLabel: 'Alocação de equipe',
  eyebrow: 'Capacidade',
  title: 'Alocação de equipe em projetos: como planejar horas por pessoa e mês sem sobrecarregar ninguém',
  seoTitle: 'Alocação de equipe em projetos: horas por pessoa e mês | Origami Pulse',
  description:
    'Alocação de equipe é distribuir as horas de cada pessoa entre os projetos do mês, respeitando a capacidade dela. Veja como calcular capacidade, ler sobrecarga e ociosidade, e comparar planejado com realizado.',
  lead:
    'Alocação de equipe em projetos é decidir, para cada pessoa e cada mês, quantas horas vão para cada projeto, dentro da capacidade que ela realmente tem. Feita em planilha, a alocação vive em duas versões que nunca batem: a do gerente que planeja e a das horas que a pessoa de fato aponta. Feita na mesma base do apontamento, ela mostra sobrecarga antes do atraso e ociosidade antes do prejuízo.',
  sections: [
    {
      title: 'Capacidade: o número de partida',
      paragraphs: ['Capacidade de uma pessoa no mês = jornada diária × dias úteis do mês, descontando feriados. Não é 160 nem 176 horas fixas:'],
      bullets: [
        'Mês com 22 dias úteis e jornada de 8 horas: 176 horas de capacidade.',
        'Mês com 19 dias úteis (feriados e emenda): 152 horas. Alocar 176 aqui já é sobrecarga.',
        'Férias, licenças e admissão no meio do mês reduzem a capacidade daquele mês, e a alocação precisa enxergar isso.',
      ],
    },
    {
      title: 'Alocação por pessoa, projeto e mês',
      paragraphs: [
        'A unidade útil é pessoa × projeto × mês, em horas planejadas. Percentual esconde o mês curto; hora não. Somando os projetos de uma pessoa no mês e comparando com a capacidade dela, saem os três estados que a gestão precisa ler:',
      ],
      table: {
        caption: 'Leitura de alocação de uma pessoa no mês',
        head: ['Situação', 'Sinal', 'O que fazer'],
        rows: [
          ['Alocada acima da capacidade', 'Sobrecarga', 'Redistribuir horas, renegociar prazo ou trazer mais gente antes do atraso'],
          ['Alocada bem abaixo da capacidade', 'Ociosidade', 'Antecipar trabalho, alocar em proposta nova ou rever contratação'],
          ['Alocada perto da capacidade', 'Saudável', 'Acompanhar o realizado; a folga é para imprevistos'],
        ],
      },
    },
    {
      title: 'Planejado e realizado no mesmo lugar',
      paragraphs: [
        'A alocação só vale se for comparada com as horas apontadas. Pessoa alocada em 60 horas que apontou 95 no projeto revela escopo mal estimado ou retrabalho; pessoa alocada em 80 que apontou 20 revela projeto parado ou alocação fictícia. Nos dois casos, a informação é sobre o projeto, e chega a tempo de agir se a comparação for mensal, não no fechamento.',
      ],
    },
    {
      title: 'Como o Origami Pulse faz alocação',
      paragraphs: [
        `No ${SITE.name}, a alocação é por pessoa, projeto e mês, em horas, por papel no projeto. A capacidade sai da jornada de cada pessoa e dos feriados cadastrados pela empresa. A grade semanal de apontamento vem pré-preenchida pela alocação, então quem seguiu o planejado só confirma, e o desvio aparece por projeto e por pessoa. A visão do time mostra o ano inteiro, mês a mês, com sobrecarga e ociosidade destacadas.`,
      ],
    },
  ],
  faq: [
    {
      question: 'Alocação em percentual ou em horas?',
      answer:
        'Em horas. Percentual esconde que o mês tem tamanhos diferentes: 50% em um mês de 19 dias úteis é bem menos do que em um de 22. Horas contra capacidade real do mês é o que permite ler sobrecarga de verdade.',
    },
    {
      question: 'Quem deve alocar: o gerente do projeto ou a operação?',
      answer:
        'O gerente do projeto aloca a equipe dele; a visão de portfólio compara todos os projetos e sinaliza conflito quando duas alocações estouram a capacidade da mesma pessoa. Alocar centralmente sem o gerente costuma gerar plano que ninguém segue.',
    },
    {
      question: 'E quem trabalha em coisas que não são projeto, como comercial e administrativo?',
      answer:
        'Essas horas existem e custam. A recomendação é registrá-las em atividades da empresa, separadas dos projetos de cliente, para a capacidade disponível para projetos ser realista e o custo indireto ficar visível.',
    },
    {
      question: 'Com que frequência revisar a alocação?',
      answer:
        'Mensalmente para o planejamento dos próximos meses, e semanalmente para o mês corrente, junto com o fechamento do apontamento. Alocação revisada uma vez por trimestre vira ficção antes do fim do primeiro mês.',
    },
  ],
  related: [SLUG.CUSTO_HORA, SLUG.MARGEM, SLUG.SOFTWARE_HOUSE],
  updatedAt: UPDATED,
};

const orcamento: ContentPage = {
  slug: SLUG.ORCAMENTO,
  kind: ContentKind.PROBLEM,
  navLabel: 'Orçamento com margem',
  eyebrow: 'Precificação',
  title: 'Orçamento de projeto com margem: como precificar serviços a partir do custo real da equipe',
  seoTitle: 'Orçamento de projeto com margem calculada | Origami Pulse',
  description:
    'Orçamento de projeto com margem é a proposta montada sobre horas por papel, custo hora real, fornecedores e materiais, com a margem planejada visível antes de enviar. Veja o passo a passo, um exemplo e os erros comuns.',
  lead:
    'Orçamento de projeto com margem é a proposta em que o preço sai do custo, e não o contrário: horas estimadas por papel, multiplicadas pelo custo hora real de quem vai trabalhar, mais fornecedores e materiais, e só então a margem que a empresa quer. O orçamento feito ao contrário, copiando o anterior e ajustando pelo feeling, é a origem da maior parte dos projetos deficitários em empresas de serviços.',
  sections: [
    {
      title: 'Os cinco passos de um orçamento com margem',
      bullets: [
        'Escopo em serviços do catálogo: o que será entregue, com o modelo de cobrança de cada item (escopo fixo, recorrente, taxa de sucesso ou combinação).',
        'Horas por papel: quantas horas de cada perfil (sênior, pleno, júnior, gerente) o escopo pede.',
        'Custo hora real por papel: o custo mensal completo das pessoas daquele perfil dividido pelas horas úteis, e não o salário nominal.',
        'Custos diretos além de gente: fornecedores, materiais, licenças, viagens.',
        'Margem-alvo aplicada sobre o custo total, com o preço resultante comparado ao que o mercado paga. Se não fecha, ajusta escopo ou equipe, não a margem.',
      ],
    },
    {
      title: 'Exemplo numérico',
      table: {
        caption: 'Orçamento de um projeto de 12 semanas com margem-alvo de 40%',
        head: ['Item', 'Cálculo', 'Valor'],
        rows: [
          ['Sênior', '120 h × R$ 110', 'R$ 13.200'],
          ['Pleno', '320 h × R$ 76', 'R$ 24.320'],
          ['Gerente de projeto', '60 h × R$ 130', 'R$ 7.800'],
          ['Fornecedor (pesquisa)', 'contrato', 'R$ 6.000'],
          ['Custo total', 'soma', 'R$ 51.320'],
          ['Preço com margem de 40%', '51.320 ÷ (1 − 0,40)', 'R$ 85.533'],
          ['Preço arredondado na proposta', '', 'R$ 86.000 (margem planejada de 40,3%)'],
        ],
      },
      paragraphs: [
        'Repare que margem de 40% sobre o preço não é acrescentar 40% ao custo: 51.320 × 1,4 daria R$ 71.848 e margem de apenas 28,6%. O erro de confundir markup com margem é comum e custa caro.',
      ],
    },
    {
      title: 'Versões, aprovação e o que acontece depois',
      paragraphs: [
        'Proposta boa muda: o cliente corta escopo, pede prazo menor, negocia preço. Cada mudança é uma versão do orçamento, com a margem recalculada, e a versão aprovada é a que vira projeto. A partir daí a margem planejada do orçamento é a referência contra a qual a margem realizada do projeto será lida, mês a mês.',
      ],
    },
    {
      title: 'Erros comuns',
      bullets: [
        'Copiar o orçamento anterior e trocar o nome do cliente, sem olhar o custo realizado daquele projeto.',
        'Usar salário nominal ou um custo hora médio da empresa em vez do custo real por papel.',
        'Confundir markup com margem.',
        'Esquecer as horas de gestão e de reuniões com o cliente, que existem e custam.',
        'Não registrar a versão enviada, e depois não saber o que foi prometido.',
      ],
    },
    {
      title: 'Como o Origami Pulse monta o orçamento',
      paragraphs: [
        `No ${SITE.name}, o orçamento nasce da oportunidade no pipeline e é montado sobre o catálogo de serviços da empresa, com modelos de cobrança e o custo real da equipe por papel. A margem planejada aparece antes de enviar. O orçamento tem versões; o aprovado vira projeto com parcelas, e a margem realizada passa a ser lida contra a planejada. Na próxima proposta, o histórico de custo real de projetos parecidos já está lá.`,
      ],
    },
  ],
  faq: [
    {
      question: 'Qual margem usar no orçamento?',
      answer:
        'Depende do custo indireto da empresa. A margem bruta do projeto precisa cobrir quem não aponta hora em projeto (administrativo, comercial, liderança), aluguel, impostos e ainda sobrar lucro. Consultorias e agências costumam trabalhar com margem bruta alvo entre 30% e 50% por projeto. O essencial é ter uma meta declarada e medir cada projeto contra ela.',
    },
    {
      question: 'Markup e margem são a mesma coisa?',
      answer:
        'Não. Markup é o percentual acrescentado sobre o custo; margem é o percentual do preço que sobra depois do custo. Markup de 40% sobre R$ 100 dá preço de R$ 140 e margem de 28,6%. Para ter margem de 40%, o preço precisa ser R$ 166,67 (custo dividido por 0,6).',
    },
    {
      question: 'Como orçar um serviço recorrente?',
      answer:
        'Estimando as horas mensais por papel e os custos diretos mensais, e aplicando a margem-alvo para chegar à mensalidade. Depois, a margem realizada é lida mês a mês: mensalidade contra horas e custos do mês. Se o cliente consome mais do que o previsto, o número aparece antes da renovação.',
    },
    {
      question: 'Preciso de orçamento para projeto pequeno?',
      answer:
        'Precisa de um orçamento simples, com as mesmas cinco etapas em versão curta: um ou dois papéis, horas, custo hora real, margem. Projeto pequeno sem margem calculada é onde o prejuízo se esconde, porque ninguém olha.',
    },
  ],
  related: [SLUG.CUSTO_HORA, SLUG.MARGEM, SLUG.CONSULTORIAS],
  updatedAt: UPDATED,
};

const margemRealizada: ContentPage = {
  slug: SLUG.MARGEM_REALIZADA,
  kind: ContentKind.DEFINITION,
  navLabel: 'Margem realizada',
  eyebrow: 'Guia definicional',
  title: 'O que é margem realizada de um projeto',
  seoTitle: 'O que é margem realizada de um projeto | Origami Pulse',
  description:
    'Margem realizada é a margem calculada com o que de fato aconteceu no projeto: receita recebida ou reconhecida menos horas apontadas ao custo real, fornecedores e materiais pagos. Veja a definição, a diferença para margem planejada e contábil, e como acompanhar.',
  lead:
    'Margem realizada de um projeto é a diferença entre a receita que o projeto de fato gerou e o custo que ele de fato consumiu: as horas apontadas pela equipe, valorizadas pelo custo hora real de cada pessoa, mais fornecedores e materiais pagos. É o contraponto da margem planejada, que nasce no orçamento com horas estimadas, e é lida por período, projeto, cliente e gerente enquanto o projeto acontece.',
  sections: [
    {
      title: 'Definição, em uma fórmula',
      paragraphs: ['Margem realizada = receita realizada − custo realizado. Em percentual, dividida pela receita realizada. Cada termo tem definição precisa:'],
      bullets: [
        'Receita realizada: parcelas recebidas no período, ou receita reconhecida do período em contratos recorrentes (a mensalidade do mês).',
        'Custo realizado de mão de obra: soma de (horas apontadas × custo hora de quem apontou), com o custo hora vigente no momento do apontamento.',
        'Custo realizado de terceiros: fornecedores e materiais lançados no projeto no período.',
      ],
    },
    {
      title: 'Margem planejada, realizada e contábil',
      table: {
        caption: 'Três margens que respondem perguntas diferentes',
        head: ['Margem', 'Quando nasce', 'Pergunta que responde', 'Quem usa'],
        rows: [
          ['Planejada', 'No orçamento, antes da venda', 'Vale a pena vender por este preço?', 'Comercial e sócios'],
          ['Realizada', 'Durante o projeto, mês a mês', 'Valeu a pena ter vendido, e ainda dá para corrigir?', 'Gerente de projeto e sócios'],
          ['Contábil', 'No fechamento, por período e empresa', 'Quanto a empresa lucrou no mês ou no ano?', 'Financeiro e contabilidade'],
        ],
      },
    },
    {
      title: 'Por que a margem realizada importa mais que a contábil para operar',
      paragraphs: [
        'A margem contábil é agregada e atrasada: mostra o resultado da empresa quando o mês fechou, sem dizer qual projeto ajudou e qual atrapalhou. A margem realizada é por projeto e chega a tempo: um desvio de 10 pontos percentuais no segundo mês de um projeto de seis é um alerta que permite agir sobre escopo, equipe alocada ou preço da próxima fase. O mesmo desvio descoberto no fechamento é só uma constatação.',
      ],
    },
    {
      title: 'Pré-requisitos para uma margem realizada confiável',
      bullets: [
        'Custo hora por pessoa atualizado, com encargos, benefícios e ferramentas, e não salário nominal.',
        'Apontamento de horas fechado toda semana. Hora apontada com um mês de atraso é chute com data.',
        'Fornecedores e materiais lançados no projeto no mês em que acontecem.',
        'Receita reconhecida por período, e não só o valor total do contrato.',
      ],
    },
    {
      title: 'Como o Origami Pulse calcula',
      paragraphs: [
        `No ${SITE.name}, cada hora apontada carrega o custo hora de quem a fez no momento do apontamento; fornecedores e materiais são lançados por mês no projeto; as parcelas registram o recebido. A margem realizada aparece por projeto, cliente e gerente, ao lado da planejada que veio do orçamento, no período que você escolher. ${TRIAL.label}, sem cartão de crédito.`,
      ],
    },
  ],
  faq: [
    {
      question: 'Margem realizada é o mesmo que margem bruta?',
      answer:
        'A margem realizada de um projeto é uma margem bruta: considera só os custos diretos do projeto (horas, fornecedores, materiais). O que a distingue é o momento e o objeto: é calculada com o que de fato aconteceu, projeto a projeto, e não com estimativas nem com a empresa inteira.',
    },
    {
      question: 'Uso receita recebida ou receita reconhecida?',
      answer:
        'Para projeto com parcelas por marco, receita recebida (ou faturada) no período é a leitura mais direta. Para contratos recorrentes, receita reconhecida do mês (a mensalidade). O importante é declarar qual das duas está em uso e manter a mesma regra em todos os projetos.',
    },
    {
      question: 'O que fazer quando a margem realizada está abaixo da planejada?',
      answer:
        'Primeiro, entender a causa pelas horas: qual papel consumiu mais do que o previsto e em qual atividade. Depois, agir no que ainda está aberto: renegociar escopo, trocar a equipe alocada, ajustar o preço da próxima fase ou, no mínimo, corrigir o orçamento do próximo projeto parecido.',
    },
    {
      question: 'Margem realizada negativa é possível?',
      answer:
        'Sim, e é mais comum do que parece em meses em que o projeto consome horas e não recebe parcela. Por isso a leitura acumulada (do início do projeto até agora) precisa acompanhar a leitura do mês: o mês negativo pode ser só descasamento de caixa, ou o começo de um projeto deficitário.',
    },
  ],
  related: [SLUG.MARGEM, SLUG.PSA, SLUG.CUSTO_HORA],
  updatedAt: UPDATED,
};

export const GUIDE_PAGES: readonly ContentPage[] = [alocacao, orcamento, margemRealizada];
