import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  User,
  MapPin,
  Pencil,
  Trash2,
  Target,
  FolderKanban,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import DeleteClientDialog from '@/components/clients/DeleteClientDialog';
import {
  useClient,
  useClientContacts,
  useClientOpportunities,
  useClientProjects,
  useClientRelationCounts,
  useDeleteClient,
} from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { Client, ClientContact } from '@/types/client';
import { CRM_LEAD_COLUMNS } from '@/types/lead';
import { PROJECT_STATUS_LABELS } from '@/types/project';
import { formatCNPJ, formatPhone } from '@/lib/masks';
import { formatCurrency, formatDate } from '@/lib/formatters';

const stageLabel = (stage: string) =>
  CRM_LEAD_COLUMNS.find((c) => c.id === stage)?.label ?? stage;

const SectionEmpty = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null;
}) => (
  <div className="flex items-start gap-3">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground break-words">
        {value || <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  </div>
);

const CompanyCard = ({ client }: { client: Client }) => {
  const initials = client.companyName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const addressLine = [client.logradouro, client.numero, client.complemento]
    .filter(Boolean)
    .join(', ');
  const cityLine = [client.bairro, client.cidade && `${client.cidade}${client.estado ? '/' + client.estado : ''}`]
    .filter(Boolean)
    .join(' · ');
  const fullAddress = [addressLine, cityLine, client.cep && `CEP ${client.cep}`]
    .filter(Boolean)
    .join(' — ');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Empresa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            {client.logoUrl && (
              <AvatarImage src={client.logoUrl} alt={client.companyName} className="object-cover" />
            )}
            <AvatarFallback className="bg-secondary/10 text-secondary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{client.companyName}</p>
            {client.tradingName && (
              <p className="text-sm text-muted-foreground">{client.tradingName}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow icon={Building2} label="CNPJ" value={client.cnpj ? formatCNPJ(client.cnpj) : null} />
          <InfoRow icon={Target} label="Segmento" value={client.segment} />
          <InfoRow icon={MapPin} label="Endereço" value={fullAddress || null} />
        </div>
      </CardContent>
    </Card>
  );
};

const ContactsCard = ({
  client,
  contacts,
  isLoading,
}: {
  client: Client;
  contacts: ClientContact[];
  isLoading: boolean;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Contatos</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {isLoading ? (
        <Skeleton className="h-20 rounded-md" />
      ) : contacts.length === 0 ? (
        <SectionEmpty message="Nenhum contato cadastrado para este cliente." />
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="rounded-md border p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <InfoRow icon={User} label="Nome" value={contact.name} />
                <InfoRow icon={Mail} label="E-mail" value={contact.email} />
                <InfoRow
                  icon={Phone}
                  label="Telefone"
                  value={contact.phone ? formatPhone(contact.phone) : null}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
        <InfoRow icon={Globe} label="Website" value={client.website} />
        {client.notes && (
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Observações</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const ClientDetailSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-40 rounded-lg" />
    <Skeleton className="h-32 rounded-lg" />
    <div className="grid gap-6 lg:grid-cols-2">
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  </div>
);

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employee } = useAuth();
  const canManage = employee?.is_gerente ?? false;

  const { data: client, isLoading } = useClient(id);
  const { data: contacts = [], isLoading: loadingContacts } = useClientContacts(id);
  const { data: opportunities = [], isLoading: loadingOpps } = useClientOpportunities(id);
  const { data: projects = [], isLoading: loadingProjects } = useClientProjects(id);
  const { data: counts } = useClientRelationCounts(id);
  const deleteClient = useDeleteClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteConfirm = () => {
    if (!client) return;
    deleteClient.mutate(
      { id: client.id, companyName: client.companyName },
      {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          navigate('/clients');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <AppLayout title="Cliente" breadcrumbs={[{ label: 'Clientes', href: '/clients' }, { label: 'Carregando…' }]}>
        <ClientDetailSkeleton />
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout title="Cliente" breadcrumbs={[{ label: 'Clientes', href: '/clients' }, { label: 'Não encontrado' }]}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Cliente não encontrado</h3>
          <p className="mt-1 text-muted-foreground">Ele pode ter sido removido ou não pertence ao seu acesso.</p>
          <Button className="mt-4" onClick={() => navigate('/clients')}>
            Voltar para Clientes
          </Button>
        </div>
      </AppLayout>
    );
  }

  const actions = canManage && (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => navigate(`/clients/${client.id}/edit`)}
      >
        <Pencil className="h-4 w-4" />
        Editar
      </Button>
      <Button
        variant="outline"
        className="gap-2 text-destructive hover:text-destructive"
        onClick={() => setDeleteDialogOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>
    </div>
  );

  return (
    <AppLayout
      title={client.companyName}
      description={client.tradingName || undefined}
      breadcrumbs={[{ label: 'Clientes', href: '/clients' }, { label: client.companyName }]}
      actions={actions}
    >
      <div className="space-y-6">
        <CompanyCard client={client} />
        <ContactsCard client={client} contacts={contacts} isLoading={loadingContacts} />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-muted-foreground" />
                Oportunidades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingOpps ? (
                <Skeleton className="h-20 rounded-md" />
              ) : opportunities.length === 0 ? (
                <SectionEmpty message="Nenhuma oportunidade vinculada a este cliente." />
              ) : (
                opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{opp.name}</p>
                      <Badge variant="secondary" className="mt-1">
                        {stageLabel(opp.crm_stage)}
                      </Badge>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-foreground">
                      {formatCurrency(opp.budget?.final_total ?? opp.estimated_value ?? 0)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                Projetos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingProjects ? (
                <Skeleton className="h-20 rounded-md" />
              ) : projects.length === 0 ? (
                <SectionEmpty message="Nenhum projeto associado a este cliente." />
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(project.start_date)}
                        {project.end_date && ` — ${formatDate(project.end_date)}`}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DeleteClientDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        clientName={client.companyName}
        opportunitiesCount={counts?.opportunities ?? 0}
        projectsCount={counts?.projects ?? 0}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteClient.isPending}
      />
    </AppLayout>
  );
};

export default ClientDetail;
