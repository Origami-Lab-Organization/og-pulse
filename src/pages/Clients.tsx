import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/DataTable';
import { createClientColumns } from '@/components/clients/ClientsTable';
import ClientStats from '@/components/clients/ClientStats';
import DeleteClientDialog from '@/components/clients/DeleteClientDialog';
import {
  useClients,
  useDeleteClient,
  useClientRelationCounts,
} from '@/hooks/useClients';
import { Client } from '@/types/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const Clients = () => {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { data: clients = [], isLoading } = useClients();
  const deleteClient = useDeleteClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: relationCounts } = useClientRelationCounts(
    deleteDialogOpen ? selectedClient?.id : undefined,
  );

  const canManage = employee?.is_gerente ?? false;

  const handleOpenClient = (client: Client) => navigate(`/clients/${client.id}`);
  const handleAddClient = () => navigate('/clients/new');
  const handleEditClient = (client: Client) => navigate(`/clients/${client.id}/edit`);

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedClient) {
      deleteClient.mutate(
        { id: selectedClient.id, companyName: selectedClient.companyName },
        { onSuccess: () => setDeleteDialogOpen(false) }
      );
    }
  };

  const columns = useMemo(
    () =>
      createClientColumns({
        onEdit: handleEditClient,
        onDelete: handleDeleteClient,
        canManage,
      }),
    [canManage]
  );

  const actions = canManage && (
    <Button onClick={handleAddClient} className="gap-2">
      <Plus className="h-4 w-4" />
      Adicionar Cliente
    </Button>
  );

  if (isLoading) {
    return (
      <AppLayout
        title="Clientes"
        description="Gerencie sua carteira de clientes"
        breadcrumbs={[{ label: 'Clientes' }]}
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Clientes"
      description="Gerencie sua carteira de clientes"
      breadcrumbs={[{ label: 'Clientes' }]}
      actions={actions}
    >
      {/* Stats */}
      <ClientStats clients={clients} />

      {/* Search */}
      <div className="mt-6 mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, fantasia ou CNPJ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table or Empty State */}
      {clients.length > 0 ? (
        <DataTable
          columns={columns}
          data={clients}
          searchKey="companyName"
          searchValue={searchQuery}
          onRowClick={handleOpenClient}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            Nenhum cliente cadastrado
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            {canManage
              ? 'Comece adicionando seu primeiro cliente'
              : 'Aguarde um administrador cadastrar clientes'}
          </p>
          {canManage && (
            <Button onClick={handleAddClient} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Cliente
            </Button>
          )}
        </div>
      )}

      <DeleteClientDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        clientName={selectedClient?.companyName || ''}
        opportunitiesCount={relationCounts?.opportunities ?? 0}
        projectsCount={relationCounts?.projects ?? 0}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteClient.isPending}
      />
    </AppLayout>
  );
};

export default Clients;
