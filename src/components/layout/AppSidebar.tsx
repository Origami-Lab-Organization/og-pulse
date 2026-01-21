import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  FolderKanban, 
  Clock, 
  FileText, 
  BarChart3, 
  Settings,
  DollarSign
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';

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
  SidebarFooter,
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
    label: 'Dashboard',
    items: [
      { title: 'Visão Geral', url: '/dashboard', icon: LayoutDashboard, disabled: true },
    ] as NavItem[],
  },
  {
    label: 'Gestão',
    items: [
      { title: 'Funcionários', url: '/', icon: Users },
      { title: 'Clientes', url: '/clients', icon: Building2, requiresManager: true },
      { title: 'Projetos', url: '/projects', icon: FolderKanban, requiresManager: true },
    ] as NavItem[],
  },
  {
    label: 'Operações',
    items: [
      { title: 'Timesheets', url: '/timesheets', icon: Clock, disabled: true },
      { title: 'Orçamentos', url: '/budgets', icon: FileText, disabled: true },
      { title: 'Analytics', url: '/analytics', icon: BarChart3, disabled: true },
    ] as NavItem[],
  },
  {
    label: 'Configurações',
    items: [
      { title: 'Tabela de Preços', url: '/pricing', icon: DollarSign, requiresAdmin: true },
      { title: 'Configurações', url: '/settings', icon: Settings, requiresAdmin: true },
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
          // Filter out items that require manager or admin access
          const visibleItems = group.items.filter((item) => {
            if (item.requiresAdmin && !isAdmin) return false;
            if (item.requiresManager && !isManager && !isAdmin) return false;
            return true;
          });
          
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              {!collapsed && (
                <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      {renderNavItem(item)}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && employee && (
          <div className="px-3 py-2">
            <p className="text-xs text-sidebar-foreground/70">Logado como</p>
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {employee.nome}
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
