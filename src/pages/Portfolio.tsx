import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PortfolioKanbanBoard } from '@/components/portfolio/PortfolioKanbanBoard';
import { PortfolioKPIBar } from '@/components/portfolio/PortfolioKPIBar';
import { usePortfolioProjects } from '@/hooks/usePortfolioProjects';
import { Search, Building2, User } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';

export default function Portfolio() {
  const [searchQuery, setSearchQuery] = useState('');
  const { employee } = useAuth();
  const isAdmin = employee?.isAdmin ?? false;
  const { data: projects, isLoading } = usePortfolioProjects(searchQuery);

  const scopeBadge = isAdmin ? (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800 gap-1">
      <Building2 className="h-3 w-3" />
      Visão da empresa
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700 gap-1">
      <User className="h-3 w-3" />
      Meus projetos
    </Badge>
  );

  return (
    <AppLayout title="Portfólio de Projetos" actions={scopeBadge}>
      <div className="flex flex-col gap-4 h-[calc(100vh-10rem)]">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por projeto, cliente ou gerente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="min-w-[240px]">
                <Skeleton className="h-10 w-full mb-2 rounded-t-lg" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full mt-2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <PortfolioKPIBar projects={projects || []} />
            <div className="flex-1 overflow-auto bg-muted/30 rounded-lg">
              <PortfolioKanbanBoard projects={projects || []} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
