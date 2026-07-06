import { ReactNode } from 'react';
import { AppNavbar } from './AppNavbar';
import { OnboardingBanner } from '@/components/onboarding/OnboardingBanner';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
  hideHeader?: boolean;
}

export function AppLayout({
  children,
  title,
  description,
  actions,
  hideHeader = false,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <AppNavbar />
      <OfflineBanner />

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
              {actions && (
                <div className="flex items-center gap-2 shrink-0">
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
          {children}
        </div>
      </main>
    </div>
  );
}
