/** Como a pessoa saiu do anúncio de novidade (ADR-0048) — vai para o Amplitude. */
export const PRODUCT_NEWS_ACTION = {
  CONTINUE: 'continuar',
  CALL: 'chamada',
  CLOSE: 'fechar',
  OUTSIDE: 'fora',
} as const;

/** Eventos no Amplitude — os mesmos nomes do aviso de novidades do Projete. */
export const PRODUCT_NEWS_EVENT = {
  SHOWN: 'novidade_exibida',
  TOPIC_OPENED: 'novidade_topico_aberto',
  ANSWERED: 'novidade_respondida',
} as const;

/** Teto de `segundos` no evento: aba esquecida aberta não pode distorcer a média. */
export const PRODUCT_NEWS_MAX_SECONDS = 600;

/** De onde o anúncio abriu: sozinho na entrada, ou pela Central de Ajuda. */
export const PRODUCT_NEWS_ORIGIN = {
  ENTRY: 'entrada',
  HELP: 'ajuda',
} as const;
