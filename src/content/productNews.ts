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
 * `meu-espaco-2026-10`, que reunia tudo o que saiu em 21/10/2026, e esta por `reunioes-2026-10`,
 * só com a transcrição das reuniões e o resumo da equipe (22/10/2026).
 */
export const CURRENT_PRODUCT_NEWS: ProductNewsEdition = {
  version: 'reunioes-2026-10',
  publishedAt: '2026-10-22T09:00:00-03:00',
  label: 'Novidades',
  title: 'Reunião do projeto agora vira registro',
  summary:
    'A transcrição das reuniões do Teams chega sozinha no projeto, com quem falou e quando, e a equipe completa com o resumo.',
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
        'Na reunião, "Copiar para a IA" leva a transcrição junto com as instruções para notas por assunto, com decisões e próximos passos. Cole na IA que você usa e traga as notas para "Resumo e notas" — ou importe o arquivo .md ou .txt.',
        'O resumo aparece formatado e no cartão da reunião, e fica registrado quem trouxe e quando.',
        'O filtro "Sem resumo" mostra as reuniões transcritas que ainda esperam o resumo.',
        'Reunião sem transcrição também tem notas: a pauta antes, a ata depois.',
      ],
      requiresCapability: 'transcricao:ler',
    },
  ],
};
