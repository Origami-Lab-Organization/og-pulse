import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  BarChart3,
  Kanban,
  FolderKanban,
  FolderOpen,
  ChevronDown,
  Database,
  Timer,
  Users,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { UserMenu } from './UserMenu';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';

type LinkItem = {
  kind: 'link';
  title: string;
  url: string;
  icon: React.ElementType;
  requiresManager?: boolean;
  requiresAdmin?: boolean;
  employeeOnly?: boolean;
  notForAdmin?: boolean;
  /** Só aparece rodando local (`npm run dev`) — escondido em produção sem remover o código. */
  devOnly?: boolean;
};

type GroupItem = {
  kind: 'group';
  title: string;
  url: string;
  icon: React.ElementType;
  requiresManager?: boolean;
  requiresAdmin?: boolean;
  /** Só aparece rodando local (`npm run dev`) — escondido em produção sem remover o código. */
  devOnly?: boolean;
  children: { title: string; url: string; requiresAdmin?: boolean; requiresRH?: boolean }[];
};

type SidebarNavItem = LinkItem | GroupItem;

const NAV_ITEMS: SidebarNavItem[] = [
  { kind: 'link', title: 'Dashboard', url: '/admin-dashboard', icon: LayoutDashboard, requiresAdmin: true },
  { kind: 'link', title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, notForAdmin: true },
  { kind: 'link', title: 'Timesheet', url: '/my-timesheet', icon: Clock },
  { kind: 'link', title: 'Agenda', url: '/minha-agenda', icon: CalendarDays, devOnly: true },
  { kind: 'link', title: 'Meus Projetos', url: '/my-projects', icon: FolderOpen, employeeOnly: true },
  { kind: 'link', title: 'Pipeline', url: '/pipeline', icon: Kanban, requiresManager: true },
  { kind: 'link', title: 'Projetos', url: '/projetos', icon: FolderKanban, requiresManager: true },
  {
    kind: 'group',
    title: 'Análises',
    url: '/analises/alocacoes',
    icon: BarChart3,
    requiresManager: true,
    children: [
      { title: 'Alocações', url: '/analises/alocacoes' },
      { title: 'Financeiro', url: '/analises/financeiro' },
      { title: 'Comercial', url: '/analises/comercial' },
      { title: 'Custo x Hora', url: '/analises/custo-hora', requiresAdmin: true },
    ],
  },
  {
    kind: 'group',
    title: 'Cadastros',
    url: '/clients',
    icon: Database,
    requiresManager: true,
    children: [
      { title: 'Serviços', url: '/comercial/servicos', requiresAdmin: true },
      { title: 'Clientes', url: '/clients' },
    ],
  },
  {
    kind: 'group',
    title: 'Pessoas',
    url: '/analises/folha-pagamento',
    icon: Users,
    requiresAdmin: true,
    children: [
      { title: 'Funcionários', url: '/employees', requiresAdmin: true },
      { title: 'Folha de Pagamento', url: '/analises/folha-pagamento' },
      { title: 'Desligamentos', url: '/rh/desligamentos' },
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
      { title: 'Aprovações', url: '/jornada/aprovacoes', requiresAdmin: true },
      { title: 'Relatórios', url: '/jornada/relatorios', requiresRH: true },
      { title: 'Auditoria', url: '/jornada/auditoria', requiresRH: true },
      { title: 'Configurações', url: '/jornada/configuracoes', requiresAdmin: true },
    ],
  },
];

function isChildActive(url: string, pathname: string) {
  return pathname === url || pathname.startsWith(url + '/');
}

function isGroupActive(item: GroupItem, pathname: string) {
  return item.children.some((c) => isChildActive(c.url, pathname));
}

export function AppSidebar() {
  const { state, setOpen } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { employee } = useAuth();

  const isManager = employee?.is_gerente ?? false;
  const isAdmin = employee?.isAdmin ?? false;
  const isRH = employee?.isRH ?? false;

  const homeRoute = isAdmin ? '/admin-dashboard' : '/dashboard';

  const isVisible = (item: SidebarNavItem): boolean => {
    if (item.devOnly && !import.meta.env.DEV) return false;
    if (item.requiresAdmin && !isAdmin) return false;
    if (item.requiresManager && !isManager && !isAdmin) return false;
    if (item.kind === 'link' && item.employeeOnly && (isManager || isAdmin)) return false;
    if (item.kind === 'link' && item.notForAdmin && isAdmin) return false;
    return true;
  };

  const visibleItems = NAV_ITEMS.filter(isVisible);

  // Controlled open state for group collapsibles — initialized from current route
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    NAV_ITEMS.filter((item): item is GroupItem => item.kind === 'group')
      .filter((item) => isGroupActive(item, location.pathname))
      .map((item) => item.title)
  );

  // When navigating directly to a URL inside a group (e.g. via browser back), open that group
  useEffect(() => {
    const activeGroupTitles = NAV_ITEMS.filter((item): item is GroupItem => item.kind === 'group')
      .filter((item) => isGroupActive(item, location.pathname))
      .map((item) => item.title);

    if (activeGroupTitles.length > 0) {
      setOpenGroups((prev) => [...new Set([...prev, ...activeGroupTitles])]);
    }
  }, [location.pathname]);

  const toggleGroup = (title: string, open: boolean) => {
    setOpenGroups((prev) =>
      open ? [...new Set([...prev, title])] : prev.filter((g) => g !== title)
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-0">
        {/* px-2.5 = 10px — centra ícone de 28px perfeitamente nos 48px colapsados (10+28+10) */}
        <div className="flex h-12 items-center px-2.5 gap-2 overflow-hidden">
          <button
            onClick={() => navigate(homeRoute)}
            className="shrink-0 flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:outline-none rounded-md"
          >
            <img src={logo} alt="Pulse" className="h-7 w-7 flex-shrink-0" />
            <span className={cn(
              'font-semibold text-sidebar-foreground whitespace-nowrap overflow-hidden',
              'transition-[max-width,opacity] duration-300 ease-in-out',
              collapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
            )}>
              Pulse
            </span>
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                if (item.kind === 'link') {
                  const active = isChildActive(item.url, location.pathname);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <NavLink to={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const groupActive = isGroupActive(item, location.pathname);

                if (collapsed) {
                  // Collapsed + group: expand sidebar and open this group (no navigation)
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={groupActive}
                        tooltip={item.title}
                        onClick={() => {
                          toggleGroup(item.title, true);
                          setOpen(true);
                        }}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <Collapsible
                      open={openGroups.includes(item.title)}
                      onOpenChange={(open) => toggleGroup(item.title, open)}
                      className="group/collapsible"
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          className={cn(groupActive && 'text-sidebar-accent-foreground font-medium')}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                        <SidebarMenuSub>
                          {item.children
                            .filter((child) => !child.requiresAdmin || isAdmin)
                            .filter((child) => !child.requiresRH || isRH)
                            .map((child) => (
                            <SidebarMenuSubItem key={child.url}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isChildActive(child.url, location.pathname)}
                              >
                                <NavLink to={child.url}>{child.title}</NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
