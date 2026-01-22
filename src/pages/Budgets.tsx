import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BudgetStats } from '@/components/budgets/BudgetStats';
import { BudgetsTable } from '@/components/budgets/BudgetsTable';
import { BudgetFormDialog } from '@/components/budgets/BudgetFormDialog';
import { DeleteBudgetDialog } from '@/components/budgets/DeleteBudgetDialog';
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget, useDuplicateBudget, useUpdateBudgetStatus } from '@/hooks/useBudgets';
import { BudgetWithDetails, BudgetStatus, CreateBudgetInput, BUDGET_STATUS_OPTIONS } from '@/types/budget';
import { Loader2 } from 'lucide-react';

export default function Budgets() {
  const { data: budgets = [], isLoading } = useBudgets();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();
  const duplicateMutation = useDuplicateBudget();
  const statusMutation = useUpdateBudgetStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithDetails | null>(null);

  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      const matchesSearch = searchQuery === '' ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.budget_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.lead_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.client?.company_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [budgets, searchQuery, statusFilter]);

  const handleCreate = () => { setSelectedBudget(null); setFormOpen(true); };
  const handleEdit = (budget: BudgetWithDetails) => { setSelectedBudget(budget); setFormOpen(true); };
  const handleDelete = (budget: BudgetWithDetails) => { setSelectedBudget(budget); setDeleteOpen(true); };
  const handleView = (budget: BudgetWithDetails) => { setSelectedBudget(budget); setFormOpen(true); };
  const handleDuplicate = (budget: BudgetWithDetails) => { duplicateMutation.mutate(budget.id); };
  const handleStatusChange = (budget: BudgetWithDetails, status: BudgetStatus) => {
    statusMutation.mutate({ id: budget.id, status });
  };

  const handleFormSubmit = (data: CreateBudgetInput) => {
    if (selectedBudget) {
      updateMutation.mutate({ id: selectedBudget.id, input: data }, { onSuccess: () => setFormOpen(false) });
    } else {
      createMutation.mutate(data, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedBudget) {
      deleteMutation.mutate(selectedBudget.id, { onSuccess: () => { setDeleteOpen(false); setSelectedBudget(null); } });
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Orçamentos" description="Gerencie suas propostas comerciais" breadcrumbs={[{ label: 'Orçamentos' }]}>
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Orçamentos"
      description="Gerencie suas propostas comerciais"
      breadcrumbs={[{ label: 'Orçamentos' }]}
      actions={<Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" />Novo Orçamento</Button>}
    >
      <div className="space-y-6">
        <BudgetStats budgets={budgets} />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar orçamentos..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {BUDGET_STATUS_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <BudgetsTable
          budgets={filteredBudgets}
          onView={handleView}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      </div>

      <BudgetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        budget={selectedBudget}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteBudgetDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        budget={selectedBudget}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteMutation.isPending}
      />
    </AppLayout>
  );
}
