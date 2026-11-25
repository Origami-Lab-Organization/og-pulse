import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';
import ClientForm from '@/components/clients/ClientForm';
import { useClient, useEmpresaDoCliente, useUpdateClient } from '@/hooks/useClients';
import { ROTA_DA_CARTEIRA } from '@/lib/carteira.constants';
import { CreateClientInput } from '@/types/client';

const TRILHA = [{ label: 'Comercial' }, { label: 'Empresas', href: ROTA_DA_CARTEIRA }];

/**
 * Editar o cliente (US-0049). Não há mais cadastro de cliente: ele nasce da empresa no Ganho
 * (US-0045, ADR-0056). Com empresa, a identificação vem dela e fica travada aqui.
 */
const ClientFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: client, isLoading } = useClient(id);
  const { data: empresaId } = useEmpresaDoCliente(id);
  const updateClient = useUpdateClient();

  const handleSubmit = (data: CreateClientInput) => {
    if (!id) return;
    updateClient.mutate({ id, updates: data }, { onSuccess: () => navigate(`/clients/${id}`) });
  };

  const title = 'Editar cliente';
  const breadcrumbs = [...TRILHA, { label: client?.companyName || 'Editar' }];

  if (isLoading) {
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

  if (!client) {
    return (
      <AppLayout title={title} breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Cliente não encontrado</h3>
          <Button className="mt-4" onClick={() => navigate(ROTA_DA_CARTEIRA)}>
            Voltar para Empresas
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={title} breadcrumbs={breadcrumbs}>
      <Card>
        <CardContent className="py-6">
          <ClientForm
            client={client}
            identificacaoDaEmpresa={Boolean(empresaId)}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/clients/${client.id}`)}
            isLoading={updateClient.isPending}
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default ClientFormPage;
