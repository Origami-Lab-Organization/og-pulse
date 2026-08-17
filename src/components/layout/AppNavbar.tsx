import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, ChevronDown } from "lucide-react";
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
import { usePwaEnvironment } from "@/hooks/use-pwa-environment";
import { NAV_SECTIONS, isSectionActive, type NavSection } from "./nav-config";

export function AppNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isStandalone } = usePwaEnvironment();

  const isManager = employee?.is_gerente ?? false;
  const isAdmin = employee?.isAdmin ?? false;

  // Mesmo destino de "/" (HomeRedirect) e do logo do sidebar: gerente também vai
  // para /dashboard. Antes o navbar mandava gerente para /inbox, divergindo dos
  // outros dois pontos de entrada (PUL-169).
  const homeRoute = isAdmin ? '/admin-dashboard' : '/dashboard';

  const isVisible = (section: NavSection): boolean => {
    if (isStandalone && section.label !== "Início") return false;
    if (section.requiresAdmin && !isAdmin) return false;
    if (section.requiresManager && !isManager && !isAdmin) return false;
    return true;
  };

  const visibleSections = NAV_SECTIONS.filter(isVisible);

  const handleMobileNavigate = (url: string) => {
    navigate(url);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4 gap-4">
      {/* Logo */}
      <button
        onClick={() => navigate(homeRoute)}
        className="flex items-center gap-2 shrink-0 mr-2 hover:opacity-80 transition-opacity"
      >
        <img src={logo} alt="Pulse" className="h-7 w-7" />
        <span className="font-semibold text-foreground text-lg">Pulse</span>
      </button>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex flex-1 items-center gap-1">
        {visibleSections.map((section) => {
          const active = isSectionActive(section, location.pathname);
          return (
            <button
              key={section.label}
              onClick={() => navigate(section.url)}
              className={cn(
                "relative h-9 px-3 text-sm font-medium transition-colors rounded-md",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {section.label}
              {active && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

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
              onClick={() => navigate(homeRoute)}
              className="flex items-center gap-2 px-4 py-4 border-b w-full hover:opacity-80 transition-opacity"
            >
              <img src={logo} alt="Pulse" className="h-7 w-7" />
              <span className="font-semibold text-foreground text-lg">Pulse</span>
            </button>
            <nav className="overflow-y-auto h-[calc(100%-57px)]">
              {visibleSections.map((section) => {
                if (!section.tabs) {
                  const active = isSectionActive(section, location.pathname);
                  return (
                    <div key={section.label} className="px-2 py-1">
                      <button
                        onClick={() => handleMobileNavigate(section.url)}
                        className={cn(
                          "flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-accent/50"
                        )}
                      >
                        {section.label}
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={section.label} className="px-2 py-1">
                    <Collapsible defaultOpen>
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/50 rounded-md transition-colors">
                        {section.label}
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-3">
                        {section.tabs.map((tab) => {
                          const active =
                            location.pathname === tab.url ||
                            location.pathname.startsWith(tab.url + '/');
                          return (
                            <button
                              key={tab.url}
                              onClick={() => handleMobileNavigate(tab.url)}
                              className={cn(
                                "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors",
                                active
                                  ? "bg-accent text-accent-foreground font-medium"
                                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                              )}
                            >
                              {tab.title}
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
