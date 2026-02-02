import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search } from 'lucide-react';
import { KanbanBoard } from '@/components/crm/KanbanBoard';
import { useBudgets } from '@/hooks/useBudgets';

export default function CRM() {
  const navigate = useNavigate();
  const { data: budgets = [], isLoading } = useBudgets();
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <AppLayout
      title="CRM"
      description="Funil de vendas"
      breadcrumbs={[{ label: 'CRM' }]}
      actions={
        <Button onClick={() => navigate('/budgets/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Orçamento
        </Button>
      }
    >
      {/* Search bar */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar orçamentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <KanbanBoard budgets={budgets} searchTerm={searchTerm} />
      )}
    </AppLayout>
  );
}
