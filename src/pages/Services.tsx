import { useState, useMemo } from 'react';
import {
  Plus,
  Layers,
  Briefcase,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ServiceFormDialog } from '@/components/services/ServiceFormDialog';
import { ServiceLineFormDialog } from '@/components/services/ServiceLineFormDialog';
import { RevenueModelFormDialog } from '@/components/services/RevenueModelFormDialog';
import { DeleteCatalogItemDialog } from '@/components/services/DeleteCatalogItemDialog';
import {
  useServices,
  useCreateService,
  useUpdateService,
  useToggleServiceActive,
  useDeleteService,
} from '@/hooks/useServices';
import {
  useServiceLines,
  useCreateServiceLine,
  useUpdateServiceLine,
  useToggleServiceLineActive,
  useDeleteServiceLine,
} from '@/hooks/useServiceLines';
import {
  useServiceRevenueModels,
  useCreateServiceRevenueModel,
  useUpdateServiceRevenueModel,
  useToggleServiceRevenueModelActive,
  useDeleteServiceRevenueModel,
} from '@/hooks/useServiceRevenueModels';
import { Service, CreateServiceInput } from '@/types/service';
import { ServiceLine, CreateServiceLineInput } from '@/types/serviceLine';
import {
  ServiceRevenueModel,
  CreateServiceRevenueModelInput,
  REVENUE_MODEL_LABELS,
  modelValueText,
} from '@/types/serviceRevenueModel';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'inactive';

type DeleteTarget =
  | { kind: 'line'; entity: ServiceLine }
  | { kind: 'service'; entity: Service }
  | { kind: 'model'; entity: ServiceRevenueModel };

const DELETE_LABELS: Record<DeleteTarget['kind'], string> = {
  line: 'linha de serviço',
  service: 'serviço',
  model: 'modelo de receita',
};

// ─── Revenue model row ───────────────────────────────────────────────────────────

interface ModelRowProps {
  model: ServiceRevenueModel;
  canManage: boolean;
  onEdit: (m: ServiceRevenueModel) => void;
  onToggle: (m: ServiceRevenueModel) => void;
  onDelete: (m: ServiceRevenueModel) => void;
  isToggling: boolean;
}

function ModelRow({ model, canManage, onEdit, onToggle, onDelete, isToggling }: ModelRowProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-md border bg-card px-3 py-2 transition-all hover:shadow-sm',
        !model.isActive && 'opacity-60'
      )}
    >
      <Badge variant="outline" className="text-xs font-medium shrink-0">
        {REVENUE_MODEL_LABELS[model.modelType]}
      </Badge>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate">{model.name}</span>
        {!model.isActive && (
          <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-muted text-muted-foreground">
            Inativo
          </span>
        )}
      </div>
      <span className="shrink-0 text-sm tabular-nums text-foreground">{modelValueText(model)}</span>

      {canManage && (
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(model)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar modelo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={model.isActive}
                  onCheckedChange={() => onToggle(model)}
                  disabled={isToggling}
                  className="scale-90"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>{model.isActive ? 'Desativar' : 'Ativar'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(model)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir modelo</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const Services = () => {
  const { employee } = useAuth();
  const canManage = employee?.isAdmin ?? false;

  const { data: serviceLines = [], isLoading: linesLoading } = useServiceLines();
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { data: models = [], isLoading: modelsLoading } = useServiceRevenueModels();

  const createLine = useCreateServiceLine();
  const updateLine = useUpdateServiceLine();
  const toggleLine = useToggleServiceLineActive();
  const deleteLine = useDeleteServiceLine();

  const createService = useCreateService();
  const updateService = useUpdateService();
  const toggleService = useToggleServiceActive();
  const deleteService = useDeleteService();

  const createModel = useCreateServiceRevenueModel();
  const updateModel = useUpdateServiceRevenueModel();
  const toggleModel = useToggleServiceRevenueModelActive();
  const deleteModel = useDeleteServiceRevenueModel();

  // Dialog state
  const [lineFormOpen, setLineFormOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<ServiceLine | null>(null);

  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceFormLineId, setServiceFormLineId] = useState<string | undefined>(undefined);

  const [modelFormOpen, setModelFormOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ServiceRevenueModel | null>(null);
  const [modelFormServiceId, setModelFormServiceId] = useState<string>('');

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(canManage ? 'active' : 'active');
  const [collapsedLines, setCollapsedLines] = useState<Record<string, boolean>>({});
  const [collapsedServices, setCollapsedServices] = useState<Record<string, boolean>>({});

  const isLoading = linesLoading || servicesLoading || modelsLoading;

  const activeLines = useMemo(() => serviceLines.filter((l) => l.isActive), [serviceLines]);

  // Build filtered hierarchy
  const search = searchTerm.trim().toLowerCase();
  const isFiltering = search !== '' || statusFilter !== 'all';

  const tree = useMemo(() => {
    const statusOk = (active: boolean) =>
      statusFilter === 'all' ? true : statusFilter === 'active' ? active : !active;
    const matches = (text: string) => search === '' || text.toLowerCase().includes(search);

    return serviceLines
      .filter((line) => statusOk(line.isActive))
      .map((line) => {
        const lineMatch = matches(line.name);
        const lineServices = services
          .filter((s) => s.serviceLineId === line.id && statusOk(s.isActive))
          .map((service) => {
            const serviceMatch = matches(service.name);
            const serviceModels = models.filter(
              (m) => m.serviceId === service.id && statusOk(m.isActive)
            );
            const visibleModels =
              lineMatch || serviceMatch
                ? serviceModels
                : serviceModels.filter((m) => matches(m.name) || matches(REVENUE_MODEL_LABELS[m.modelType]));
            const activeModelCount = models.filter(
              (m) => m.serviceId === service.id && m.isActive
            ).length;
            return { service, models: serviceModels, visibleModels, serviceMatch, activeModelCount };
          })
          .filter((s) => lineMatch || s.serviceMatch || s.visibleModels.length > 0);
        return { line, lineMatch, services: lineServices };
      })
      .filter((l) => l.lineMatch || l.services.length > 0);
  }, [serviceLines, services, models, statusFilter, search]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const openNewLine = () => {
    setSelectedLine(null);
    setLineFormOpen(true);
  };
  const openEditLine = (line: ServiceLine) => {
    setSelectedLine(line);
    setLineFormOpen(true);
  };
  const submitLine = (data: CreateServiceLineInput) => {
    if (selectedLine) {
      updateLine.mutate({ id: selectedLine.id, updates: data }, { onSuccess: () => setLineFormOpen(false) });
    } else {
      createLine.mutate(data, { onSuccess: () => setLineFormOpen(false) });
    }
  };

  const openNewService = (lineId?: string) => {
    setSelectedService(null);
    setServiceFormLineId(lineId);
    setServiceFormOpen(true);
  };
  const openEditService = (service: Service) => {
    setSelectedService(service);
    setServiceFormLineId(service.serviceLineId ?? undefined);
    setServiceFormOpen(true);
  };
  const submitService = (data: CreateServiceInput) => {
    if (selectedService) {
      updateService.mutate({ id: selectedService.id, updates: data }, { onSuccess: () => setServiceFormOpen(false) });
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
      updateModel.mutate({ id: selectedModel.id, updates: data }, { onSuccess: () => setModelFormOpen(false) });
    } else {
      createModel.mutate(data, { onSuccess: () => setModelFormOpen(false) });
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const onSuccess = () => setDeleteTarget(null);
    if (deleteTarget.kind === 'line') deleteLine.mutate({ id: deleteTarget.entity.id }, { onSuccess });
    if (deleteTarget.kind === 'service') deleteService.mutate({ id: deleteTarget.entity.id }, { onSuccess });
    if (deleteTarget.kind === 'model') deleteModel.mutate({ id: deleteTarget.entity.id }, { onSuccess });
  };

  const toggleLineCollapse = (id: string) =>
    setCollapsedLines((p) => ({ ...p, [id]: !p[id] }));
  const toggleServiceCollapse = (id: string) =>
    setCollapsedServices((p) => ({ ...p, [id]: !p[id] }));

  const deleteIsLoading = deleteLine.isPending || deleteService.isPending || deleteModel.isPending;

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <AppLayout
        title="Serviços"
        description="Catálogo de serviços organizado por Linha → Serviço → Modelo de Receita"
        breadcrumbs={[{ label: 'Comercial', href: '/comercial' }, { label: 'Serviços' }]}
      >
        <div className="space-y-6">
          {[...Array(2)].map((_, g) => (
            <div key={g} className="space-y-2">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-[56px] w-full rounded-lg" />
              <Skeleton className="h-[56px] w-full rounded-lg" />
            </div>
          ))}
        </div>
      </AppLayout>
    );
  }

  const hasAnyLine = serviceLines.length > 0;

  return (
    <AppLayout
      title="Serviços"
      description="Catálogo de serviços organizado por Linha → Serviço → Modelo de Receita"
      breadcrumbs={[{ label: 'Comercial', href: '/comercial' }, { label: 'Serviços' }]}
      actions={
        canManage ? (
          <Button onClick={openNewLine} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Linha de Serviço
          </Button>
        ) : undefined
      }
    >
      {/* Search + status filter */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar linhas, serviços ou modelos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  statusFilter === s
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                )}
              >
                {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty states */}
      {!hasAnyLine ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="rounded-full bg-muted p-5 mb-4">
            <Layers className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold">Nenhuma linha de serviço cadastrada</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {canManage
              ? 'Crie sua primeira Linha de Serviço (ex.: Ventures, Product Studio) para começar a organizar o portfólio.'
              : 'Aguarde um administrador organizar o catálogo de serviços.'}
          </p>
          {canManage && (
            <Button className="mt-5" onClick={openNewLine}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Linha de Serviço
            </Button>
          )}
        </div>
      ) : tree.length === 0 && isFiltering ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Nenhum resultado encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">Tente ajustar os filtros ou o termo de busca.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {tree.map(({ line, services: lineServices }) => {
            const lineCollapsed = !!collapsedLines[line.id];
            return (
              <div key={line.id} className="rounded-lg border bg-muted/20">
                {/* Line header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-l-4 border-l-primary/70">
                  <button
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    onClick={() => toggleLineCollapse(line.id)}
                  >
                    {lineCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <Layers className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold truncate">{line.name}</span>
                    {!line.isActive && (
                      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground shrink-0">
                        Inativa
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {lineServices.length} serviço{lineServices.length !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openNewService(line.id)}>
                            <Plus className="h-3.5 w-3.5" /> Serviço
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Adicionar serviço a esta linha</TooltipContent>
                      </Tooltip>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLine(line)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Switch
                              checked={line.isActive}
                              onCheckedChange={() => toggleLine.mutate({ id: line.id, isActive: !line.isActive })}
                              disabled={toggleLine.isPending}
                              className="scale-90"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{line.isActive ? 'Desativar linha' : 'Ativar linha'}</TooltipContent>
                      </Tooltip>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget({ kind: 'line', entity: line })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Services */}
                {!lineCollapsed && (
                  <div className="px-3 pb-3 pt-1 space-y-2">
                    {lineServices.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-3">
                        Nenhum serviço nesta linha.
                      </p>
                    )}
                    {lineServices.map(({ service, visibleModels, activeModelCount }) => {
                      const serviceCollapsed = !!collapsedServices[service.id];
                      const noActiveModel = activeModelCount === 0;
                      return (
                        <div key={service.id} className="rounded-md border bg-card">
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
                                <Badge variant="outline" className="text-xs bg-muted text-muted-foreground shrink-0">
                                  Inativo
                                </Badge>
                              )}
                              {noActiveModel && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs text-amber-800 shrink-0 dark:bg-amber-900/30 dark:text-amber-400">
                                      <AlertTriangle className="h-3 w-3" /> Sem modelo de receita
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Este serviço não aparece no orçamento até ter um modelo de receita ativo.
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </button>

                            {canManage && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openNewModel(service.id)}>
                                      <Plus className="h-3.5 w-3.5" /> Modelo
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Adicionar modelo de receita</TooltipContent>
                                </Tooltip>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditService(service)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Switch
                                        checked={service.isActive}
                                        onCheckedChange={() => toggleService.mutate({ id: service.id, isActive: !service.isActive })}
                                        disabled={toggleService.isPending}
                                        className="scale-90"
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>{service.isActive ? 'Desativar serviço' : 'Ativar serviço'}</TooltipContent>
                                </Tooltip>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteTarget({ kind: 'service', entity: service })}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Models */}
                          {!serviceCollapsed && (
                            <div className="px-3 pb-3 pl-9 space-y-1.5">
                              {visibleModels.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-1">
                                  Nenhum modelo de receita cadastrado.
                                </p>
                              ) : (
                                visibleModels.map((model) => (
                                  <ModelRow
                                    key={model.id}
                                    model={model}
                                    canManage={canManage}
                                    onEdit={openEditModel}
                                    onToggle={(m) => toggleModel.mutate({ id: m.id, isActive: !m.isActive })}
                                    onDelete={(m) => setDeleteTarget({ kind: 'model', entity: m })}
                                    isToggling={toggleModel.isPending}
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
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <ServiceLineFormDialog
        open={lineFormOpen}
        onOpenChange={setLineFormOpen}
        serviceLine={selectedLine}
        onSubmit={submitLine}
        isLoading={createLine.isPending || updateLine.isPending}
      />

      <ServiceFormDialog
        open={serviceFormOpen}
        onOpenChange={setServiceFormOpen}
        service={selectedService}
        serviceLines={activeLines}
        defaultServiceLineId={serviceFormLineId}
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

export default Services;
