/**
 * Identidade e oferta do site público. Vive fora de `content.ts` para que o conteúdo
 * das páginas (`pages.ts`) e a copy da home importem daqui sem ciclo.
 */

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
