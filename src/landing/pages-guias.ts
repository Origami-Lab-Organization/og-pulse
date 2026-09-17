import type { ContentPage } from '@/types/landing';
import { ContentKind } from '@/types/landing';
import { SITE, TRIAL } from '@/landing/site';
import { SLUG } from '@/landing/slugs';

/** Páginas por problema e definicionais (PUL-242, segunda leva). Mesmas regras de `pages.ts`. */

const UPDATED = '2026-09-09';
/** Terceira leva de conteúdo: páginas nascidas da pesquisa de intenção de 16/09/2026. */
const UPDATED_TERCEIRA_LEVA = '2026-09-16';

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
  related: [SLUG.CONTROLE_HORAS, SLUG.CUSTO_HORA, SLUG.MARGEM],
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
  related: [SLUG.VALOR_HORA, SLUG.CUSTO_HORA, SLUG.MARGEM],
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
  related: [SLUG.MARGEM, SLUG.CONTROLE_HORAS, SLUG.CUSTO_HORA],
  updatedAt: UPDATED,
};

const controleHoras: ContentPage = {
  slug: SLUG.CONTROLE_HORAS,
  kind: ContentKind.PROBLEM,
  navLabel: 'Controle de horas por projeto',
  eyebrow: 'Apontamento',
  title: 'Controle de horas por projeto: como registrar horas que viram custo e margem',
  seoTitle: 'Controle de horas por projeto: planilha ou sistema | Origami Pulse',
  description:
    'Controle de horas por projeto é o registro diário de quantas horas cada pessoa trabalhou em cada projeto, valorizado pelo custo hora de quem apontou. Veja o que cada lançamento precisa ter, por que a planilha para de funcionar e qual ritmo de fechamento usar.',
  lead:
    'Controle de horas por projeto é o registro de quantas horas cada pessoa trabalhou em cada projeto, por dia, com o custo hora dela atrelado ao lançamento. Serve para uma coisa antes de qualquer outra: sem hora apontada não existe custo de mão de obra, e sem custo de mão de obra a margem do projeto é chute. Na planilha, o controle funciona por algumas semanas e depois desanda — o nome do projeto vira texto livre, a semana passa sem fechamento e ninguém consegue somar custo. Em sistema, a hora entra uma vez, já ligada à pessoa, ao projeto e ao custo hora vigente naquele dia.',
  sections: [
    {
      title: 'O que cada lançamento precisa ter',
      paragraphs: [
        'Um apontamento útil tem cinco campos, e nenhum deles é opcional se o objetivo é chegar à margem:',
      ],
      bullets: [
        'Data: o dia em que o trabalho aconteceu, não o dia em que alguém lembrou de lançar.',
        'Pessoa: é dela que sai o custo hora aplicado àquela hora.',
        'Onde o tempo foi: um projeto de cliente ou uma atividade interna da empresa. Hora em projeto cobra hora, porque é trabalho vendido; hora em atividade interna desconta hora, porque é custo da empresa.',
        'Quantidade de horas, em decimal: 1,5 h, e não "manhã inteira".',
        'Descrição curta do que foi feito: é o que permite explicar, três meses depois, por que o projeto consumiu 40% mais horas do que o orçamento previa.',
      ],
    },
    {
      title: 'Ponto eletrônico, planilha de horas e apontamento por projeto não são a mesma coisa',
      paragraphs: [
        'Os três registram tempo e respondem a perguntas diferentes. Confundi-los é o motivo mais comum de uma empresa achar que já controla horas quando não controla.',
      ],
      table: {
        caption: 'Diferença entre ponto eletrônico, planilha de horas e apontamento por projeto',
        head: ['', 'Ponto eletrônico', 'Planilha de horas', 'Apontamento por projeto'],
        rows: [
          ['O que registra', 'Entrada, saída e jornada', 'Horas trabalhadas, em texto livre', 'Horas por pessoa, projeto e dia'],
          ['Para que serve', 'Cumprir a obrigação trabalhista', 'Ter algum registro', 'Virar custo e margem do projeto'],
          ['Quem confere', 'RH e departamento pessoal', 'Normalmente ninguém', 'Gerente do projeto, no fechamento da semana'],
          ['Vira custo de projeto?', 'Não', 'Só se alguém multiplicar à mão', 'Sim, pelo custo hora de quem apontou'],
        ],
      },
    },
    {
      title: 'Por que a planilha para de funcionar',
      paragraphs: [
        'A planilha de controle de horas resolve o registro e não resolve o custo. Ela aguenta uma pessoa em um projeto; começa a falhar com cinco pessoas em três projetos simultâneos. Os pontos de ruptura são sempre os mesmos:',
      ],
      bullets: [
        'O nome do projeto é digitado de quatro jeitos diferentes, e a soma por projeto para de fechar.',
        'Ninguém fecha a semana: as horas são preenchidas de memória no fim do mês, em blocos redondos de 8 horas.',
        'Não há custo hora por pessoa na planilha, então as horas nunca viram dinheiro.',
        'As horas que não são de projeto — proposta, reunião interna, treinamento — ficam de fora, e a capacidade da equipe parece maior do que é.',
        'A consolidação vira trabalho de alguém: copiar abas, somar e formatar todo mês, para produzir um número que já chegou tarde.',
      ],
    },
    {
      title: 'O ritmo que funciona: lançar todo dia, fechar toda semana',
      paragraphs: [
        'Apontamento é hábito, não projeto de implantação. O ritmo que se sustenta é lançar no fim do dia, em menos de dois minutos, e fechar a semana na sexta. Fechar significa enviar: a partir do envio, os valores daquela semana ficam travados e só um administrador altera, com registro do motivo da correção.',
        'O travamento não é burocracia. Ele é o que separa dado de rascunho: sem uma data de corte, a margem de agosto continua mudando em outubro, e nenhum número serve para decidir nada.',
      ],
    },
    {
      title: 'Da hora apontada ao custo do projeto',
      paragraphs: [
        'Cada hora apontada, multiplicada pelo custo hora de quem a apontou, é custo de mão de obra daquele projeto. Somado a fornecedores e materiais e comparado com a receita do período, dá a margem realizada. É por isso que o apontamento atrasado é caro: a margem do mês corrente sempre parece melhor do que é, porque a receita já está lançada e parte do custo ainda não chegou.',
      ],
    },
    {
      title: 'Como o Origami Pulse faz o controle de horas',
      paragraphs: [
        `No ${SITE.name}, a grade semanal de apontamento já vem pré-preenchida pela alocação planejada: quem seguiu o plano só confirma. O lançamento é por dia, em projeto ou em atividade interna, e cada hora carrega o custo hora da pessoa vigente naquele momento. Os feriados cadastrados pela empresa aparecem marcados na grade. O envio da semana trava os valores por projeto, e a correção posterior é feita por um administrador com o motivo registrado. Um lembrete automático avisa quem ainda não enviou, no dia e no horário que a empresa configurar, e um alerta avisa os gerentes dos projetos com horas pendentes. No celular, o apontamento funciona como aplicativo instalável.`,
      ],
    },
  ],
  faq: [
    {
      question: 'Controle de horas por projeto é a mesma coisa que ponto eletrônico?',
      answer:
        'Não. O ponto registra a jornada da pessoa para fins trabalhistas: entrada, saída e intervalo. O apontamento por projeto distribui o tempo entre projetos de cliente e atividades internas, para que as horas virem custo e margem. Uma empresa pode precisar dos dois, mas só o segundo responde quanto um projeto custou.',
    },
    {
      question: 'Planilha de controle de horas por projeto resolve?',
      answer:
        'Resolve o registro, não o custo. Enquanto forem poucas pessoas e um projeto por vez, a planilha dá conta. Ela quebra quando aparecem projetos simultâneos, custo hora diferente por pessoa e a necessidade de comparar horas planejadas com apontadas — porque nada disso é somável quando o projeto é texto livre em uma célula.',
    },
    {
      question: 'De quanto em quanto tempo a equipe deve apontar horas?',
      answer:
        'Todo dia, com fechamento semanal. Apontar o mês inteiro de memória na última sexta produz números redondos e errados, quase sempre a favor do projeto mais recente. A semana fechada é o que torna a margem do mês confiável no dia seguinte ao fechamento, e não trinta dias depois.',
    },
    {
      question: 'E as horas que não são de projeto de cliente?',
      answer:
        'Entram como atividade interna: comercial, marketing, administrativo, treinamento. Elas existem e custam. Registrá-las separadamente é o que mantém a capacidade realista e mostra quanto do tempo da empresa é vendável — número que a taxa de ocupação usa e que o valor hora de venda precisa cobrir.',
    },
    {
      question: 'Quem revisa as horas apontadas?',
      answer:
        'O gerente de cada projeto, no fechamento da semana, porque é quem sabe se 14 horas naquela entrega fazem sentido. Depois do envio, o lançamento fica travado e só um administrador altera, com o motivo registrado — o histórico de correções é parte da auditoria do custo.',
    },
  ],
  related: [SLUG.ALOCACAO, SLUG.CUSTO_HORA, SLUG.MARGEM_REALIZADA],
  updatedAt: UPDATED_TERCEIRA_LEVA,
};

const valorHora: ContentPage = {
  slug: SLUG.VALOR_HORA,
  kind: ContentKind.PROBLEM,
  navLabel: 'Valor hora de venda',
  eyebrow: 'Precificação',
  title: 'Valor hora de venda: como calcular quanto cobrar pela hora da sua equipe',
  seoTitle: 'Valor hora de venda: como calcular quanto cobrar | Origami Pulse',
  description:
    'Valor hora de venda = (custo hora ÷ taxa de ocupação) ÷ (1 − impostos − margem-alvo). Veja a fórmula, um exemplo numérico completo, por que a taxa de ocupação muda tudo e como montar a tabela de preços por papel e senioridade.',
  lead:
    'Valor hora de venda é quanto a empresa cobra por uma hora de trabalho da equipe, e ele não é o custo hora somado a uma margem. A fórmula que fecha é valor hora = (custo hora ÷ taxa de ocupação) ÷ (1 − impostos − margem-alvo): primeiro o custo hora real da pessoa, depois a correção pela fatia de horas que a empresa de fato consegue vender, e só então impostos e margem. Quem pula a taxa de ocupação — as horas de proposta, reunião interna, treinamento e ociosidade, que ninguém paga — vende a hora abaixo do custo e descobre no fim do ano.',
  sections: [
    {
      title: 'A fórmula, em quatro números',
      paragraphs: [
        'Cada termo tem uma definição precisa, e é nessas definições que o preço se ganha ou se perde:',
      ],
      bullets: [
        'Custo hora real: custo mensal completo da pessoa (salário, encargos, benefícios e ferramentas) dividido pelas horas úteis do mês. Não é salário dividido por 220.',
        'Taxa de ocupação: horas apontadas em projeto de cliente dividido pelas horas úteis do período. É o que transforma o custo de uma hora trabalhada no custo de uma hora vendável.',
        'Impostos sobre o serviço: a alíquota efetiva que incide sobre o preço, conforme o regime tributário da empresa. Entra como percentual do preço, nunca do custo.',
        'Margem-alvo: o percentual do preço que precisa sobrar para pagar quem não aponta hora em projeto — administrativo, comercial, liderança —, as despesas fixas e o lucro.',
      ],
    },
    {
      title: 'Exemplo numérico',
      table: {
        caption: 'Valor hora de venda de uma pessoa com custo hora de R$ 76,19',
        head: ['Item', 'Cálculo', 'Valor'],
        rows: [
          ['Custo hora real', 'custo mensal completo ÷ horas úteis', 'R$ 76,19'],
          ['Taxa de ocupação', 'horas em projeto ÷ horas úteis', '70%'],
          ['Custo da hora vendável', '76,19 ÷ 0,70', 'R$ 108,84'],
          ['Impostos sobre o serviço', 'percentual do preço', '10%'],
          ['Margem-alvo', 'percentual do preço', '35%'],
          ['Valor hora mínimo', '108,84 ÷ (1 − 0,10 − 0,35)', 'R$ 197,89'],
          ['Valor na tabela de preços', 'arredondado', 'R$ 200,00 (margem de 35,6%)'],
        ],
      },
      paragraphs: [
        'Compare com o atalho comum: custo hora de R$ 76,19 mais 35% dá R$ 102,86, um preço que parece lucrativo e não cobre nem os R$ 108,84 da hora vendável — antes de pagar imposto. A diferença entre R$ 102,86 e R$ 200,00 não é ganância: é o que separa um valor hora que sustenta a empresa de um que a consome devagar.',
      ],
    },
    {
      title: 'Taxa de ocupação: o número que quase ninguém mede',
      paragraphs: [
        'Uma pessoa com 168 horas úteis no mês não entrega 168 horas faturáveis. Parte do tempo vai para proposta, reunião interna, recrutamento, treinamento, e parte simplesmente não foi vendida. A taxa de ocupação é a razão entre as horas apontadas em projeto de cliente e as horas úteis do período, medida por pessoa e por mês.',
        'Empresas de serviços que medem costumam operar entre 60% e 80% em média anual, com variação grande por papel: quem vende e lidera fica bem abaixo, quem só entrega fica acima. Não existe número certo para copiar — existe o seu, e ele muda o valor hora em dezenas por cento. Assumir 100% no cálculo do preço é o erro que produz a maior parte dos contratos por hora deficitários.',
      ],
    },
    {
      title: 'Uma tabela de preços por papel, não um valor hora único',
      paragraphs: [
        'Valor hora único para a empresa inteira esconde dois erros ao mesmo tempo: o projeto tocado por especialistas fica barato demais e o tocado por juniores, caro demais. O preço precisa acompanhar o papel e a senioridade de quem entrega, como o custo já acompanha.',
      ],
      bullets: [
        'Um valor hora por papel e senioridade — júnior, pleno, sênior, especialista —, calculado com o custo hora médio daquele grupo.',
        'A mesma taxa de ocupação não vale para todos: gerente de projeto e sócio têm ocupação menor, e o valor hora deles absorve isso.',
        'Revisão pelo menos uma vez por ano, e sempre que a folha ou o regime tributário mudar. Tabela de preços de dois anos atrás precifica uma equipe que não existe mais.',
      ],
    },
    {
      title: 'Quando o preço não fecha com o que o mercado paga',
      paragraphs: [
        'O valor hora calculado é um piso, não uma sentença. Se o mercado não paga aquilo, a resposta não é baixar a margem no orçamento e torcer: é mudar o mix de senioridade da equipe alocada, reduzir escopo, encurtar prazo ou recusar. Quando a empresa decide vender abaixo do piso por motivo estratégico — entrar em uma conta, aprender um domínio —, a decisão é legítima desde que o número esteja na mesa e o projeto seja acompanhado como o investimento que é.',
      ],
    },
    {
      title: 'Valor hora em preço fechado e em fee mensal',
      paragraphs: [
        'Mesmo quando o contrato não é por hora, o valor hora continua sendo a base: é ele que transforma horas estimadas por papel em preço de proposta, e é contra ele que a margem realizada será lida depois. Em contrato de escopo fixo, o valor hora define o preço e o risco do desvio é da empresa. Em fee mensal, ele define quantas horas cabem na mensalidade — o número que a conversa de renovação precisa ter.',
      ],
    },
    {
      title: 'Como o Origami Pulse usa o valor hora',
      paragraphs: [
        `No ${SITE.name}, a Tabela de Preços do Portal do Admin guarda o valor hora por papel e senioridade, e é dela que o orçamento monta a proposta. Do outro lado, o cadastro de pessoas dá o custo hora real, e as horas apontadas dão a ocupação efetiva de cada pessoa. Com os dois números na mesma base, a margem planejada aparece antes de enviar a proposta e a margem realizada mostra, mês a mês, se a ocupação assumida na conta era mesmo a da vida real.`,
      ],
    },
  ],
  faq: [
    {
      question: 'Valor hora de venda e custo hora são a mesma coisa?',
      answer:
        'Não. Custo hora é quanto a hora custa para a empresa; valor hora é quanto a empresa cobra por ela. Entre um e outro entram a taxa de ocupação, os impostos sobre o serviço e a margem-alvo. Vender pelo custo hora acrescido de uma margem, sem a correção pela ocupação, é vender abaixo do custo real.',
    },
    {
      question: 'Como calcular a taxa de ocupação da equipe?',
      answer:
        'Horas apontadas em projeto de cliente divididas pelas horas úteis do período, por pessoa e por mês. Horas úteis são jornada diária vezes dias úteis do mês, descontando feriados. Sem apontamento de horas, essa taxa não existe e o valor hora é calculado no escuro.',
    },
    {
      question: 'Devo somar a margem ao custo ou dividir o custo pela margem?',
      answer:
        'Dividir. Markup de 35% sobre um custo de R$ 108,84 dá R$ 146,93 e margem de apenas 25,9%. Para margem de 35% com 10% de imposto, o preço é 108,84 dividido por 0,55, ou seja, R$ 197,89. Markup e margem não são a mesma coisa, e a confusão entre os dois é a que mais aparece em proposta de serviço.',
    },
    {
      question: 'Qual é o valor hora certo para consultoria?',
      answer:
        'Não existe tabela universal, e copiar a de terceiros é como usar o custo hora de outra empresa. O piso é o seu: custo hora real corrigido pela sua taxa de ocupação, pelos seus impostos e pela sua margem-alvo. O teto é o que o seu mercado paga pelo resultado que você entrega. O preço vive entre os dois, e só o piso é conta.',
    },
    {
      question: 'Preciso mostrar o valor hora na proposta?',
      answer:
        'Não necessariamente. Muitos clientes preferem preço fechado por entrega, e abrir a hora convida a negociar a hora em vez do resultado. Internamente, porém, o valor hora precisa existir mesmo em proposta fechada: é ele que permite saber se o escopo negociado ainda cabe no preço.',
    },
  ],
  related: [SLUG.CUSTO_HORA, SLUG.ORCAMENTO, SLUG.MARGEM],
  updatedAt: UPDATED_TERCEIRA_LEVA,
};

export const GUIDE_PAGES: readonly ContentPage[] = [alocacao, controleHoras, orcamento, valorHora, margemRealizada];
