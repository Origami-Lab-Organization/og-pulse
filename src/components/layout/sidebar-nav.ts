import {
  BarChart3,
  CalendarDays,
  Clock,
  Database,
  FolderKanban,
  FolderOpen,
  Kanban,
  LayoutDashboard,
  Mail,
  Settings,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { CapabilityRequirement } from '@/lib/access/capabilities';

/**
 * Menu lateral: cada item aponta para a capacidade cujo conjunto de papéis reproduz o
 * acesso que a rota já tinha (dia 1 = dia 0, ADR-0027). Mudar quem vê um item é ligar ou
 * desligar a capacidade no perfil — não é editar este arquivo. A rota correspondente exige
 * a mesma capacidade em `App.tsx`; a policy de RLS é a barreira de verdade.
 */
export type NavChild = {
  title: string;
  url: string;
  requiresCapability?: CapabilityRequirement;
};

export type LinkItem = {
  kind: 'link';
  title: string;
  url: string;
  icon: LucideIcon;
  requiresCapability?: CapabilityRequirement;
  /**
   * Resíduo do modelo por papel — só as entradas de configuração do tenant, até existir
   * `configuracao:editar` (TD-0019). Não usar em item novo.
   */
  requiresAdmin?: boolean;
  /** Esconde de quem TEM a capacidade (ex.: "Meus Projetos" para quem já vê o Portfólio). */
  hiddenWhenCan?: CapabilityRequirement;
  /** Home do funcionário; admin tem a própria. Identidade de tela, não permissão. */
  notForAdmin?: boolean;
  /** Só aparece rodando local (`npm run dev`) — escondido em produção sem remover o código. */
  devOnly?: boolean;
};

export type GroupItem = {
  kind: 'group';
  title: string;
  url: string;
  icon: LucideIcon;
  /** Só aparece rodando local (`npm run dev`) — escondido em produção sem remover o código. */
  devOnly?: boolean;
  /** O grupo aparece quando alguma filha aparece. */
  children: NavChild[];
};

export type SidebarNavItem = LinkItem | GroupItem;

export interface NavVisibilityContext {
  can: (required: CapabilityRequirement) => boolean;
  isAdmin: boolean;
  isDev: boolean;
}

export const NAV_ITEMS: SidebarNavItem[] = [
  { kind: 'link', title: 'Dashboard', url: '/admin-dashboard', icon: LayoutDashboard, requiresAdmin: true },
  { kind: 'link', title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, notForAdmin: true },
  { kind: 'link', title: 'Timesheet', url: '/my-timesheet', icon: Clock },
  { kind: 'link', title: 'Agenda', url: '/minha-agenda', icon: CalendarDays, devOnly: true },
  { kind: 'link', title: 'E-mails', url: '/meus-emails', icon: Mail, devOnly: true },
  { kind: 'link', title: 'Meus Projetos', url: '/my-projects', icon: FolderOpen, hiddenWhenCan: 'portfolio:ler' },
  { kind: 'link', title: 'Pipeline', url: '/pipeline', icon: Kanban, requiresCapability: 'pipeline:ler' },
  {
    kind: 'group',
    title: 'Projetos',
    url: '/projetos',
    icon: FolderKanban,
    children: [
      { title: 'Portfólio', url: '/projetos', requiresCapability: 'portfolio:ler' },
      { title: 'Alocações', url: '/projetos/alocacoes', requiresCapability: 'alocacao:ler' },
    ],
  },
  {
    kind: 'group',
    title: 'Análises',
    url: '/analises/meu-time',
    icon: BarChart3,
    children: [
      { title: 'Meu Time', url: '/analises/meu-time', requiresCapability: 'timesheet-terceiro:ler' },
      { title: 'Financeiro', url: '/analises/financeiro', requiresCapability: 'financeiro:ler' },
      { title: 'Comercial', url: '/analises/comercial', requiresCapability: 'pipeline:ler' },
      { title: 'Custo x Hora', url: '/analises/custo-hora', requiresCapability: 'custo-hora:ler-relatorio' },
    ],
  },
  {
    kind: 'group',
    title: 'Cadastros',
    url: '/clients',
    icon: Database,
    children: [
      { title: 'Serviços', url: '/comercial/servicos', requiresCapability: 'catalogo:editar' },
      { title: 'Clientes', url: '/clients', requiresCapability: 'cliente:ler' },
    ],
  },
  {
    kind: 'group',
    title: 'Pessoas',
    url: '/employees',
    icon: Users,
    children: [
      { title: 'Funcionários', url: '/employees', requiresCapability: 'pessoa:ler-ficha-completa' },
      { title: 'Folha de Pagamento', url: '/analises/folha-pagamento', requiresCapability: 'folha:ler' },
      { title: 'Desligamentos', url: '/rh/desligamentos', requiresCapability: 'desligamento:executar' },
    ],
  },
  {
    kind: 'group',
    title: 'Ponto Eletrônico',
    url: '/jornada',
    icon: Timer,
    devOnly: true,
    children: [
      { title: 'Meu Ponto', url: '/jornada' },
      { title: 'Aprovações', url: '/jornada/aprovacoes', requiresCapability: 'ponto:aprovar' },
      { title: 'Relatórios', url: '/jornada/relatorios', requiresCapability: 'ponto:ler-relatorio' },
      { title: 'Auditoria', url: '/jornada/auditoria', requiresCapability: 'ponto:auditar' },
      { title: 'Configurações', url: '/jornada/configuracoes', requiresCapability: 'ponto:configurar' },
    ],
  },
  // O Portal do Admin concentra 7 abas de configuração (perfis de acesso, tabela de
  // preços, financeiro, encargos, feriados, atividades, lembretes) e só era alcançável
  // pelo menu do avatar — dois cliques, sem nada no menu lateral sugerindo que existisse.
  { kind: 'link', title: 'Configurações', url: '/admin', icon: Settings, requiresAdmin: true },
];

export function visibleChildren(item: GroupItem, ctx: NavVisibilityContext): NavChild[] {
  return item.children.filter((c) => !c.requiresCapability || ctx.can(c.requiresCapability));
}

export function isNavItemVisible(item: SidebarNavItem, ctx: NavVisibilityContext): boolean {
  if (item.devOnly && !ctx.isDev) return false;
  if (item.kind === 'group') return visibleChildren(item, ctx).length > 0;
  if (item.requiresAdmin && !ctx.isAdmin) return false;
  if (item.requiresCapability && !ctx.can(item.requiresCapability)) return false;
  if (item.hiddenWhenCan && ctx.can(item.hiddenWhenCan)) return false;
  if (item.notForAdmin && ctx.isAdmin) return false;
  return true;
}
