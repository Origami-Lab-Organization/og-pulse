import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  Users,
  UserRound,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientStakeholdersTab } from '@/components/clients/ClientStakeholdersTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import DeleteClientDialog from '@/components/clients/DeleteClientDialog';
import {
  useClient,
  useClientContacts,
  useClientCommercialContacts,
  useClientProjects,
  useClientRelationCounts,
  useDeleteClient,
} from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { Client, ClientContact } from '@/types/client';
import { getProspectStageLabel } from '@/types/prospect';
import type { CommercialContactSummary } from '@/types/commercialContact';
import { PROJECT_STATUS_LABELS, type ProjectWithRelations } from '@/types/project';
import { formatCNPJ, formatPhone } from '@/lib/masks';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { commercialContactHref, commercialContactValue } from '@/services/commercialContactService';

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

/** Um número discreto ao lado do rótulo da aba, para saber o que tem lá sem abrir. */
const ContadorAba = ({ valor }: { valor: number }) =>
  valor > 0 ? (
    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs font-normal">
      {valor}
    </Badge>
  ) : null;

/**
 * Oportunidades do cliente = contatos da Prospecção das empresas ligadas a ele
 * (`prospect_companies.client_id`). Desde 29/09/2026 a Oportunidade vive na Prospecção;
 * cada linha leva ao contato no quadro.
 */
const OpportunitiesTab = ({
  contacts,
  isLoading,
  isError,
}: {
  contacts: CommercialContactSummary[];
  isLoading: boolean;
  isError: boolean;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        <Target className="h-4 w-4 text-muted-foreground" />
        Oportunidades
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {isLoading ? (
        <Skeleton className="h-20 rounded-md" />
      ) : isError ? (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Não foi possível carregar as oportunidades deste cliente.
        </div>
      ) : contacts.length === 0 ? (
        <SectionEmpty message="Nenhum contato da Prospecção vinculado a este cliente." />
      ) : (
        contacts.map((contact) => {
          const value = commercialContactValue(contact);
          return (
            <Link
              key={contact.id}
              to={commercialContactHref(contact.id)}
              className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{contact.contact_name}</p>
                {contact.company?.name && (
                  <p className="truncate text-xs text-muted-foreground">{contact.company.name}</p>
                )}
                <Badge variant="secondary" className="mt-1">
                  {getProspectStageLabel(contact.stage)}
                </Badge>
              </div>
              <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
                {value !== null ? formatCurrency(value) : <span className="text-muted-foreground">Sem valor</span>}
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </span>
            </Link>
          );
        })
      )}
    </CardContent>
  </Card>
);

/**
 * Projetos do cliente, em tabela, com STATUS e GP — que é o que se quer saber ao abrir a
 * conta: em que pé está cada frente e com quem falar sobre ela.
 */
const ProjectsTab = ({
  projects,
  isLoading,
  onOpen,
}: {
  projects: ProjectWithRelations[];
  isLoading: boolean;
  onOpen: (projectId: string) => void;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
        Projetos
      </CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-32 rounded-md" />
      ) : projects.length === 0 ? (
        <SectionEmpty message="Nenhum projeto associado a este cliente." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>GP</TableHead>
                <TableHead>Período</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow
                  key={project.id}
                  onClick={() => onOpen(project.id)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{PROJECT_STATUS_LABELS[project.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {project.manager?.nome ?? 'Sem GP definido'}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(project.start_date)}
                    {project.end_date && ` — ${formatDate(project.end_date)}`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
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
  const { employee, can } = useAuth();
  const canManage = employee?.is_gerente ?? false;
  const canSeeOpportunities = can('prospeccao:ler');

  const { data: client, isLoading } = useClient(id);
  const { data: contacts = [], isLoading: loadingContacts } = useClientContacts(id);
  const {
    data: opportunities = [],
    isLoading: loadingOpps,
    isError: oppsError,
  } = useClientCommercialContacts(id);
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
      <Tabs defaultValue="dados" className="w-full">
        <TabsList className={`grid w-full ${canSeeOpportunities ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Dados do cliente</span>
          </TabsTrigger>
          {canSeeOpportunities && (
            <TabsTrigger value="oportunidades" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Oportunidades</span>
              <ContadorAba valor={opportunities.length} />
            </TabsTrigger>
          )}
          <TabsTrigger value="projetos" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            <span className="hidden sm:inline">Projetos</span>
            <ContadorAba valor={projects.length} />
          </TabsTrigger>
          <TabsTrigger value="stakeholders" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Stakeholders</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4 space-y-6">
          <CompanyCard client={client} />
          <ContactsCard client={client} contacts={contacts} isLoading={loadingContacts} />
        </TabsContent>

        {canSeeOpportunities && (
          <TabsContent value="oportunidades" className="mt-4">
            <OpportunitiesTab contacts={opportunities} isLoading={loadingOpps} isError={oppsError} />
          </TabsContent>
        )}

        <TabsContent value="projetos" className="mt-4">
          <ProjectsTab
            projects={projects}
            isLoading={loadingProjects}
            onOpen={(projectId) => navigate(`/projects/${projectId}`)}
          />
        </TabsContent>

        <TabsContent value="stakeholders" className="mt-4">
          <ClientStakeholdersTab clientId={client.id} canManage={canManage} />
        </TabsContent>
      </Tabs>

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
