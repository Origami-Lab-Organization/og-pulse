import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  FileText,
  BarChart3,
  Truck,
  Kanban,
  Receipt,
  ChevronDown,
  FileSignature,
  DollarSign,
  Palmtree,
  LogOut,
  Briefcase,
  Inbox,
  FolderKanban,
  UserSearch,
  Target,
  KanbanSquare,
  Gift,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  disabled?: boolean;
  requiresManager?: boolean;
  requiresAdmin?: boolean;
}

const navigationGroups = [
  {
    label: 'Empresa',
    requiresAdmin: true,
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, requiresAdmin: true },
    ] as NavItem[],
  },
  {
    label: 'Meu Espaço',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
      { title: 'Caixa de Entrada', url: '/inbox', icon: Inbox },
      { title: 'Timesheet', url: '/my-timesheet', icon: Clock },
      { title: 'Meu Kanban', url: '/my-kanban', icon: KanbanSquare },
      { title: 'Meus Projetos', url: '/my-projects', icon: FolderKanban },
      { title: 'Reembolsos', url: '/reimbursements', icon: Receipt },
    ] as NavItem[],
  },
  {
    label: 'Comercial',
    requiresManager: true,
    items: [
      { title: 'Dashboard', url: '/comercial', icon: LayoutDashboard, requiresManager: true },
      { title: 'CRM', url: '/crm', icon: Kanban, requiresManager: true },
      { title: 'Serviços', url: '/comercial/servicos', icon: Briefcase, requiresManager: true },
      { title: 'Clientes', url: '/clients', icon: Building2, requiresManager: true },
    ] as NavItem[],
  },
  {
    label: 'Projetos',
    requiresManager: true,
    items: [
      { title: 'Portfólio de Projetos', url: '/portfolio', icon: Kanban, requiresManager: true },
      { title: 'Alocação da Equipe', url: '/alocacao', icon: Clock, requiresManager: true },
      { title: 'Fornecedores', url: '/suppliers', icon: Truck, requiresManager: true },
      { title: 'Analytics', url: '/analytics', icon: BarChart3, requiresManager: true },
      { title: 'Estratégia', url: '/estrategia', icon: Target, requiresManager: true },
    ] as NavItem[],
  },
  {
    label: 'Recursos Humanos',
    requiresManager: true,
    items: [
      { title: 'Candidatos', url: '/rh/candidatos', icon: UserSearch, requiresManager: true },
      { title: 'Funcionários', url: '/employees', icon: Users, requiresAdmin: true },
      { title: 'Ferramentas e Benefícios', url: '/rh/ferramentas-beneficios', icon: Gift, requiresAdmin: true },
      { title: 'Contratos', url: '/rh/contratos', icon: FileSignature, requiresAdmin: true, disabled: true },
      { title: 'Folha de Pagamento', url: '/rh/folha', icon: DollarSign, requiresAdmin: true, disabled: true },
      { title: 'Férias e Afastamentos', url: '/rh/ferias', icon: Palmtree, requiresAdmin: true, disabled: true },
      { title: 'Desligamentos', url: '/rh/desligamentos', icon: LogOut, requiresAdmin: true },
      { title: 'Relatórios', url: '/rh/relatorios', icon: BarChart3, requiresAdmin: true, disabled: true },
    ] as NavItem[],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { employee } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const isManager = employee?.is_gerente ?? false;
  const isAdmin = employee?.isAdmin ?? false;

  const renderNavItem = (item: NavItem) => {
    // Hide items that require admin if user is not an admin
    if (item.requiresAdmin && !isAdmin) {
      return null;
    }

    // Hide items that require manager if user is not a manager or admin
    if (item.requiresManager && !isManager && !isAdmin) {
      return null;
    }

    const content = (
      <SidebarMenuButton
        asChild={!item.disabled}
        isActive={isActive(item.url)}
        className={cn(
          item.disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {item.disabled ? (
          <div className="flex items-center gap-3">
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </div>
        ) : (
          <NavLink 
            to={item.url} 
            className="flex items-center gap-3"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
          >
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        )}
      </SidebarMenuButton>
    );

    if (item.disabled) {
      return (
        <Tooltip key={item.title}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Em breve</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <img src={logo} alt="Origami Pulse" className="h-8 w-8 flex-shrink-0" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">Origami Pulse</span>
              <span className="text-xs text-sidebar-foreground/70">Gestão de Equipes</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigationGroups.map((group) => {
          // Check group-level permissions
          const groupConfig = group as { requiresAdmin?: boolean; requiresManager?: boolean };
          if (groupConfig.requiresAdmin && !isAdmin) return null;
          if (groupConfig.requiresManager && !isManager && !isAdmin) return null;
          
          // Filter out items that require manager or admin access
          const visibleItems = group.items.filter((item) => {
            if (item.requiresAdmin && !isAdmin) return false;
            if (item.requiresManager && !isManager && !isAdmin) return false;
            return true;
          });
          
          if (visibleItems.length === 0) return null;

          return (
            <Collapsible key={group.label} defaultOpen className="group/collapsible">
              <SidebarGroup>
                {!collapsed && (
                  <SidebarGroupLabel asChild className="ol-label text-sidebar-foreground/50">
                    <CollapsibleTrigger className="flex w-full items-center justify-between">
                      {group.label}
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                )}
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          {renderNavItem(item)}
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

    </Sidebar>
  );
}
