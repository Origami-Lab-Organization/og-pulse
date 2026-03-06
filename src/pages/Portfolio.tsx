import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PortfolioKanbanBoard } from '@/components/portfolio/PortfolioKanbanBoard';
import { usePortfolioProjects } from '@/hooks/usePortfolioProjects';
import { Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function Portfolio() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: projects, isLoading } = usePortfolioProjects(searchQuery);

  return (
    <AppLayout title="Portfólio de Projetos">
      <div className="flex flex-col gap-4 h-[calc(100vh-10rem)]">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar projetos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-auto bg-muted/30 rounded-lg">
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
      </div>
    </AppLayout>
  );
}
