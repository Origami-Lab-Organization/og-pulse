import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  Clock,
  FileText,
  BarChart3,
  Truck,
  Kanban,
  Receipt,
  Archive,
  LogOut,
  BarChart2,
  FileSignature,
  DollarSign,
  Palmtree,
} from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { useAuth } from '@/contexts/AuthContext';
import { InboxButton } from './InboxButton';
import { UserMenu } from './UserMenu';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  disabled?: boolean;
  requiresManager?: boolean;
  requiresAdmin?: boolean;
}

interface NavGroup {
  label: string;
  requiresManager?: boolean;
  requiresAdmin?: boolean;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: 'Meu Espaço',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
      { title: 'Timesheet', url: '/my-timesheet', icon: Clock },
      { title: 'Reembolsos', url: '/reimbursements', icon: Receipt },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { title: 'Análise de Mercado', url: '/marketing/analise-mercado', icon: BarChart2 },
    ],
  },
  {
    label: 'Comercial',
    requiresManager: true,
    items: [
      { title: 'Dashboard', url: '/comercial', icon: LayoutDashboard, requiresManager: true },
      { title: 'CRM', url: '/crm', icon: Kanban, requiresManager: true },
      { title: 'Clientes', url: '/clients', icon: Building2, requiresManager: true },
      { title: 'Orçamentos', url: '/budgets', icon: FileText, requiresManager: true },
      { title: 'Arquivados', url: '/crm/archived', icon: Archive, requiresManager: true },
    ],
  },
  {
    label: 'Gestão de Projetos',
    requiresManager: true,
    items: [
      { title: 'Analytics', url: '/analytics', icon: BarChart3, requiresManager: true },
      { title: 'Portfólio de Projetos', url: '/portfolio', icon: LayoutDashboard, requiresManager: true },
      { title: 'Projetos', url: '/projects', icon: FolderKanban, requiresManager: true },
      { title: 'Alocação', url: '/alocacao', icon: Clock, requiresManager: true },
      { title: 'Fornecedores', url: '/suppliers', icon: Truck, requiresManager: true },
    ],
  },
  {
    label: 'RH',
    requiresAdmin: true,
    items: [
      { title: 'Funcionários', url: '/employees', icon: Users, requiresAdmin: true },
      { title: 'Contratos', url: '/rh/contratos', icon: FileSignature, requiresAdmin: true, disabled: true },
      { title: 'Folha de Pagamento', url: '/rh/folha', icon: DollarSign, requiresAdmin: true, disabled: true },
      { title: 'Férias e Afastamentos', url: '/rh/ferias', icon: Palmtree, requiresAdmin: true, disabled: true },
      { title: 'Desligamentos', url: '/rh/desligamentos', icon: LogOut, requiresAdmin: true },
      { title: 'Relatórios', url: '/rh/relatorios', icon: BarChart3, requiresAdmin: true, disabled: true },
    ],
  },
];

export function AppNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { employee } = useAuth();

  const isManager = employee?.is_gerente ?? false;
  const isAdmin = employee?.isAdmin ?? false;

  const isActive = (path: string) => location.pathname === path;

  const filterItems = (items: NavItem[]) =>
    items.filter((item) => {
      if (item.requiresAdmin && !isAdmin) return false;
      if (item.requiresManager && !isManager && !isAdmin) return false;
      return true;
    });

  const isGroupVisible = (group: NavGroup) => {
    if (group.requiresAdmin && !isAdmin) return false;
    if (group.requiresManager && !isManager && !isAdmin) return false;
    return filterItems(group.items).length > 0;
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4 gap-4">
      {/* Logo */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 shrink-0 mr-2 hover:opacity-80 transition-opacity"
      >
        <img src={logo} alt="Pulse" className="h-7 w-7" />
        <span className="font-semibold text-foreground text-lg">Pulse</span>
      </button>

      {/* Navigation */}
      <NavigationMenu className="flex-1 max-w-none">
        <NavigationMenuList className="gap-0">
          {navigationGroups.filter(isGroupVisible).map((group) => {
            const visibleItems = filterItems(group.items);
            return (
              <NavigationMenuItem key={group.label} className="relative">
                <NavigationMenuTrigger className="h-9 px-3 text-sm font-medium bg-transparent data-[state=open]:bg-accent/50">
                  {group.label}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="absolute top-full left-0 mt-1.5 rounded-md border bg-popover text-popover-foreground shadow-lg">
                  <ul className="grid w-[220px] gap-1 p-2">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const linkContent = (
                        <li key={item.title}>
                          <button
                            disabled={item.disabled}
                            onClick={() => !item.disabled && navigate(item.url)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                              isActive(item.url)
                                ? 'bg-accent text-accent-foreground font-medium'
                                : 'hover:bg-accent/50 text-foreground',
                              item.disabled && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.title}</span>
                          </button>
                        </li>
                      );

                      if (item.disabled) {
                        return (
                          <Tooltip key={item.title}>
                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                            <TooltipContent side="right"><p>Em breve</p></TooltipContent>
                          </Tooltip>
                        );
                      }

                      return linkContent;
                    })}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>

      {/* Right side */}
      <div className="flex items-center gap-1 shrink-0">
        <InboxButton />
        <UserMenu />
      </div>
    </header>
  );
}
