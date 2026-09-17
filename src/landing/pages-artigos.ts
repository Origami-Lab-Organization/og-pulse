import type { ContentPage } from '@/types/landing';
import { ContentKind } from '@/types/landing';
import { SLUG } from '@/landing/slugs';

/**
 * Quarta leva de conteúdo (17/09/2026): artigos nascidos da pesquisa de intenção de
 * 17/09/2026, no autocomplete do Google (pt-BR/BR). Só entrou tema cujo autocomplete
 * devolveu cauda própria — consultas como "indicadores de empresa de serviços",
 * "por que meu escritório não dá lucro" e "como fazer gestão de uma consultoria"
 * voltaram vazias e por isso não viraram página.
 *
 * Mesmas regras de `pages.ts`: número é exemplo rotulado, sem citar concorrente, sem
 * dado real de cliente, e o vocabulário é o do `domain-glossary.md`.
 */

const PUBLICADO = '2026-09-17';

const horasUteis: ContentPage = {
  slug: SLUG.HORAS_UTEIS,
  kind: ContentKind.GUIDE,
  navLabel: 'Horas úteis do mês',
  eyebrow: 'Capacidade',
  title: 'Quantas horas úteis tem um mês: a conta que muda o custo da sua hora',
  seoTitle: 'Quantas horas úteis tem um mês | Origami Pulse',
  description:
    'Um mês não tem 160 nem 220 horas fixas: tem dias úteis × jornada, menos feriados. Veja a conta mês a mês, a diferença entre hora útil e hora produtiva e por que isso muda o custo da sua hora.',
  lead:
    'Um mês de trabalho não tem um número fixo de horas úteis: tem a quantidade de dias úteis daquele mês multiplicada pela jornada diária. Com jornada de 8 horas, um mês de 22 dias úteis tem 176 horas; um mês de 19 dias úteis, por feriado e emenda, tem 152. A diferença de 24 horas entre um mês e outro é 14% da capacidade da pessoa — e é por isso que dividir o salário por um número redondo, como 160 ou 220, entrega um custo hora errado em quase todo mês do ano.',
  sections: [
    {
      title: 'A conta, em uma linha',
      paragraphs: [
        'Horas úteis do mês = dias úteis do mês × jornada diária. Dias úteis são os dias de segunda a sexta, descontados os feriados nacionais, estaduais e municipais que caem em dia de semana.',
        'Em um ano típico no Brasil, os meses variam entre 18 e 23 dias úteis. Com jornada de 8 horas, isso é uma faixa de 144 a 184 horas. Nenhum número único representa o ano inteiro.',
      ],
      table: {
        caption: 'Exemplo de variação de horas úteis com jornada de 8 horas',
        head: ['Situação do mês', 'Dias úteis', 'Horas úteis', 'Diferença para 176 h'],
        rows: [
          ['Mês cheio, sem feriado', '22', '176 h', '—'],
          ['Mês com um feriado em dia de semana', '21', '168 h', '−8 h'],
          ['Mês com dois feriados e uma emenda', '19', '152 h', '−24 h'],
          ['Mês longo, sem feriado', '23', '184 h', '+8 h'],
        ],
      },
    },
    {
      title: 'Hora útil não é hora produtiva',
      paragraphs: [
        'Hora útil é o que o calendário permite. Hora produtiva é o que a pessoa de fato entrega em projeto. Entre uma e outra existe uma faixa que nenhum calendário mostra: reunião interna, recrutamento, treinamento, comercial, administrativo, retrabalho e o tempo que simplesmente não vira entrega.',
        'Tratar as duas como a mesma coisa é o erro que derruba a margem sem aviso. Quem orça 176 horas de um profissional no mês está assumindo que ele passa 100% do expediente no projeto — algo que não acontece em nenhuma empresa de serviços.',
      ],
      bullets: [
        'Horas úteis do mês: o teto do calendário, igual para todo mundo com a mesma jornada.',
        'Horas disponíveis: horas úteis menos férias, licenças, feriados locais e admissão ou desligamento no meio do mês.',
        'Horas produtivas: as horas disponíveis que viram apontamento em projeto. É a única base honesta para custo hora e para preço.',
        'Taxa de ocupação: horas produtivas ÷ horas disponíveis. É o número que quase ninguém mede e que separa quem sabe o próprio custo de quem chuta.',
      ],
    },
    {
      title: 'Por que 220 horas aparece tanto — e por que não serve aqui',
      paragraphs: [
        'O número 220 vem do cálculo trabalhista do salário-hora, que considera a jornada de 44 horas semanais e inclui os descansos semanais remunerados. Ele responde a uma pergunta de folha de pagamento, não de custo de projeto.',
        'Para saber quanto custa a hora que você vende, a base precisa ser a hora que alguém realmente trabalha no projeto. Usar 220 dilui o custo e faz a hora parecer mais barata do que é; usar 160 por hábito faz o contrário em meses cheios. Os dois erram, em direções opostas, todo mês.',
      ],
    },
    {
      title: 'O efeito no custo e no preço',
      paragraphs: [
        'Exemplo didático, com números redondos para a conta ficar visível. Uma pessoa com custo total de R$ 12.800 no mês (salário mais encargos):',
      ],
      table: {
        caption: 'Exemplo: o mesmo custo mensal dividido por bases diferentes',
        head: ['Base usada', 'Horas', 'Custo hora'],
        rows: [
          ['220 (base trabalhista)', '220 h', 'R$ 58,18'],
          ['Horas úteis de um mês cheio', '176 h', 'R$ 72,73'],
          ['Horas úteis de um mês curto', '152 h', 'R$ 84,21'],
          ['Horas produtivas, a 70% de ocupação', '123 h', 'R$ 104,07'],
        ],
      },
    },
    {
      title: 'Como o Origami Pulse trata isso',
      paragraphs: [
        'No Pulse, a capacidade de cada pessoa é calculada por mês, com os dias úteis daquele mês, e é contra ela que a alocação é comparada — não contra um número fixo. O apontamento de horas separa hora em projeto, que cobra hora, de hora em atividade interna, que desconta hora, e é daí que sai a ocupação real de cada pessoa.',
        'Com isso, o custo hora deixa de ser uma estimativa anual e passa a ser um número que a operação produz sozinha, mês a mês.',
      ],
    },
  ],
  faq: [
    {
      question: 'Quantas horas úteis tem um mês de trabalho?',
      answer:
        'Depende do mês. A conta é dias úteis × jornada diária. Com jornada de 8 horas, os meses do ano variam entre 144 e 184 horas úteis, conforme a quantidade de dias de semana e os feriados que caem neles. Não existe um número único válido para o ano inteiro.',
    },
    {
      question: 'Por que muita gente usa 220 horas?',
      answer:
        '220 é a base do salário-hora trabalhista, que parte de 44 horas semanais e inclui os descansos semanais remunerados. Serve para folha de pagamento. Para custo de projeto ela distorce, porque conta horas que ninguém trabalha em projeto.',
    },
    {
      question: 'Devo usar horas úteis ou horas produtivas para calcular o custo hora?',
      answer:
        'Horas produtivas. A hora útil é o teto do calendário; a hora produtiva é a que vira entrega em projeto. Dividir o custo pelas horas úteis assume ocupação de 100% e entrega um custo hora menor do que o real, o que se transmite direto para o preço.',
    },
    {
      question: 'Como descubro a taxa de ocupação da minha equipe?',
      answer:
        'Dividindo as horas apontadas em projeto pelas horas disponíveis no período. Só é possível medir onde existe apontamento de horas separando projeto de atividade interna. Sem esse registro, a ocupação é chute.',
    },
  ],
  related: [SLUG.CUSTO_HORA, SLUG.VALOR_HORA, SLUG.ALOCACAO],
  publishedAt: PUBLICADO,
  updatedAt: PUBLICADO,
};

const scopeCreep: ContentPage = {
  slug: SLUG.SCOPE_CREEP,
  kind: ContentKind.DEFINITION,
  navLabel: 'Scope creep',
  eyebrow: 'Definição',
  title: 'O que é scope creep: quando o escopo cresce e a margem encolhe',
  seoTitle: 'O que é scope creep e como controlar | Origami Pulse',
  description:
    'Scope creep é o crescimento não controlado do escopo de um projeto, sem ajuste de prazo nem de preço. Veja como ele aparece, como medir o quanto custou e como travar sem brigar com o cliente.',
  lead:
    'Scope creep é o crescimento do escopo de um projeto sem que prazo e preço sejam renegociados junto. Não é uma mudança grande e visível, que geraria um aditivo: é a soma de pedidos pequenos, cada um razoável sozinho, que ninguém mediu. O projeto entrega mais do que foi vendido, consome horas que não foram orçadas e fecha com margem menor — quase sempre sem que ninguém consiga apontar o momento em que isso aconteceu.',
  sections: [
    {
      title: 'Como o scope creep aparece na prática',
      paragraphs: [
        'Ele quase nunca chega como "quero mudar o projeto". Chega como favor pequeno, no meio de uma conversa que já estava acontecendo:',
      ],
      bullets: [
        '"Já que você está mexendo nisso, dá uma olhada também naquilo."',
        '"É só um ajustezinho, cinco minutos."',
        'Uma reunião extra por semana que ninguém orçou, durante quatro meses.',
        'A terceira rodada de revisão em um escopo que previa duas.',
        'Um relatório novo, pedido por um diretor que não participou do fechamento.',
      ],
    },
    {
      title: 'Por que ele é invisível até o fim',
      paragraphs: [
        'Cada pedido isolado é pequeno demais para justificar uma conversa comercial. O problema é o acumulado: vinte pedidos de duas horas são quarenta horas, que em um projeto de trezentas horas representam 13% do esforço — geralmente mais do que toda a margem planejada.',
        'Quem controla projeto por percentual de avanço não vê isso acontecer, porque o percentual é uma opinião. Quem controla por horas apontadas vê na semana em que começa, porque a hora é um fato.',
      ],
    },
    {
      title: 'Como medir o que o escopo extra custou',
      paragraphs: [
        'Só dá para negociar o que está medido. A conta é simples quando existe apontamento por projeto:',
      ],
      table: {
        caption: 'Exemplo didático de um projeto vendido por escopo fechado',
        head: ['Item', 'Planejado', 'Realizado', 'Leitura'],
        rows: [
          ['Horas do projeto', '300 h', '352 h', '+52 h de esforço não vendido'],
          ['Custo das horas', 'R$ 22.857', 'R$ 26.819', '+R$ 3.962 de custo'],
          ['Receita do projeto', 'R$ 45.000', 'R$ 45.000', 'inalterada: nada foi cobrado'],
          ['Margem', '49,2%', '40,4%', '−8,8 pontos'],
        ],
      },
    },
    {
      title: 'Como travar sem transformar em briga',
      paragraphs: [
        'Travar escopo não é dizer não. É tornar visível, no momento em que acontece, o que cada pedido custa — e deixar a decisão com quem paga.',
      ],
      bullets: [
        'Escreva o que está fora do escopo na proposta, não só o que está dentro. A lista de exclusões evita metade das conversas.',
        'Registre o pedido extra como item, com a estimativa em horas, antes de executar. A estimativa é a negociação.',
        'Mostre o consumido contra o orçado em toda reunião de acompanhamento. Um número na mesa toda semana é mais fácil que uma cobrança no fim.',
        'Defina de antemão quantas rodadas de revisão estão incluídas. Rodada é a unidade mais barata de medir escopo em serviço criativo.',
        'Trate o aditivo como rotina, não como conflito. Quem nunca aditiva está absorvendo o custo em silêncio.',
      ],
    },
    {
      title: 'O papel do registro de horas',
      paragraphs: [
        'Tudo acima depende de um único insumo: saber quantas horas cada projeto consumiu, por pessoa, até hoje. No Origami Pulse esse número vem do apontamento semanal e alimenta a margem realizada do projeto, comparada com a margem que o orçamento prometeu.',
        'Quando as duas margens aparecem lado a lado, o scope creep deixa de ser uma sensação no fim do projeto e vira um desvio visível na terceira semana, enquanto ainda dá para negociar.',
      ],
    },
  ],
  faq: [
    {
      question: 'O que significa scope creep em um projeto?',
      answer:
        'É o crescimento gradual do escopo sem ajuste de prazo ou preço. O projeto passa a entregar mais do que foi vendido, com o mesmo valor e o mesmo prazo, e a diferença sai da margem.',
    },
    {
      question: 'Qual a diferença entre scope creep e mudança de escopo?',
      answer:
        'Mudança de escopo é explícita e negociada: vira aditivo, novo prazo ou nova versão do orçamento. Scope creep é a mudança que acontece sem passar por essa conversa — pequena o bastante para não gerar negociação e frequente o bastante para custar caro.',
    },
    {
      question: 'Como saber se meu projeto sofreu scope creep?',
      answer:
        'Compare as horas apontadas com as horas orçadas por fase. Se o esforço estourou sem que o escopo contratado tenha mudado formalmente, a diferença é escopo extra absorvido. Sem apontamento de horas, essa comparação não existe.',
    },
    {
      question: 'Escopo fechado protege do scope creep?',
      answer:
        'Não por si só. Escopo fechado define o que foi vendido, mas não impede pedidos extras — só torna claro que estão fora. A proteção real vem de medir e mostrar o consumo enquanto o projeto corre.',
    },
  ],
  related: [SLUG.MARGEM_REALIZADA, SLUG.ORCAMENTO, SLUG.CONTROLE_HORAS],
  publishedAt: PUBLICADO,
  updatedAt: PUBLICADO,
};

const precificarSoftware: ContentPage = {
  slug: SLUG.PRECIFICAR_SOFTWARE,
  kind: ContentKind.GUIDE,
  navLabel: 'Precificar projeto de software',
  eyebrow: 'Preço',
  title: 'Como precificar um projeto de software: escopo fechado, hora e squad',
  seoTitle: 'Como precificar um projeto de software | Origami Pulse',
  description:
    'Os três modelos de cobrança em desenvolvimento de software, quando cada um protege a margem, como montar o preço a partir do custo hora e o erro de orçar por esforço otimista.',
  lead:
    'Precificar um projeto de software é escolher entre três modelos — escopo fechado, por hora e squad dedicado — e montar o preço de cada um a partir do mesmo insumo: o custo da hora de quem vai executar, dividido pela ocupação real e acrescido de imposto e margem. O modelo muda quem carrega o risco da estimativa; não muda a conta de baixo. Quem troca de modelo sem refazer a conta costuma descobrir tarde que vendeu o time por menos do que ele custa.',
  sections: [
    {
      title: 'Os três modelos e quem carrega o risco',
      paragraphs: [
        'A diferença entre os modelos não é de preço final: é de quem paga quando a estimativa erra.',
      ],
      table: {
        caption: 'Modelos de cobrança em projeto de software',
        head: ['Modelo', 'Como cobra', 'Quem carrega o risco', 'Quando faz sentido'],
        rows: [
          ['Escopo fechado', 'Valor único por entrega definida', 'A software house', 'Escopo estável, domínio conhecido, requisitos escritos'],
          ['Por hora', 'Hora apontada × valor hora do papel', 'O cliente', 'Descoberta, manutenção, escopo que ainda vai mudar'],
          ['Squad dedicado', 'Valor mensal por time alocado', 'Compartilhado', 'Produto contínuo, relação longa, prioridade que muda no mês'],
        ],
      },
    },
    {
      title: 'A conta que sustenta qualquer um dos três',
      paragraphs: [
        'Antes de escolher o modelo, o preço da hora precisa existir. A fórmula é a mesma que vale para qualquer serviço:',
        'valor hora = (custo hora ÷ taxa de ocupação) ÷ (1 − impostos − margem-alvo)',
        'Exemplo didático, com um desenvolvedor pleno de custo total R$ 12.800 no mês e 152 horas disponíveis: custo hora de R$ 84,21. A 70% de ocupação, R$ 120,30. Com 10% de imposto efetivo e margem-alvo de 35%, o valor hora sai em R$ 218,73 — que na tabela vira R$ 220,00.',
        'O atalho errado é somar 35% ao custo hora e chegar em R$ 113,68: esse número não cobre nem a hora vendável, porque ignora que 30% do tempo da pessoa não é faturável.',
      ],
    },
    {
      title: 'Por que escopo fechado quebra',
      paragraphs: [
        'Escopo fechado não quebra por causa do preço da hora. Quebra por causa do esforço estimado, que é quase sempre otimista, e por causa do escopo que cresce depois.',
      ],
      bullets: [
        'A estimativa do time é feita no melhor cenário, sem contar revisão, integração, ambiente, correção e reunião.',
        'O esforço estimado costuma sair em horas de código, mas o projeto consome horas de projeto: cerimônia, alinhamento, teste, deploy, suporte à homologação.',
        'Sem uma margem de contingência declarada, o primeiro imprevisto sai da margem.',
        'Sem registro de horas por projeto, ninguém aprende com o erro: a próxima estimativa repete o mesmo otimismo.',
      ],
    },
    {
      title: 'Montar o preço por papel, não por pessoa',
      paragraphs: [
        'Preço por pessoa amarra o orçamento a quem está livre na semana. Preço por papel e senioridade — júnior, pleno, sênior, especialista — permite montar o projeto com a composição certa e trocar quem executa sem refazer a proposta.',
        'É essa tabela que vira o insumo do orçamento: o escopo é decomposto em horas por papel, cada papel tem seu valor hora, e o total sai com a margem já visível antes de enviar a proposta ao cliente.',
      ],
    },
    {
      title: 'Como o Origami Pulse ajuda',
      paragraphs: [
        'No Pulse, o valor hora por papel e senioridade fica na Tabela de Preços do Portal do Admin, e o orçamento é montado sobre o catálogo de serviços, com versões e margem calculada em cada uma. Ao longo do projeto, as horas apontadas produzem a margem realizada, comparável à que o orçamento prometeu.',
        'É essa comparação que transforma estimativa em aprendizado: depois de alguns projetos, a software house sabe o próprio fator de erro e passa a orçar com ele embutido, em vez de descobrir no fechamento.',
      ],
    },
  ],
  faq: [
    {
      question: 'Como precificar um projeto de desenvolvimento de software?',
      answer:
        'Decomponha o escopo em horas por papel e senioridade, aplique o valor hora de cada papel e confira a margem antes de enviar. O valor hora sai de (custo hora ÷ ocupação) ÷ (1 − impostos − margem-alvo). O modelo de cobrança define quem carrega o risco da estimativa, não a conta de baixo.',
    },
    {
      question: 'Cobrar por hora ou por escopo fechado?',
      answer:
        'Por escopo fechado quando os requisitos estão escritos e o domínio é conhecido — o cliente compra previsibilidade e você assume o risco. Por hora quando o escopo ainda vai mudar, como em descoberta e manutenção. Vender escopo fechado sobre requisito vago é assumir um risco que não foi precificado.',
    },
    {
      question: 'Quanto cobrar por hora de desenvolvimento?',
      answer:
        'Não existe número de mercado que substitua a sua conta: o valor depende do seu custo hora, da sua ocupação e do seu regime tributário. Duas empresas com o mesmo preço de tabela podem ter margens opostas. Comece pelo custo real da hora e construa o preço a partir dele.',
    },
    {
      question: 'Como precificar squad dedicado?',
      answer:
        'Some o valor hora de cada papel do time pelas horas contratadas no mês. Como o squad ocupa a capacidade da pessoa inteira, a ocupação usada na conta deve ser alta — o risco de ociosidade passa a ser seu apenas se o contrato permitir reduzir o time no meio do caminho.',
    },
  ],
  related: [SLUG.VALOR_HORA, SLUG.ORCAMENTO, SLUG.SOFTWARE_HOUSE],
  publishedAt: PUBLICADO,
  updatedAt: PUBLICADO,
};

const reajuste: ContentPage = {
  slug: SLUG.REAJUSTE,
  kind: ContentKind.GUIDE,
  navLabel: 'Reajuste de contrato',
  eyebrow: 'Contrato',
  title: 'Como reajustar contrato de prestação de serviços sem perder o cliente',
  seoTitle: 'Como reajustar contrato de prestação de serviços | Origami Pulse',
  description:
    'Quando reajustar, qual índice usar (IPCA, IGP-M, INPC), como calcular o novo valor e como justificar o aumento com dado, não com discurso. Com exemplo numérico.',
  lead:
    'Reajustar um contrato de prestação de serviços é atualizar o valor para que ele continue cobrindo o custo que subiu desde a assinatura. A regra usual é reajuste anual, a partir da data de aniversário do contrato, por um índice previsto em cláusula — IPCA, INPC ou IGP-M. O erro mais caro não é escolher o índice errado: é não reajustar. Um contrato de três anos sem reajuste, com inflação de 4,5% ao ano, perdeu 12,9% do valor real — e essa perda saiu inteira da margem.',
  sections: [
    {
      title: 'Qual índice usar',
      paragraphs: [
        'Não existe índice obrigatório para contrato privado: vale o que a cláusula definir. O que muda entre eles é o que cada um mede.',
      ],
      table: {
        caption: 'Índices usados em reajuste de contrato de serviço',
        head: ['Índice', 'O que mede', 'Comportamento'],
        rows: [
          ['IPCA', 'Inflação ao consumidor, índice oficial de metas', 'Mais estável; o mais comum em serviços'],
          ['INPC', 'Inflação para famílias de renda mais baixa', 'Próximo do IPCA; usado quando o custo é intensivo em folha'],
          ['IGP-M', 'Cesta com forte peso de preços no atacado', 'Muito mais volátil; pode disparar ou ficar negativo'],
        ],
      },
    },
    {
      title: 'Quando o índice não é suficiente',
      paragraphs: [
        'Índice de inflação mede o custo da economia, não o seu. Em empresa de serviços, o custo é dominado por folha — e folha sobe por dissídio da categoria, por promoção interna e por disputa de mercado por talento, que não é a mesma coisa que IPCA.',
        'Quando o custo da sua hora subiu mais que o índice, o reajuste pelo índice apenas reduz a perda; não a elimina. Nesse caso a conversa não é de reajuste, é de repactuação — e ela precisa de número.',
      ],
    },
    {
      title: 'A conta do reajuste',
      paragraphs: [
        'Exemplo didático de um contrato de fee mensal, com reajuste anual:',
      ],
      table: {
        caption: 'Exemplo: contrato de R$ 18.000/mês reajustado por índice de 4,5%',
        head: ['Item', 'Valor'],
        rows: [
          ['Valor vigente', 'R$ 18.000,00'],
          ['Índice acumulado no período', '4,5%'],
          ['Valor reajustado', 'R$ 18.810,00'],
          ['Diferença mensal', 'R$ 810,00'],
          ['Diferença no ano', 'R$ 9.720,00'],
        ],
      },
    },
    {
      title: 'Como justificar sem parecer aumento arbitrário',
      paragraphs: [
        'Reajuste previsto em cláusula não precisa de justificativa — precisa de aviso com antecedência. Repactuação acima do índice precisa das duas coisas, e a diferença entre ser aceita ou virar atrito costuma estar no que você leva para a conversa.',
      ],
      bullets: [
        'Avise antes do aniversário do contrato, não junto com a fatura já reajustada.',
        'Mostre o que foi entregue no período: horas aplicadas, projetos concluídos, escopo absorvido sem cobrança.',
        'Se houve escopo extra assimilado ao longo do ano, nomeie. Ele é o argumento mais forte que existe, e quase sempre está invisível.',
        'Ofereça alternativas quando o aumento for grande: prazo maior com reajuste menor, ou escopo ajustado ao valor atual.',
        'Registre o novo valor na versão do contrato e do orçamento, para a margem dos próximos meses já nascer certa.',
      ],
    },
    {
      title: 'O dado que sustenta a conversa',
      paragraphs: [
        'A pergunta que o cliente faz é sempre a mesma: "o que eu recebo a mais?". A resposta mais convincente não é uma promessa; é o histórico. Quantas horas o contrato consumiu por mês, o que foi entregue, o que entrou fora do combinado.',
        'No Origami Pulse esse histórico existe sem esforço adicional, porque vem do apontamento de horas por projeto. Na hora de reajustar, a empresa chega com o consumo real do contrato em mãos — e a conversa muda de tom.',
      ],
    },
  ],
  faq: [
    {
      question: 'De quanto em quanto tempo posso reajustar um contrato de prestação de serviços?',
      answer:
        'A periodicidade mínima usual para reajuste por índice é anual, contada da data-base do contrato. Nada impede a renegociação de valores em outro momento, mas isso é repactuação — depende de acordo entre as partes, não da cláusula de reajuste.',
    },
    {
      question: 'Qual índice é melhor para reajustar contrato de serviço?',
      answer:
        'Na maioria dos contratos de serviço, o IPCA, por ser mais estável e ligado à inflação ao consumidor. O IGP-M tem peso grande de preços no atacado e oscila muito mais, o que pode gerar reajustes desproporcionais em qualquer direção. Se o seu custo é dominado por folha, vale considerar o INPC.',
    },
    {
      question: 'O que fazer se o cliente não aceitar o reajuste?',
      answer:
        'Leve a conversa para escopo. Se o valor não pode subir, o que cabe nele muda: menos horas, menos frentes, prazo maior. Aceitar manter tudo pelo valor antigo é escolher, em silêncio, uma margem menor — e essa escolha deveria ser explícita.',
    },
    {
      question: 'Preciso avisar o cliente com quanto tempo de antecedência?',
      answer:
        'O contrato manda. Quando não há prazo previsto, avisar com 30 a 60 dias antes do aniversário é a prática que evita atrito, porque dá ao cliente tempo de acomodar o valor no orçamento dele.',
    },
  ],
  related: [SLUG.VALOR_HORA, SLUG.MARGEM, SLUG.CONSULTORIAS],
  publishedAt: PUBLICADO,
  updatedAt: PUBLICADO,
};

const variosProjetos: ContentPage = {
  slug: SLUG.VARIOS_PROJETOS,
  kind: ContentKind.PROBLEM,
  navLabel: 'Vários projetos ao mesmo tempo',
  eyebrow: 'Operação',
  title: 'Como gerenciar vários projetos ao mesmo tempo sem perder a margem de vista',
  seoTitle: 'Como gerenciar vários projetos ao mesmo tempo | Origami Pulse',
  description:
    'O problema de tocar muitos projetos não é o número: é a mesma equipe dividida entre eles. Veja como ler capacidade, priorizar por margem e enxergar o portfólio inteiro em uma tela.',
  lead:
    'Gerenciar vários projetos ao mesmo tempo é, na prática, gerenciar uma coisa só: a capacidade da equipe que é compartilhada entre eles. O erro que derruba empresas de serviços não é aceitar projetos demais — é aceitar sem enxergar quanto da capacidade já está comprometida. Quando cada projeto é acompanhado em sua própria planilha, ninguém consegue responder a única pergunta que importa: quanto ainda cabe, e a que custo.',
  sections: [
    {
      title: 'O gargalo não é o projeto, é a pessoa',
      paragraphs: [
        'Projeto não consome projeto: consome hora de gente específica. Um portfólio com oito projetos saudáveis no papel pode estar inviável porque seis deles dependem do mesmo especialista no mesmo mês.',
        'Por isso a leitura útil não é por projeto, é por pessoa e mês: somando as horas planejadas de uma pessoa em todos os projetos e comparando com a capacidade dela naquele mês.',
      ],
      table: {
        caption: 'Exemplo de leitura de capacidade em um mês de 152 horas úteis',
        head: ['Pessoa', 'Alocado no mês', 'Capacidade', 'Leitura'],
        rows: [
          ['Especialista', '186 h', '152 h', 'Sobrecarga de 34 h: atraso já contratado'],
          ['Pleno A', '145 h', '152 h', 'Saudável'],
          ['Pleno B', '92 h', '152 h', 'Ociosidade de 60 h: custo sem receita'],
        ],
      },
    },
    {
      title: 'Três leituras que substituem dez planilhas',
      paragraphs: [
        'Quem toca muitos projetos não precisa de mais detalhe: precisa de menos telas. Três leituras resolvem a maior parte das decisões semanais.',
      ],
      bullets: [
        'Capacidade por pessoa e mês: quem está sobrecarregado e quem está ocioso, antes do mês virar.',
        'Consumo contra orçado por projeto: quais projetos estão comendo mais horas do que venderam, enquanto ainda dá para agir.',
        'Margem realizada do portfólio: quais clientes e projetos sustentam a empresa e quais estão sendo subsidiados pelos outros.',
      ],
    },
    {
      title: 'Priorizar por margem, não por barulho',
      paragraphs: [
        'Sem número, a priorização acontece por quem reclama mais alto — e o cliente que reclama mais alto raramente é o mais rentável. Com margem realizada por projeto, a conversa de prioridade muda: deixa de ser sobre urgência percebida e passa a ser sobre o que a empresa ganha ou perde em cada escolha.',
        'Isso não significa abandonar projeto de margem baixa. Significa saber que ele é de margem baixa e decidir conscientemente o que fazer: renegociar, reduzir escopo, ou aceitar como investimento em uma conta estratégica.',
      ],
    },
    {
      title: 'O custo de trocar de contexto',
      paragraphs: [
        'Uma pessoa dividida entre cinco projetos no mesmo mês não entrega a mesma coisa que cinco pessoas dedicadas a um cada. Cada troca de contexto custa tempo de retomada que não aparece em lugar nenhum — e aparece, no fim, como horas apontadas acima do estimado.',
        'A regra prática que costuma funcionar é limitar quantos projetos simultâneos uma mesma pessoa carrega, em vez de limitar quantos projetos a empresa aceita. O limite no lugar certo protege a entrega sem travar o comercial.',
      ],
    },
    {
      title: 'Como o Origami Pulse organiza isso',
      paragraphs: [
        'O Pulse coloca a alocação por pessoa, projeto e mês na mesma base do apontamento de horas: o planejado e o realizado convivem, em vez de morarem em arquivos diferentes. O portfólio mostra os projetos ativos com receita, custo das horas e margem, e o pipeline comercial mostra o que está por vir — que é o que permite decidir se cabe mais um.',
        'A pergunta "quanto ainda cabe" deixa de depender de memória e passa a ter resposta na tela.',
      ],
    },
  ],
  faq: [
    {
      question: 'Quantos projetos uma pessoa consegue tocar ao mesmo tempo?',
      answer:
        'Não há número universal, mas a troca de contexto cobra caro: cada projeto extra adiciona tempo de retomada que não é faturável. A prática que costuma funcionar é limitar os projetos simultâneos por pessoa, e não o total de projetos da empresa, acompanhando se as horas apontadas passam a superar as estimadas.',
    },
    {
      question: 'Como saber se posso aceitar mais um projeto?',
      answer:
        'Some as horas já planejadas de cada pessoa nos meses do novo projeto e compare com a capacidade delas nesses meses. Se as pessoas necessárias já estão comprometidas, aceitar significa atrasar algo que já foi vendido — ou contratar.',
    },
    {
      question: 'Como priorizar entre projetos que estão todos atrasados?',
      answer:
        'Por impacto financeiro e contratual, não por urgência percebida. Margem realizada, valor em risco e compromisso de prazo formal são critérios verificáveis; "o cliente ligou nervoso" não é.',
    },
    {
      question: 'Planilha resolve o controle de vários projetos?',
      answer:
        'Resolve enquanto os projetos não compartilham pessoas. A partir do momento em que a mesma equipe atende vários projetos, a planilha por projeto não consegue responder quanto da capacidade total já está comprometida — e é exatamente essa a pergunta que importa.',
    },
  ],
  related: [SLUG.ALOCACAO, SLUG.MARGEM, SLUG.CONTROLE_HORAS],
  publishedAt: PUBLICADO,
  updatedAt: PUBLICADO,
};

export const ARTICLE_PAGES: readonly ContentPage[] = [horasUteis, scopeCreep, precificarSoftware, reajuste, variosProjetos];
