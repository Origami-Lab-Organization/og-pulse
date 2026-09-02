import { useState, useMemo } from 'react';
import { Plus, Search, DollarSign, Receipt, PartyPopper, Tag, Activity, Bell, ShieldCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FinancialSettingsForm } from '@/components/settings/FinancialSettingsForm';
import { PayrollProfileSettingsForm } from '@/components/settings/PayrollProfileSettingsForm';
import { HolidaysSettingsForm } from '@/components/settings/HolidaysSettingsForm';
import { ActivityTypesSettings } from '@/components/settings/ActivityTypesSettings';
import { AccessProfilesSettings } from '@/components/settings/AccessProfilesSettings';
import { TimesheetReminderSettings } from '@/components/admin/TimesheetReminderSettings';
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

export default function AdminPortal() {
  // Pricing tab state
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
      const matchesStatus = statusFilter === 'all' || rate.status === statusFilter;
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
        { onSuccess: () => setFormOpen(false) }
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
      title="Portal do Admin"
      description="Gerencie as configurações da empresa"
      breadcrumbs={[{ label: 'Portal do Admin' }]}
    >
      <Tabs defaultValue="pricing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profiles" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Perfis de Acesso
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tabela de Preços
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Encargos/Folha
          </TabsTrigger>
          <TabsTrigger value="holidays" className="flex items-center gap-2">
            <PartyPopper className="h-4 w-4" />
            Feriados/Folgas
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Atividades
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Lembretes
          </TabsTrigger>
        </TabsList>

        {/* Tabela de Preços */}
        <TabsContent value="profiles" className="space-y-4">
          <AccessProfilesSettings />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
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
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Papel
            </Button>
          </div>

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

          <RoleRatesTable
            roleRates={filteredRoleRates}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSetStatus={handleSetStatus}
            isLoading={isLoading}
          />

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
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financial" className="space-y-4">
          <FinancialSettingsForm />
        </TabsContent>

        {/* Encargos/Folha */}
        <TabsContent value="payroll" className="space-y-4">
          <PayrollProfileSettingsForm />
        </TabsContent>

        {/* Feriados/Folgas */}
        <TabsContent value="holidays" className="space-y-4">
          <HolidaysSettingsForm />
        </TabsContent>

        {/* Atividades Internas */}
        <TabsContent value="activities" className="space-y-4">
          <ActivityTypesSettings />
        </TabsContent>

        {/* Lembretes */}
        <TabsContent value="reminders" className="space-y-4">
          <TimesheetReminderSettings />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}