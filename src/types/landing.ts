import type { ReactNode } from 'react';

/** Contratos da landing page pública (ver `src/landing/content.ts`). */

export type FeatureIcon = 'TrendingUp' | 'FolderKanban' | 'Users' | 'FileText' | 'Clock' | 'Shield';

export interface Feature {
  /** Nome do ícone do lucide-react; a página resolve o componente. */
  icon: FeatureIcon;
  title: string;
  description: string;
}

export interface ComparisonRow {
  topic: string;
  spreadsheets: string;
  pulse: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** Página pública pré-renderizada no build. `indexable: false` = `noindex` e fora do sitemap. */
export interface ContentTable {
  caption: string;
  head: readonly string[];
  rows: readonly (readonly string[])[];
}

export interface ContentSection {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  table?: ContentTable;
}

/** Intenção de busca da página de conteúdo. Comparar sempre pelo membro. */
export const ContentKind = {
  DEFINITION: 'definition',
  PROBLEM: 'problem',
  PERSONA: 'persona',
  GUIDE: 'guide',
} as const;
export type ContentKind = (typeof ContentKind)[keyof typeof ContentKind];

/** Página pública de conteúdo (SEO/GEO), pré-renderizada no build. Ver `src/landing/pages.ts`. */
export interface ContentPage {
  /** Caminho absoluto, ex.: `/o-que-e-psa`. */
  slug: string;
  kind: ContentKind;
  /** Rótulo curto para rodapé e links relacionados. */
  navLabel: string;
  eyebrow: string;
  /** `<h1>`. */
  title: string;
  seoTitle: string;
  description: string;
  /** Resposta direta no primeiro parágrafo, do jeito que um motor generativo cita. */
  lead: string;
  sections: readonly ContentSection[];
  faq: readonly FaqItem[];
  /** Slugs de outras páginas de conteúdo. */
  related: readonly string[];
  /** ISO `YYYY-MM-DD`. */
  updatedAt: string;
}

export interface ContentPageProps {
  page: ContentPage;
}

export interface PublicRoute {
  path: string;
  title: string;
  description: string;
  indexable: boolean;
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: string;
}

export interface LegalSection {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
}

export interface LegalDocument {
  title: string;
  lead: string;
  /** ISO `YYYY-MM-DD`. */
  updatedAt: string;
  sections: readonly LegalSection[];
}

export interface LegalPageProps {
  document: LegalDocument;
}

export interface PublicPageProps {
  children: ReactNode;
  mainClassName?: string;
}

/**
 * Estados do tsuru (PUL-252). Sem estado, nada anima — é como a 404 o usa, onde a flutuação
 * vem do CSS da landing.
 */
export const CraneState = {
  /** Pousado: só a respiração, para não parecer figura colada. */
  RESTING: 'resting',
  /** Voando: asas batendo, usado no deslocamento entre passos do tour. */
  FLYING: 'flying',
  /** Um giro, uma vez. Marca passo concluído. */
  CELEBRATING: 'celebrating',
} as const;
export type CraneState = (typeof CraneState)[keyof typeof CraneState];

/** Micro-gestos em repouso. Sorteados pelo componente; ninguém de fora escolhe. */
export const CraneGesture = {
  /** Vira a cabeça, como quem olha para o lado. */
  LOOK: 'look',
  /** Uma batida de asa, sem sair do lugar. */
  FLAP: 'flap',
} as const;
export type CraneGesture = (typeof CraneGesture)[keyof typeof CraneGesture];

export interface OrigamiCraneProps {
  className?: string;
  state?: CraneState;
  /** Dobra-se a partir do papel ao montar. Uma vez só, por instância. */
  entrance?: boolean;
}

export type JsonLd = Record<string, unknown>;

export type SpotlightMock = 'pipeline' | 'allocation' | 'margin';

export interface Spotlight {
  eyebrow: string;
  title: string;
  description: string;
  bullets: readonly string[];
  mock: SpotlightMock;
}

export interface HeroStat {
  value: string;
  label: string;
}

/** Ícones da seção de conexão com IA; a página resolve o componente. */
export type AiPillarIcon = 'MessageSquare' | 'Clock' | 'ShieldCheck';

export interface AiPillar {
  icon: AiPillarIcon;
  title: string;
  description: string;
}

/** Seção "Conexão com IA" da landing (PUL-254). */
export interface AiConnection {
  eyebrow: string;
  title: string;
  /** Trecho do título em destaque. */
  accent: string;
  description: string;
  pillars: readonly AiPillar[];
  examplesTitle: string;
  examples: readonly string[];
  note: string;
  cta: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: readonly FooterLink[];
}

/** Tom visual dos mockups e selos. Comparar sempre pelo membro. */
export const MockTone = {
  SUCCESS: 'success',
  WARNING: 'warning',
  PRIMARY: 'primary',
} as const;
export type MockTone = (typeof MockTone)[keyof typeof MockTone];

export interface MockFrameProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export interface FloatingBadgeProps {
  label: string;
  value: string;
  tone?: MockTone;
}

export interface Pain {
  title: string;
  description: string;
}

export interface EyebrowProps {
  children: string;
  className?: string;
}

export interface SiteHeaderProps {
  scrolled: boolean;
  /** Superfície sólida desde o topo (páginas sem hero escuro por baixo do cabeçalho). */
  solid?: boolean;
}

export interface ScrollProgressProps {
  progress: number;
}

export interface SpotlightRowProps {
  item: Spotlight;
  index: number;
}
