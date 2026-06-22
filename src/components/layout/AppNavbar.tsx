import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  BarChart3,
  Truck,
  Kanban,
  Receipt,
  LogOut,
  FileSignature,
  DollarSign,
  Palmtree,
  Briefcase,
  Inbox,
  UserSearch,
  FolderKanban,
  LucideSquareKanban,
  ClipboardList,
  Menu,
  ChevronDown,
  Target,
} from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "./UserMenu";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  disabled?: boolean;
  requiresManager?: boolean;
  requiresAdmin?: boolean;
}

// FUNC-J2 — alvos do coachmark de onboarding (destaque por step no navbar).
const ONBOARDING_TARGETS: Record<string, string> = {
  '/inbox': 'inbox',
  '/my-kanban': 'kanban',
  '/my-projects': 'projetos',
  '/my-timesheet': 'timesheet',
  '/reimbursements': 'reembolsos',
};

interface NavGroup {
  label: string;
  requiresManager?: boolean;
  requiresAdmin?: boolean;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: "Meu Espaço",
    items: [
      {
        title: "Dashboard",
        url: "/admin-dashboard",
        icon: LayoutDashboard,
        requiresAdmin: true,
      },
      { title: "Caixa de Entrada", url: "/inbox", icon: Inbox },
      { title: "Meu Kanban", url: "/my-kanban", icon: LucideSquareKanban },
      { title: "Meus Projetos", url: "/my-projects", icon: FolderKanban },
      { title: "Timesheet", url: "/my-timesheet", icon: Clock },
      { title: "Reembolsos", url: "/reimbursements", icon: Receipt },
      { title: "Minhas Férias", url: "/minhas-ferias", icon: Palmtree },
    ],
  },
  {
    label: "Estratégia",
    requiresAdmin: true,
    items: [
      {
        title: "Estratégia",
        url: "/estrategia",
        icon: Target,
        requiresAdmin: true,
      },
    ],
  },
  {
    label: "Comercial",
    requiresManager: true,
    items: [
      {
        title: "Dashboard",
        url: "/comercial",
        icon: LayoutDashboard,
        requiresManager: true,
      },
      { title: "CRM", url: "/crm", icon: Kanban, requiresManager: true },
      {
        title: "Serviços",
        url: "/comercial/servicos",
        icon: Briefcase,
        requiresManager: true,
      },
      {
        title: "Clientes",
        url: "/clients",
        icon: Building2,
        requiresManager: true,
      },
    ],
  },
  {
    label: "Projetos",
    requiresManager: true,
    items: [
      {
        title: "Portfólio de Projetos",
        url: "/portfolio",
        icon: Kanban,
        requiresManager: true,
      },
      {
        title: "Alocação da Equipe",
        url: "/alocacao",
        icon: Clock,
        requiresManager: true,
      },
      {
        title: "Fornecedores",
        url: "/suppliers",
        icon: Truck,
        requiresManager: true,
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: BarChart3,
        requiresManager: true,
      },
    ],
  },
  {
    label: "RH",
    requiresManager: true,
    items: [
      {
        title: "Funcionários",
        url: "/employees",
        icon: Users,
        requiresAdmin: true,
      },
      {
        title: "Contratações",
        url: "/rh/candidatos",
        icon: UserSearch,
        requiresManager: true,
      },
       {
        title: "Ferramentas/Benefícios",
        url: "/rh/ferramentas-beneficios",
        icon: Users,
        requiresAdmin: true,
      },
      {
        title: "Vagas",
        url: "/rh/vagas",
        icon: ClipboardList,
        requiresManager: true,
      },

      {
        title: "Contratos",
        url: "/rh/contratos",
        icon: FileSignature,
        requiresAdmin: true,
        disabled: true,
      },
      {
        title: "Folha de Pagamento",
        url: "/rh/folha",
        icon: DollarSign,
        requiresAdmin: true,
        disabled: true,
      },
      {
        title: "Férias e Afastamentos",
        url: "/rh/ferias",
        icon: Palmtree,
        requiresManager: true,
      },
      {
        title: "Desligamentos",
        url: "/rh/desligamentos",
        icon: LogOut,
        requiresAdmin: true,
      },
      {
        title: "Relatórios",
        url: "/rh/relatorios",
        icon: BarChart3,
        requiresAdmin: true,
        disabled: true,
      },
    ],
  },
];

export function AppNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleMobileNavigate = (url: string) => {
    navigate(url);
    setMobileMenuOpen(false);
  };

  const visibleGroups = navigationGroups.filter(isGroupVisible);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4 gap-4">
      {/* Logo */}
      <button
        onClick={() => navigate("/admin-dashboard")}
        className="flex items-center gap-2 shrink-0 mr-2 hover:opacity-80 transition-opacity"
      >
        <img src={logo} alt="Pulse" className="h-7 w-7" />
        <span className="font-semibold text-foreground text-lg">Pulse</span>
      </button>

      {/* Desktop Navigation */}
      <NavigationMenu className="hidden md:flex flex-1 max-w-none">
        <NavigationMenuList className="gap-0">
          {visibleGroups.map((group) => {
            const visibleItems = filterItems(group.items);
            const isRegularUserPersonalGroup =
              group.label === "Meu Espaço" && !isManager && !isAdmin;

            if (isRegularUserPersonalGroup) {
              return visibleItems.map((item) => {
                const Icon = item.icon;
                const flatButton = (
                  <NavigationMenuItem key={item.title}>
                    <button
                      data-onboarding={ONBOARDING_TARGETS[item.url]}
                      disabled={item.disabled}
                      onClick={() => !item.disabled && navigate(item.url)}
                      className={cn(
                        "relative flex items-center gap-2 h-9 px-3 text-sm font-medium transition-colors",
                        isActive(item.url)
                          ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                          : "text-muted-foreground hover:text-primary",
                        item.disabled && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </button>
                  </NavigationMenuItem>
                );

                if (item.disabled) {
                  return (
                    <Tooltip key={item.title}>
                      <TooltipTrigger asChild>{flatButton}</TooltipTrigger>
                      <TooltipContent>
                        <p>Em breve</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return flatButton;
              });
            }

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
                              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                              isActive(item.url)
                                ? "bg-accent text-accent-foreground font-medium"
                                : "hover:bg-accent/50 text-foreground",
                              item.disabled && "opacity-50 cursor-not-allowed",
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
                            <TooltipTrigger asChild>
                              {linkContent}
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>Em breve</p>
                            </TooltipContent>
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

      {/* Spacer on mobile */}
      <div className="flex-1 md:hidden" />

      {/* Right side */}
      <div className="flex items-center gap-1 shrink-0">
        <UserMenu />

        {/* Mobile hamburger */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <button
              onClick={() => navigate("/admin-dashboard")}
              className="flex items-center gap-2 px-4 py-4 border-b w-full hover:opacity-80 transition-opacity"
            >
              <img src={logo} alt="Pulse" className="h-7 w-7" />
              <span className="font-semibold text-foreground text-lg">
                Pulse
              </span>
            </button>
            <nav className="overflow-y-auto h-[calc(100%-57px)]">
              {visibleGroups.map((group) => {
                const visibleItems = filterItems(group.items);
                const isRegularUserPersonalGroup =
                  group.label === "Meu Espaço" && !isManager && !isAdmin;

                if (isRegularUserPersonalGroup) {
                  return (
                    <div key={group.label} className="px-2 py-2">
                      <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.label}
                      </p>
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.title}
                            disabled={item.disabled}
                            onClick={() =>
                              !item.disabled && handleMobileNavigate(item.url)
                            }
                            className={cn(
                              "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                              isActive(item.url)
                                ? "bg-accent text-accent-foreground font-medium"
                                : "hover:bg-accent/50 text-foreground",
                              item.disabled && "opacity-50 cursor-not-allowed",
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <div key={group.label} className="px-2 py-2">
                    <Collapsible defaultOpen>
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                        {group.label}
                        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {visibleItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.title}
                              disabled={item.disabled}
                              onClick={() =>
                                !item.disabled && handleMobileNavigate(item.url)
                              }
                              className={cn(
                                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                                isActive(item.url)
                                  ? "bg-accent text-accent-foreground font-medium"
                                  : "hover:bg-accent/50 text-foreground",
                                item.disabled &&
                                  "opacity-50 cursor-not-allowed",
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span>{item.title}</span>
                              {item.disabled && (
                                <span className="ml-auto text-[10px] text-muted-foreground">
                                  Em breve
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
