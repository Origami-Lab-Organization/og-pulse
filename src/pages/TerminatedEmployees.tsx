import { useState, useMemo } from 'react';
import { Plus, Search, UserMinus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/data-table/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useTerminations } from '@/hooks/useTerminations';
import { TerminationWithEmployee } from '@/services/terminationService';
import TerminationStats from '@/components/terminations/TerminationStats';
import { createTerminationColumns } from '@/components/terminations/TerminationsTable';
import {
  TERMINATION_TYPES,
  TERMINATION_TYPE_LABELS,
  TERMINATION_STATUSES,
  TERMINATION_STATUS_LABELS,
  TerminationType,
  TerminationStatus,
} from '@/types/termination';
import { useToast } from '@/hooks/use-toast';
import { TerminationDetailDrawer } from '@/components/terminations/TerminationDetailDrawer';

const TerminatedEmployees = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTermination, setSelectedTermination] = useState<TerminationWithEmployee | null>(null);

  const { data, isLoading } = useTerminations({ limit: 200 });
  const terminations = data?.data ?? [];

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = terminations;
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter((t) => t.termination_type === typeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.employees.nome.toLowerCase().includes(q));
    }
    return result;
  }, [terminations, statusFilter, typeFilter, searchQuery]);

  const openDetail = (t: TerminationWithEmployee) => setSelectedTermination(t);

  const columns = useMemo(
    () =>
      createTerminationColumns({
        onView: openDetail,
        onEdit: openDetail,
        onDocuments: openDetail,
        onPayroll: openDetail,
      }),
    []
  );

  const actions = (
    <Button className="gap-2" onClick={() => toast({ title: 'Novo desligamento', description: 'Use a página de funcionários para iniciar um desligamento.' })}>
      <Plus className="h-4 w-4" />
      Novo Desligamento
    </Button>
  );

  if (isLoading) {
    return (
      <AppLayout
        title="Funcionários Desligados"
        description="Gerencie processos de desligamento"
        breadcrumbs={[{ label: 'RH' }, { label: 'Funcionários Desligados' }]}
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Funcionários Desligados"
      description="Gerencie processos de desligamento"
      breadcrumbs={[{ label: 'RH' }, { label: 'Funcionários Desligados' }]}
      actions={actions}
    >
      <TerminationStats terminations={terminations} />

      {/* Filters */}
      <div className="mt-6 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do funcionário..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {TERMINATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {TERMINATION_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {TERMINATION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TERMINATION_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table or Empty State */}
      {filtered.length > 0 ? (
        <DataTable columns={columns} data={filtered} />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
          <div className="rounded-full bg-muted p-4 mb-4">
            <UserMinus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Nenhum desligamento encontrado</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Nenhum processo de desligamento foi registrado ainda'}
          </p>
        </div>
      )}

      <TerminationDetailDrawer
        isOpen={!!selectedTermination}
        onClose={() => setSelectedTermination(null)}
        termination={selectedTermination}
      />
    </AppLayout>
  );
};

export default TerminatedEmployees;
