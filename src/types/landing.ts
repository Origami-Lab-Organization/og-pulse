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

export interface PublicRoute {
  path: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
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
}

export interface ScrollProgressProps {
  progress: number;
}

export interface SpotlightRowProps {
  item: Spotlight;
  index: number;
}
