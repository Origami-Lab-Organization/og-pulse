import { ReactNode } from 'react';
import { AppNavbar } from './AppNavbar';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
}

export function AppLayout({
  children,
  title,
  description,
  actions,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <AppNavbar />

      {/* Page Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col gap-1 py-6 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        <div className="py-6 px-6 max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
