import type { ProductNewsEdition } from '@/types/productNews';

/**
 * Edição vigente das novidades do produto (ADR-0048).
 *
 * Para anunciar a próxima entrega, troque esta edição inteira e dê a ela uma `version`
 * nova: quem leu a anterior vê a nova uma vez, e quem não leu a anterior deixa de vê-la.
 * Cada tópico responde duas perguntas, nesta ordem: por que existe, e o que dá para fazer.
 * Só anuncie o que já está no ar para a pessoa — o tópico é recortado pela capacidade.
 */
export const CURRENT_PRODUCT_NEWS: ProductNewsEdition = {
  version: 'outlook-2026-10',
  publishedAt: '2026-10-21T12:00:00-03:00',
  label: 'Novidade',
  title: 'Seu Outlook agora está no Pulse',
  summary:
    'Aconteceu uma decisão importante e ela está num e-mail? Registre no projeto e tenha rastreabilidade. E a agenda da Microsoft vem junto.',
  art: 'outlook',
  call: { label: 'Abrir E-mails', href: '/meus-emails' },
  topics: [
    {
      id: 'emails',
      icon: 'mail',
      title: 'E-mails do Outlook no menu',
      reason:
        'Decisão importante muitas vezes chega por e-mail. Com a caixa de entrada dentro do Pulse, o e-mail que decidiu algo vai para o projeto em um clique, sem copiar e colar, e o resto do dia a dia fica ao lado do timesheet e dos projetos.',
      features: [
        'Prioritários e Outros, a mesma separação do Outlook.',
        'Busca por remetente, assunto e conteúdo em toda a caixa de entrada.',
        'Anexos para baixar ou abrir, e as imagens do corpo do e-mail.',
        'Convite de reunião respondido ali mesmo: aceitar, provisório ou recusar.',
        'Ninguém mais vê a sua caixa: o Pulse lê com a sua própria conta Microsoft.',
      ],
    },
    {
      id: 'emails-no-projeto',
      icon: 'folder-input',
      title: 'Decisões por e-mail ficam no projeto',
      reason:
        'Aconteceu uma decisão importante e ela está no e-mail? Registre no projeto para ter rastreabilidade: quem decidiu, quando e com que palavras fica guardado onde a equipe trabalha, e não só na caixa de quem recebeu. Quando alguém perguntar "quem decidiu isso?", a resposta está no projeto.',
      features: [
        'Em qualquer e-mail, "Salvar no projeto" guarda uma cópia nos projetos em que você está.',
        'Uma frase opcional diz o que foi decidido e aparece em destaque.',
        'A equipe do projeto lê na aba E-mails, inclusive quem não recebeu a mensagem.',
        'Os anexos podem ir junto para a pasta do projeto no OneDrive.',
      ],
      requiresCapability: 'email-projeto:ler',
    },
    {
      id: 'agenda',
      icon: 'calendar',
      title: 'Agenda do Outlook no menu',
      reason:
        'O dia de quem toca projeto é feito de reuniões. Ver e marcar compromissos sem sair do Pulse junta a agenda ao lugar onde o trabalho é registrado.',
      features: [
        'Calendário do mês, e a agenda do dia no Dashboard com o botão para entrar no Teams.',
        'Novo compromisso com convidados, local, reunião do Teams e repetição.',
        'Editar, cancelar ou recusar: os convidados são avisados pelo próprio Outlook.',
        'Reunião ligada a um rito do projeto (daily, planning, review, retro), para o acompanhamento dos ritos.',
      ],
    },
    {
      id: 'conectar',
      icon: 'plug',
      title: 'Como conectar',
      reason:
        'O Pulse usa a sua conta Microsoft, com a sua autorização. Ele enxerga só o que você já enxerga no Outlook.',
      features: [
        'Abra E-mails ou Agenda e clique em "Conectar conta Microsoft".',
        'Autorize uma vez; a conexão fica guardada neste navegador.',
        'Se a Microsoft pedir aprovação de um administrador, fale com quem cuida do Microsoft 365 da empresa.',
      ],
    },
    {
      id: 'dashboard',
      icon: 'dashboard',
      title: 'Um Dashboard para todo mundo',
      reason:
        'O painel separado de administração deixava quem administra longe da própria agenda e das tarefas. Agora todo mundo começa o dia pela mesma tela.',
      features: [
        'Agenda do dia, tarefas, notificações recentes e seus projetos.',
        'Receita e custos continuam em Análises, e a folha em Pessoas.',
        'O endereço antigo do painel leva ao Dashboard.',
      ],
      requiresCapability: 'configuracao:editar',
    },
  ],
};
