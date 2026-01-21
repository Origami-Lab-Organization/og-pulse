import { useState, useMemo } from 'react';
import { Loader2, Plus, Search, Building2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ClientCard from '@/components/clients/ClientCard';
import ClientStats from '@/components/clients/ClientStats';
import ClientFormDialog from '@/components/clients/ClientFormDialog';
import DeleteClientDialog from '@/components/clients/DeleteClientDialog';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import { Client, CreateClientInput } from '@/types/client';
import { useAuth } from '@/contexts/AuthContext';

const Clients = () => {
  const { employee } = useAuth();
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Check if user can manage clients (admin or gerente)
  const canManage = employee?.is_gerente ?? false;

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.companyName.toLowerCase().includes(query) ||
        client.tradingName?.toLowerCase().includes(query) ||
        client.cnpj?.includes(query)
    );
  }, [clients, searchQuery]);

  const handleAddClient = () => {
    setSelectedClient(null);
    setFormDialogOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setFormDialogOpen(true);
  };

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: CreateClientInput) => {
    if (selectedClient) {
      updateClient.mutate(
        { id: selectedClient.id, updates: data },
        { onSuccess: () => setFormDialogOpen(false) }
      );
    } else {
      createClient.mutate(data, { onSuccess: () => setFormDialogOpen(false) });
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedClient) {
      deleteClient.mutate(
        { id: selectedClient.id, companyName: selectedClient.companyName },
        { onSuccess: () => setDeleteDialogOpen(false) }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-8">
        <ClientStats clients={clients} />

        <div className="mt-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, fantasia ou CNPJ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {canManage && (
            <Button onClick={handleAddClient} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Cliente
            </Button>
          )}
        </div>

        {filteredClients.length === 0 ? (
          <div className="mt-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">
              {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </h3>
            <p className="text-muted-foreground mt-1">
              {searchQuery
                ? 'Tente buscar por outro termo'
                : canManage
                ? 'Comece adicionando seu primeiro cliente'
                : 'Aguarde um administrador cadastrar clientes'}
            </p>
            {!searchQuery && canManage && (
              <Button onClick={handleAddClient} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Cliente
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onEdit={handleEditClient}
                onDelete={handleDeleteClient}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </main>

      <ClientFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        client={selectedClient}
        onSubmit={handleFormSubmit}
        isLoading={createClient.isPending || updateClient.isPending}
      />

      <DeleteClientDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        clientName={selectedClient?.companyName || ''}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteClient.isPending}
      />
    </div>
  );
};

export default Clients;
