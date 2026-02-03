import { useState } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { UserMenu } from '@/components/layout/UserMenu';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PortfolioKanbanBoard } from '@/components/portfolio/PortfolioKanbanBoard';
import { usePortfolioProjects } from '@/hooks/usePortfolioProjects';
import { Search, Briefcase } from 'lucide-react';

export default function Portfolio() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: projects, isLoading } = usePortfolioProjects(searchQuery);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          {/* Top Header */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2 flex-1">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="font-medium">Portfólio de Projetos</span>
            </div>
            <UserMenu />
          </header>

          {/* Search Bar */}
          <div className="px-4 py-3 border-b border-border bg-background">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar projetos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-auto bg-muted/30">
            {isLoading ? (
              <div className="flex gap-4 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="min-w-[240px]">
                    <Skeleton className="h-10 w-full mb-2 rounded-t-lg" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full mt-2" />
                  </div>
                ))}
              </div>
            ) : (
              <PortfolioKanbanBoard projects={projects || []} />
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
