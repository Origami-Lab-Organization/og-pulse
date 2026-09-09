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

export interface OrigamiCraneProps {
  className?: string;
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
