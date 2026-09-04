import { hasAnyCapability, type CapabilityRequirement } from '@/lib/access/capabilities';

export interface NavTab {
  title: string;
  url: string;
  /** Capacidade que governa a aba; ausente = para todo mundo autenticado. */
  requiresCapability?: CapabilityRequirement;
}

export interface NavSection {
  label: string;
  url: string;
  /** Para seção sem abas. Seção com abas aparece quando alguma aba aparece. */
  requiresCapability?: CapabilityRequirement;
  tabs?: NavTab[];
}

// Cada aba aponta para a capacidade cujo conjunto de papéis reproduz o acesso que a rota já
// tinha (dia 1 = dia 0, ADR-0027). Mudar quem vê é ligar/desligar a capacidade no perfil —
// não é editar este arquivo.
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Início',
    url: '/dashboard',
    tabs: [
      { title: 'Dashboard', url: '/dashboard' },
      { title: 'Timesheet', url: '/my-timesheet' },
    ],
  },
  {
    label: 'Pipeline',
    url: '/pipeline',
    requiresCapability: 'pipeline:ler',
  },
  {
    label: 'Projetos',
    url: '/projetos',
    tabs: [
      { title: 'Portfólio', url: '/projetos', requiresCapability: 'portfolio:ler' },
      { title: 'Alocações', url: '/projetos/alocacoes', requiresCapability: 'alocacao:ler' },
    ],
  },
  {
    label: 'Análises',
    url: '/analises/meu-time',
    tabs: [
      { title: 'Meu Time', url: '/analises/meu-time', requiresCapability: 'timesheet-terceiro:ler' },
      { title: 'Financeiro', url: '/analises/financeiro', requiresCapability: 'financeiro:ler' },
      { title: 'Comercial', url: '/analises/comercial', requiresCapability: 'pipeline:ler' },
    ],
  },
  {
    label: 'Cadastros',
    url: '/employees',
    tabs: [
      { title: 'Funcionários', url: '/employees', requiresCapability: 'pessoa:ler-ficha-completa' },
      { title: 'Serviços', url: '/comercial/servicos', requiresCapability: 'catalogo:editar' },
      { title: 'Clientes', url: '/clients', requiresCapability: 'cliente:ler' },
    ],
  },
];

export type CanFn = (required: CapabilityRequirement) => boolean;

export function visibleTabs(section: NavSection, can: CanFn): NavTab[] {
  return (section.tabs ?? []).filter((t) => !t.requiresCapability || can(t.requiresCapability));
}

export function isSectionVisible(section: NavSection, can: CanFn): boolean {
  if (section.tabs) return visibleTabs(section, can).length > 0;
  return !section.requiresCapability || can(section.requiresCapability);
}

/** Conveniência para testes e para quem só tem o conjunto de capacidades em mão. */
export function canFromCapabilities(granted: readonly string[]): CanFn {
  const set = new Set(granted);
  return (required) => hasAnyCapability(set, required);
}

export function isSectionActive(section: NavSection, pathname: string): boolean {
  if (section.tabs) {
    return section.tabs.some(
      (t) => pathname === t.url || pathname.startsWith(t.url + '/')
    );
  }
  return pathname === section.url || pathname.startsWith(section.url + '/');
}

export function getActiveTabs(pathname: string, can?: CanFn): NavTab[] | null {
  const section = NAV_SECTIONS.find(
    (s) => s.tabs && isSectionActive(s, pathname)
  );
  if (!section) return null;
  return can ? visibleTabs(section, can) : section.tabs ?? null;
}
