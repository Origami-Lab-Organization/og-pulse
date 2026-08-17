export interface NavTab {
  title: string;
  url: string;
}

export interface NavSection {
  label: string;
  url: string;
  requiresManager?: boolean;
  requiresAdmin?: boolean;
  tabs?: NavTab[];
}

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
    requiresManager: true,
  },
  {
    label: 'Projetos',
    url: '/projetos',
    requiresManager: true,
  },
  {
    label: 'Análises',
    url: '/analises/meu-time',
    requiresManager: true,
    tabs: [
      { title: 'Meu Time', url: '/analises/meu-time' },
      { title: 'Financeiro', url: '/analises/financeiro' },
      { title: 'Comercial', url: '/analises/comercial' },
    ],
  },
  {
    label: 'Cadastros',
    url: '/employees',
    requiresManager: true,
    tabs: [
      { title: 'Funcionários', url: '/employees' },
      { title: 'Serviços', url: '/comercial/servicos' },
      { title: 'Clientes', url: '/clients' },
    ],
  },
];

export function isSectionActive(section: NavSection, pathname: string): boolean {
  if (section.tabs) {
    return section.tabs.some(
      (t) => pathname === t.url || pathname.startsWith(t.url + '/')
    );
  }
  return pathname === section.url || pathname.startsWith(section.url + '/');
}

export function getActiveTabs(pathname: string): NavTab[] | null {
  const section = NAV_SECTIONS.find(
    (s) => s.tabs && isSectionActive(s, pathname)
  );
  return section?.tabs ?? null;
}
