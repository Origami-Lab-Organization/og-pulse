import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { AppFooter } from './AppFooter';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import { OwnerGuide } from '@/components/onboarding/OwnerGuide';
import { OnboardingBanner } from '@/components/onboarding/OnboardingBanner';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { CapabilitiesUnavailableBanner } from '@/components/access/CapabilitiesUnavailableBanner';
import { SidebarProvider, SidebarTrigger, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { HideValuesToggle } from '@/components/layout/HideValuesToggle';
import { HideValuesProvider, useHideValuesPreference } from '@/contexts/HideValuesContext';

// The shadcn SidebarProvider writes this cookie on every state change but never reads it.
// Reading it here persists the collapsed/expanded state across page navigations.
function getSidebarDefaultOpen(): boolean {
  const match = document.cookie.split('; ').find((row) => row.startsWith('sidebar:state='));
  return match ? match.split('=')[1] === 'true' : true;
}

function DesktopSidebarToggle() {
  const { state, toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      aria-label={state === 'collapsed' ? 'Expandir menu' : 'Recolher menu'}
      className="hidden md:flex absolute left-0 top-12 -translate-x-1/2 -translate-y-1/2 z-50
                 h-6 w-6 rounded-full border border-border bg-background shadow-sm
                 items-center justify-center
                 text-muted-foreground hover:text-foreground hover:border-foreground/30
                 transition-all duration-150 focus-visible:outline-none"
    >
      {state === 'collapsed'
        ? <ChevronRight className="h-3 w-3" />
        : <ChevronLeft className="h-3 w-3" />
      }
    </button>
  );
}

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
  hideHeader?: boolean;
  /**
   * A página mostra dinheiro. Liga o olho de ocultar valores no cabeçalho.
   *
   * É declaração da página, e não algo que o layout adivinha: só quem monta a tela sabe se
   * ela tem valor monetário. Sem isto o olho apareceria no Timesheet e na Ajuda, oferecendo
   * esconder o que não existe.
   */
  financialValues?: boolean;
}

export function AppLayout({
  children,
  title,
  description,
  actions,
  hideHeader = false,
  financialValues = false,
}: AppLayoutProps) {
  // O provider mora aqui para a página não precisar refazer a fiação: qualquer tela pode
  // chamar `useMaskedCurrency()` e reagir ao olho, tenha ou não o botão no cabeçalho.
  const [hideValues] = useHideValuesPreference();

  return (
    <SidebarProvider defaultOpen={getSidebarDefaultOpen()}>
      <AppSidebar />
      <SidebarInset className="relative">
        <DesktopSidebarToggle />

        {/* Mobile-only top bar */}
        <header className="md:hidden sticky top-0 z-40 flex h-12 items-center border-b bg-background px-4 gap-3">
          <SidebarTrigger />
          <span className="font-semibold text-foreground">Pulse</span>
        </header>

        <OfflineBanner />
        <CapabilitiesUnavailableBanner />

        {/* Page Header */}
        {!hideHeader && (
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex flex-col gap-1 py-4 px-4 sm:py-6 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                  {description && (
                    <p className="text-muted-foreground mt-1">{description}</p>
                  )}
                </div>
                {(financialValues || actions) && (
                  <div className="flex items-center gap-2 shrink-0">
                    {financialValues && <HideValuesToggle />}
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto min-w-0">
          <div className="py-4 px-4 sm:py-6 sm:px-6 max-w-full">
            <OnboardingBanner />
            {/* Sem `key` de remontagem: quem faz a tela reagir é o contexto, então alternar o
                olho não perde aba aberta, rolagem nem filtro preenchido. */}
            <HideValuesProvider value={hideValues}>{children}</HideValuesProvider>
          </div>
        </main>
        <AppFooter />
        {/* Fora do <main> de propósito: são `fixed` e não devem rolar com o conteúdo.
            O tour APRESENTA a casa na primeira entrada; o guia ACOMPANHA a montagem depois.
            Convivem porque respondem perguntas diferentes (PUL-251 e PUL-250). */}
        <GuidedTour />
        <OwnerGuide />
      </SidebarInset>
    </SidebarProvider>
  );
}
