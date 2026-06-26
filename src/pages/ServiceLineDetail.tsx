import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Briefcase,
  Search,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ServiceFormDialog } from '@/components/services/ServiceFormDialog';
import { RevenueModelFormDialog } from '@/components/services/RevenueModelFormDialog';
import { DeleteCatalogItemDialog } from '@/components/services/DeleteCatalogItemDialog';
import {
  useServices,
  useCreateService,
  useUpdateService,
  useToggleServiceActive,
  useDeleteService,
} from '@/hooks/useServices';
import { useServiceLines } from '@/hooks/useServiceLines';
import {
  useServiceRevenueModels,
  useCreateServiceRevenueModel,
  useUpdateServiceRevenueModel,
  useDeleteServiceRevenueModel,
} from '@/hooks/useServiceRevenueModels';
import { Service, CreateServiceInput } from '@/types/service';
import {
  ServiceRevenueModel,
  CreateServiceRevenueModelInput,
  REVENUE_MODEL_LABELS,
} from '@/types/serviceRevenueModel';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type DeleteTarget =
  | { kind: 'service'; entity: Service }
  | { kind: 'model'; entity: ServiceRevenueModel };

const DELETE_LABELS: Record<DeleteTarget['kind'], string> = {
  service: 'serviço',
  model: 'modelo de receita',
};

// ─── Revenue model row ──────────────────────────────────────────────────────────

interface ModelRowProps {
  model: ServiceRevenueModel;
  canManage: boolean;
  onEdit: (m: ServiceRevenueModel) => void;
  onDelete: (m: ServiceRevenueModel) => void;
}

function ModelRow({ model, canManage, onEdit, onDelete }: ModelRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border bg-card px-3 py-2 transition-opacity',
        !model.isActive && 'opacity-60'
      )}
    >
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <Badge variant="outline" className="text-xs font-medium shrink-0">
          {REVENUE_MODEL_LABELS[model.modelType]}
        </Badge>
        {!model.isActive && (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-muted text-muted-foreground shrink-0">
            Inativo
          </span>
        )}
      </div>

      {canManage && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(model)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(model)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

const ServiceLineDetail = () => {
  const { lineId = '' } = useParams<{ lineId: string }>();
  const navigate = useNavigate();
  const { employee } = useAuth();
  const canManage = employee?.isAdmin ?? false;

  const { data: serviceLines = [], isLoading: linesLoading } = useServiceLines();
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { data: models = [], isLoading: modelsLoading } = useServiceRevenueModels();

  const createService = useCreateService();
  const updateService = useUpdateService();
  const toggleService = useToggleServiceActive();
  const deleteService = useDeleteService();

  const createModel = useCreateServiceRevenueModel();
  const updateModel = useUpdateServiceRevenueModel();
  const deleteModel = useDeleteServiceRevenueModel();

  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [modelFormOpen, setModelFormOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ServiceRevenueModel | null>(null);
  const [modelFormServiceId, setModelFormServiceId] = useState<string>('');

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedServices, setCollapsedServices] = useState<Record<string, boolean>>({});

  const isLoading = linesLoading || servicesLoading || modelsLoading;
  const line = serviceLines.find((l) => l.id === lineId);

  const lineName =
    line?.name === 'Serviços Gerais' ? 'Serviços Prestados' : line?.name ?? '';

  const lineDescription = (() => {
    if (!line?.description) return 'Serviços e modelos de cobrança desta linha.';
    if (line.description === 'Linha padrão criada na migração do catálogo (HU-001).')
      return 'Serviços entregues pela empresa. Cada serviço possui um modelo de cobrança que define como é precificado.';
    return line.description;
  })();

  const tree = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const matches = (text: string) => search === '' || text.toLowerCase().includes(search);

    return services
      .filter((s) => s.serviceLineId === lineId)
      .map((service) => {
        const serviceMatch = matches(service.name);
        const serviceModels = models.filter((m) => m.serviceId === service.id);
        const visibleModels = serviceMatch
          ? serviceModels
          : serviceModels.filter((m) => matches(m.name) || matches(REVENUE_MODEL_LABELS[m.modelType]));
        const activeModelCount = models.filter((m) => m.serviceId === service.id && m.isActive).length;
        return { service, visibleModels, serviceMatch, activeModelCount };
      })
      .filter((s) => s.serviceMatch || s.visibleModels.length > 0);
  }, [services, models, lineId, searchTerm]);

  const isFiltering = searchTerm !== '';

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const openNewService = () => {
    setSelectedService(null);
    setServiceFormOpen(true);
  };
  const openEditService = (service: Service) => {
    setSelectedService(service);
    setServiceFormOpen(true);
  };
  const submitService = (data: CreateServiceInput) => {
    if (selectedService) {
      updateService.mutate(
        { id: selectedService.id, updates: data },
        { onSuccess: () => setServiceFormOpen(false) }
      );
    } else {
      createService.mutate(data, { onSuccess: () => setServiceFormOpen(false) });
    }
  };

  const openNewModel = (serviceId: string) => {
    setSelectedModel(null);
    setModelFormServiceId(serviceId);
    setModelFormOpen(true);
  };
  const openEditModel = (model: ServiceRevenueModel) => {
    setSelectedModel(model);
    setModelFormServiceId(model.serviceId);
    setModelFormOpen(true);
  };
  const submitModel = (data: CreateServiceRevenueModelInput) => {
    if (selectedModel) {
      updateModel.mutate(
        { id: selectedModel.id, updates: data },
        { onSuccess: () => setModelFormOpen(false) }
      );
    } else {
      createModel.mutate(data, { onSuccess: () => setModelFormOpen(false) });
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const onSuccess = () => setDeleteTarget(null);
    if (deleteTarget.kind === 'service') deleteService.mutate({ id: deleteTarget.entity.id }, { onSuccess });
    if (deleteTarget.kind === 'model') deleteModel.mutate({ id: deleteTarget.entity.id }, { onSuccess });
  };

  const toggleServiceCollapse = (id: string) =>
    setCollapsedServices((p) => ({ ...p, [id]: !p[id] }));

  const deleteIsLoading = deleteService.isPending || deleteModel.isPending;

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <AppLayout
        title="Serviços"
        breadcrumbs={[
          { label: 'Comercial', href: '/comercial' },
          { label: 'Linhas de Serviço', href: '/comercial/servicos' },
        ]}
      >
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[56px] w-full rounded-lg" />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!line) {
    return (
      <AppLayout
        title="Linha não encontrada"
        breadcrumbs={[
          { label: 'Comercial', href: '/comercial' },
          { label: 'Linhas de Serviço', href: '/comercial/servicos' },
        ]}
      >
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <p className="text-base font-semibold">Linha de serviço não encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">Ela pode ter sido removida.</p>
          <Button className="mt-5" variant="outline" onClick={() => navigate('/comercial/servicos')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Voltar para Linhas de Serviço
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={lineName}
      description={lineDescription}
      breadcrumbs={[
        { label: 'Comercial', href: '/comercial' },
        { label: 'Linhas de Serviço', href: '/comercial/servicos' },
        { label: lineName },
      ]}
      actions={
        canManage ? (
          <Button onClick={openNewService} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Serviço
          </Button>
        ) : undefined
      }
    >
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 -ml-2 text-muted-foreground"
          onClick={() => navigate('/comercial/servicos')}
        >
          <ArrowLeft className="h-4 w-4" />
          Linhas de Serviço
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar serviços ou modelos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Empty states */}
      {tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="rounded-full bg-muted p-5 mb-4">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold">
            {isFiltering ? 'Nenhum serviço encontrado' : 'Nenhum serviço nesta linha'}
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {isFiltering
              ? 'Tente ajustar o termo de busca.'
              : canManage
              ? 'Adicione o primeiro serviço desta linha.'
              : 'Aguarde um administrador cadastrar serviços nesta linha.'}
          </p>
          {canManage && !isFiltering && (
            <Button className="mt-5" onClick={openNewService}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Serviço
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {tree.map(({ service, visibleModels }) => {
            const serviceCollapsed = !!collapsedServices[service.id];
            return (
              <div
                key={service.id}
                className={cn(
                  'rounded-md border bg-card transition-opacity',
                  !service.isActive && 'opacity-60'
                )}
              >
                {/* Service header */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    onClick={() => toggleServiceCollapse(service.id)}
                  >
                    {serviceCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{service.name}</span>
                    {!service.isActive && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-muted text-muted-foreground shrink-0"
                      >
                        Inativo
                      </Badge>
                    )}
                  </button>

                  {canManage && (
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openNewModel(service.id)}>
                            Adicionar modelo
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditService(service)}>
                            Editar serviço
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              toggleService.mutate({ id: service.id, isActive: !service.isActive })
                            }
                          >
                            {service.isActive ? 'Desativar serviço' : 'Ativar serviço'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              setDeleteTarget({ kind: 'service', entity: service })
                            }
                          >
                            Excluir serviço
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {/* Models */}
                {!serviceCollapsed && (
                  <div className="px-3 pb-3 pl-9 space-y-1.5">
                    {visibleModels.length === 0 ? (
                      <div className="flex items-center gap-2 py-1">
                        <p className="text-xs text-muted-foreground">Nenhum modelo de receita cadastrado para este serviço.</p>
                        {canManage && (
                          <button
                            onClick={() => openNewModel(service.id)}
                            className="text-xs text-primary hover:underline"
                          >
                            Adicionar agora
                          </button>
                        )}
                      </div>
                    ) : (
                      visibleModels.map((model) => (
                        <ModelRow
                          key={model.id}
                          model={model}
                          canManage={canManage}
                          onEdit={openEditModel}
                          onDelete={(m) => setDeleteTarget({ kind: 'model', entity: m })}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <ServiceFormDialog
        open={serviceFormOpen}
        onOpenChange={setServiceFormOpen}
        service={selectedService}
        serviceLines={line ? [line] : []}
        defaultServiceLineId={lineId}
        onSubmit={submitService}
        isLoading={createService.isPending || updateService.isPending}
      />

      <RevenueModelFormDialog
        open={modelFormOpen}
        onOpenChange={setModelFormOpen}
        serviceId={modelFormServiceId}
        model={selectedModel}
        onSubmit={submitModel}
        isLoading={createModel.isPending || updateModel.isPending}
      />

      <DeleteCatalogItemDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemLabel={deleteTarget ? DELETE_LABELS[deleteTarget.kind] : ''}
        itemName={deleteTarget?.entity.name ?? ''}
        onConfirm={confirmDelete}
        isLoading={deleteIsLoading}
      />
    </AppLayout>
  );
};

export default ServiceLineDetail;
