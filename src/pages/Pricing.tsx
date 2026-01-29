import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoleRatesTable } from '@/components/pricing/RoleRatesTable';
import { RoleRateFormDialog } from '@/components/pricing/RoleRateFormDialog';
import { DeleteRoleRateDialog } from '@/components/pricing/DeleteRoleRateDialog';
import {
  useRoleRates,
  useCreateRoleRate,
  useUpdateRoleRate,
  useDeleteRoleRate,
  useSetRoleRateStatus,
  useCreateMultipleRoleRates,
} from '@/hooks/useRoleRates';
import { RoleRateDB, CreateRoleRateInput, RoleRateStatus } from '@/types/roleRate';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StatusFilter = 'all' | 'active' | 'inactive' | 'archived';

export default function Pricing() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRoleRate, setSelectedRoleRate] = useState<RoleRateDB | null>(null);

  const { data: roleRates = [], isLoading } = useRoleRates();
  const createMutation = useCreateRoleRate();
  const createMultipleMutation = useCreateMultipleRoleRates();
  const updateMutation = useUpdateRoleRate();
  const deleteMutation = useDeleteRoleRate();
  const setStatusMutation = useSetRoleRateStatus();

  const filteredRoleRates = useMemo(() => {
    return roleRates.filter((rate) => {
      const matchesSearch =
        rate.role_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rate.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesStatus =
        statusFilter === 'all' || rate.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [roleRates, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: roleRates.length,
    active: roleRates.filter((r) => r.status === 'active').length,
    inactive: roleRates.filter((r) => r.status === 'inactive').length,
    archived: roleRates.filter((r) => r.status === 'archived').length,
  }), [roleRates]);

  const handleOpenCreate = () => {
    setSelectedRoleRate(null);
    setFormOpen(true);
  };

  const handleEdit = (roleRate: RoleRateDB) => {
    setSelectedRoleRate(roleRate);
    setFormOpen(true);
  };

  const handleDelete = (roleRate: RoleRateDB) => {
    setSelectedRoleRate(roleRate);
    setDeleteOpen(true);
  };

  const handleSetStatus = (roleRate: RoleRateDB, status: RoleRateStatus) => {
    setStatusMutation.mutate({ id: roleRate.id, status });
  };

  const handleFormSubmit = (data: CreateRoleRateInput) => {
    if (selectedRoleRate) {
      updateMutation.mutate(
        { id: selectedRoleRate.id, input: data },
        {
          onSuccess: () => setFormOpen(false),
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const handleFormSubmitMultiple = (data: CreateRoleRateInput[]) => {
    createMultipleMutation.mutate(data, {
      onSuccess: () => setFormOpen(false),
    });
  };

  const handleConfirmDelete = () => {
    if (selectedRoleRate) {
      deleteMutation.mutate(selectedRoleRate.id, {
        onSuccess: () => {
          setDeleteOpen(false);
          setSelectedRoleRate(null);
        },
      });
    }
  };

  return (
    <AppLayout
      title="Tabela de Preços"
      description="Gerencie os papéis e valores hora para orçamentos"
      actions={
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Papel
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="archived">Arquivados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total de Papéis</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Ativos</p>
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Inativos</p>
            <p className="text-2xl font-bold text-secondary-foreground">{stats.inactive}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Arquivados</p>
            <p className="text-2xl font-bold text-muted-foreground">{stats.archived}</p>
          </div>
        </div>

        {/* Table */}
        <RoleRatesTable
          roleRates={filteredRoleRates}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSetStatus={handleSetStatus}
          isLoading={isLoading}
        />
      </div>

      {/* Dialogs */}
      <RoleRateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        roleRate={selectedRoleRate}
        onSubmit={handleFormSubmit}
        onSubmitMultiple={handleFormSubmitMultiple}
        isSubmitting={createMutation.isPending || updateMutation.isPending || createMultipleMutation.isPending}
      />

      <DeleteRoleRateDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        roleRate={selectedRoleRate}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteMutation.isPending}
      />
    </AppLayout>
  );
}
