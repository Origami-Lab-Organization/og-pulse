import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';
import ClientForm from '@/components/clients/ClientForm';
import { useClient, useCreateClient, useUpdateClient } from '@/hooks/useClients';
import { CreateClientInput } from '@/types/client';

const ClientFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: client, isLoading } = useClient(id);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const cancelTarget = isEditing ? `/clients/${id}` : '/clients';

  const handleSubmit = (data: CreateClientInput) => {
    if (isEditing && id) {
      updateClient.mutate(
        { id, updates: data },
        { onSuccess: () => navigate(`/clients/${id}`) },
      );
    } else {
      createClient.mutate(data, {
        onSuccess: (newClient) => navigate(`/clients/${newClient.id}`),
      });
    }
  };

  const title = isEditing ? 'Editar Cliente' : 'Novo Cliente';
  const breadcrumbs = [
    { label: 'Clientes', href: '/clients' },
    { label: isEditing ? client?.companyName || 'Editar' : 'Novo' },
  ];

  // Em edição, aguarda o carregamento do cliente antes de montar o formulário.
  if (isEditing && isLoading) {
    return (
      <AppLayout title={title} breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="space-y-4 py-6">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (isEditing && !client) {
    return (
      <AppLayout title={title} breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Cliente não encontrado</h3>
          <p className="mt-1 text-muted-foreground">
            Ele pode ter sido removido ou não pertence ao seu acesso.
          </p>
          <Button className="mt-4" onClick={() => navigate('/clients')}>
            Voltar para Clientes
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={title}
      description={isEditing ? 'Atualize os dados do cliente' : 'Cadastre um novo cliente'}
      breadcrumbs={breadcrumbs}
    >
      <Card>
        <CardContent className="py-6">
          <ClientForm
            client={isEditing ? client : null}
            onSubmit={handleSubmit}
            onCancel={() => navigate(cancelTarget)}
            isLoading={createClient.isPending || updateClient.isPending}
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default ClientFormPage;
