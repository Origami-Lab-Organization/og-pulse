import type { ProductNewsEdition } from '@/types/productNews';

/**
 * Edição vigente das novidades do produto (ADR-0048).
 *
 * Para anunciar a próxima entrega, troque esta edição inteira e dê a ela uma `version`
 * nova: quem leu a anterior vê a nova uma vez, e quem não leu a anterior deixa de vê-la.
 * Cada tópico responde duas perguntas, nesta ordem: por que existe, e o que dá para fazer.
 * Só anuncie o que já está no ar para a pessoa — o tópico é recortado pela capacidade.
 *
 * Histórico: `outlook-2026-10` (e-mail, agenda e e-mail salvo no projeto) foi substituída por
 * `meu-espaco-2026-10`, que reunia tudo o que saiu em 21/10/2026. Esta, de 22/10, abre com as
 * reuniões e mantém os tópicos de ontem: publicada um dia depois, tiraria a novidade de quem
 * ainda não tinha entrado.
 */
export const CURRENT_PRODUCT_NEWS: ProductNewsEdition = {
  version: 'reunioes-2026-10',
  publishedAt: '2026-10-22T09:00:00-03:00',
  label: 'Novidades',
  title: 'Reunião do projeto agora vira registro',
  summary:
    'A transcrição das reuniões do Teams chega sozinha no projeto, com quem falou e quando, e a equipe completa com o resumo. E tudo o que saiu ontem continua aqui.',
  art: 'reunioes',
  topics: [
    {
      id: 'reunioes',
      icon: 'audio-lines',
      title: 'Reuniões do Teams transcritas no projeto',
      reason:
        'O que se decide numa reunião some da memória em poucos dias, e a ata, quando existe, é escrita à mão depois. Agora a conversa fica registrada no projeto sem ninguém precisar operar nada.',
      features: [
        'Na Agenda, crie a reunião do Teams escolhendo o projeto — rito ou não. Ela já sai gravando, transcrevendo e em português.',
        'Uns 10 a 20 minutos depois de acabar, a transcrição aparece na aba Reuniões do projeto, com o nome de quem falou e a hora de cada fala. Você recebe um aviso no sino.',
        'Reunião que você já organizou também vale: abra na Agenda e use "Vincular a um projeto".',
        'Busque no que foi dito em todas as reuniões do projeto, e baixe a transcrição em .txt.',
      ],
      requiresCapability: 'transcricao:ler',
    },
    {
      id: 'resumo-da-reuniao',
      icon: 'notebook-text',
      title: 'Resumo da reunião feito com a sua IA',
      reason:
        'Transcrição é longa; o que a equipe precisa é das decisões e dos próximos passos. Cada pessoa já usa a sua IA — o Pulse guarda o resultado onde o projeto mora.',
      features: [
        'Na reunião, use "Copiar transcrição", peça o resumo à sua IA e cole em "Resumo e notas" — ou importe o arquivo .md ou .txt que ela gerou.',
        'O resumo aparece formatado e no cartão da reunião, e fica registrado quem trouxe e quando.',
        'O filtro "Sem resumo" mostra as reuniões transcritas que ainda esperam o resumo.',
        'Reunião sem transcrição também tem notas: a pauta antes, a ata depois.',
      ],
      requiresCapability: 'transcricao:ler',
    },
    {
      id: 'notas',
      icon: 'notebook',
      title: 'Notas no topo da tela',
      reason:
        'Anotação solta se perde: no papel, no bloco do celular, no meio de uma conversa. Agora ela fica no Pulse, a um clique de qualquer tela, e dá para dividir com quem precisa.',
      features: [
        'Escreva, fixe no topo e encontre pela busca.',
        'Compartilhe com pessoas escolhidas ou com a empresa inteira: quem recebe lê, só você edita.',
        'Anexe arquivos de até 10 MB.',
        'Quem recebe uma nota é avisado no sino e abre direto nela.',
      ],
      requiresCapability: 'nota:usar',
    },
    {
      id: 'sino',
      icon: 'bell',
      title: 'Notificações no sino',
      reason:
        'O aviso que importava ficava na Caixa de Entrada, e pouca gente passava por lá. Agora ele aparece no topo, em qualquer tela.',
      features: [
        'Contador de não lidas, atualizado na hora.',
        'Abra a notificação e vá direto para a tela dela.',
        'Marque todas como lidas, ou abra a Caixa de Entrada para ver tudo.',
      ],
    },
    {
      id: 'meu-kanban',
      icon: 'kanban',
      title: 'Meu Kanban do seu jeito, com lembrete',
      reason:
        'O Meu Kanban tinha três colunas fixas e nenhum lembrete: quem marcava um compromisso precisava lembrar sozinho. Agora ele se organiza como você trabalha e avisa na hora certa.',
      features: [
        'Crie, renomeie e pinte as colunas, a partir de A fazer, Fazendo e Feito.',
        'Prazo com dia e hora, e lembrete no sino e por e-mail; no navegador e no celular, se você ativar.',
        'Card ligado a um projeto vira atividade dele, e mover no seu kanban move no do projeto.',
        'Filtre por projeto; o que está feito há 14 dias sai do quadro sozinho, e dá para trazer de volta.',
        'Fica em Meu Espaço, no menu.',
      ],
    },
    {
      id: 'emails-no-projeto',
      icon: 'folder-input',
      title: 'Decisões por e-mail ficam no projeto',
      reason:
        'Aconteceu uma decisão importante e ela está no e-mail? Registre no projeto para ter rastreabilidade: quem decidiu, quando e com que palavras fica guardado onde a equipe trabalha, e não só na caixa de quem recebeu.',
      features: [
        'Em qualquer e-mail, "Salvar no projeto" guarda uma cópia nos projetos em que você está.',
        'Uma frase opcional diz o que foi decidido e aparece em destaque.',
        'A equipe do projeto lê na aba E-mails, inclusive quem não recebeu a mensagem.',
        'Os anexos podem ir junto para a pasta do projeto no OneDrive.',
      ],
      requiresCapability: 'email-projeto:ler',
    },
    {
      id: 'emails',
      icon: 'mail',
      title: 'E-mails do Outlook',
      reason:
        'Decisão importante muitas vezes chega por e-mail. Com a caixa de entrada dentro do Pulse, o e-mail que decidiu algo vai para o projeto em um clique, e o resto do dia a dia fica ao lado do timesheet e dos projetos.',
      features: [
        'Prioritários e Outros, a mesma separação do Outlook, com busca em toda a caixa.',
        'Anexos para baixar ou abrir, e as imagens do corpo do e-mail.',
        'Convite de reunião respondido ali mesmo: aceitar, provisório ou recusar.',
        'Ninguém mais vê a sua caixa: o Pulse lê com a sua própria conta Microsoft.',
        'Fica em Meu Espaço. Na primeira vez, clique em "Conectar conta Microsoft"; se a Microsoft pedir aprovação de um administrador, fale com quem cuida do Microsoft 365 da empresa.',
      ],
    },
    {
      id: 'agenda',
      icon: 'calendar',
      title: 'Agenda do Outlook',
      reason:
        'O dia de quem toca projeto é feito de reuniões. Ver e marcar compromissos sem sair do Pulse junta a agenda ao lugar onde o trabalho é registrado.',
      features: [
        'Calendário do mês, e a agenda do dia no Dashboard com o botão para entrar no Teams.',
        'Novo compromisso com convidados, local, reunião do Teams e repetição.',
        'Editar, cancelar ou recusar: os convidados são avisados pelo próprio Outlook.',
        'Reunião ligada a um projeto, como rito (daily, planning, review, retro) ou não — e a transcrição dela vai para o projeto.',
        'Fica em Meu Espaço, com a mesma conexão da conta Microsoft dos e-mails.',
      ],
    },
    {
      id: 'produtos',
      icon: 'package',
      title: 'Produtos internos',
      reason:
        'O Pulse e o Harness são produtos da casa, mas estavam cadastrados como projeto de cliente, e as horas deles contavam como trabalho vendido. Agora eles têm lugar próprio, e dá para ver quanto já investimos em cada um.',
      features: [
        'Projetos → Produtos: responsável, equipe, horas investidas e, para quem vê o financeiro, o custo delas.',
        'O próximo marco do roadmap e a última release de cada produto.',
        'Produto não tem cliente nem faturamento, e as horas vão para o centro Projeto Interno.',
        'Novo produto pelo botão da própria tela, ou pelo campo Tipo no cadastro do projeto.',
      ],
      requiresCapability: 'produto:ler',
    },
  ],
};
