import type { ProjectKind } from '@/types/projectKind';

/** Tipos de projeto (ADR-0035 e ADR-0049). Regras em `@/lib/projectKind`. */
export const PROJECT_KIND = {
  CLIENT: 'cliente',
  INTERNAL: 'interno',
  PRODUCT: 'produto',
} as const;

export const PROJECT_KIND_LABEL: Record<ProjectKind, string> = {
  [PROJECT_KIND.CLIENT]: 'Projeto de cliente',
  [PROJECT_KIND.INTERNAL]: 'Projeto interno',
  [PROJECT_KIND.PRODUCT]: 'Produto interno',
};
