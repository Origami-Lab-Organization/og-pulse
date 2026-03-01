import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search } from 'lucide-react';
import { LeadKanbanBoard } from '@/components/crm/LeadKanbanBoard';
import { LeadFormDialog } from '@/components/crm/LeadFormDialog';
import { useLeads } from '@/hooks/useLeads';
import CRMStats from '@/components/crm/CRMStats';

export default function CRM() {
  const { data: leads = [], isLoading } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [newLeadOpen, setNewLeadOpen] = useState(false);

  return (
    <AppLayout
      title="CRM"
      description="Funil de vendas"
      breadcrumbs={[{ label: 'CRM' }]}
      actions={
        <Button onClick={() => setNewLeadOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      }
    >
      <CRMStats leads={leads} />

      <div className="mt-6 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads..."
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
        <LeadKanbanBoard leads={leads} searchTerm={searchTerm} />
      )}

      <LeadFormDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
    </AppLayout>
  );
}
