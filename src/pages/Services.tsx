import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Briefcase,
  Pencil,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ServiceFormDialog } from '@/components/services/ServiceFormDialog';
import { DeleteServiceDialog } from '@/components/services/DeleteServiceDialog';
import {
  useServices,
  useSeedDefaultServices,
  useCreateService,
  useUpdateService,
  useToggleServiceActive,
  useDeleteService,
} from '@/hooks/useServices';
import { Service, CreateServiceInput, BillingType, BILLING_TYPE_LABELS } from '@/types/service';
import { formatCurrency } from '@/lib/masks';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const BILLING_TYPE_ORDER: BillingType[] = ['fixed_scope', 'recurring', 'success_fee', 'no_revenue'];

const TYPE_BADGE_CLASSES: Record<BillingType, string> = {
  fixed_scope: 'bg-green-100 text-green-800 border-green-200',
  recurring: 'bg-blue-100 text-blue-800 border-blue-200',
  success_fee: 'bg-amber-100 text-amber-800 border-amber-200',
  no_revenue: 'bg-gray-100 text-gray-600 border-gray-200',
};

const TYPE_HEADER_CLASSES: Record<BillingType, string> = {
  fixed_scope: 'border-l-green-500',
  recurring: 'border-l-blue-500',
  success_fee: 'border-l-amber-500',
  no_revenue: 'border-l-gray-400',
};

const PERIOD_LABELS: Record<string, string> = {
  monthly: '/mês',
  quarterly: '/trimestre',
  semiannual: '/semestre',
  annual: '/ano',
};

type StatusFilter = 'all' | 'active' | 'inactive';

// ─── Value display helper ─────────────────────────────────────────────────────

function ServiceValueBadge({ service }: { service: Service }) {
  if (service.billingType === 'no_revenue') {
    return (
      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 border-gray-200">
        Sem cobrança
      </span>
    );
  }

  if (!service.hasDefaultValue || service.defaultValue == null) {
    return (
      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 border-gray-200">
        Valor definido no lead
      </span>
    );
  }

  let valueText = '';

  if (service.billingUnit === '%') {
    valueText = `${service.defaultValue.toFixed(2).replace('.', ',')}%`;
  } else {
    valueText = formatCurrency(service.defaultValue);
  }

  const periodSuffix =
    service.billingUnit && service.billingUnit !== '%' && service.billingUnit !== 'R$'
      ? PERIOD_LABELS[service.billingUnit] ?? ''
      : '';

  const contextSuffix =
    service.billingType === 'fixed_scope'
      ? ' por projeto'
      : periodSuffix
      ? periodSuffix
      : '';

  return (
    <span className="text-sm font-medium text-foreground tabular-nums">
      {valueText}
      <span className="text-xs text-muted-foreground font-normal">{contextSuffix}</span>
    </span>
  );
}

// ─── Service card ─────────────────────────────────────────────────────────────

interface ServiceCardProps {
  service: Service;
  canManage: boolean;
  onEdit: (service: Service) => void;
  onToggleActive: (service: Service) => void;
  isToggling: boolean;
}

function ServiceCard({ service, canManage, onEdit, onToggleActive, isToggling }: ServiceCardProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-4 rounded-lg border bg-card px-4 py-3 transition-all',
        'hover:shadow-sm hover:border-border/80 cursor-default',
        !service.isActive && 'opacity-60'
      )}
      onClick={() => canManage && onEdit(service)}
    >
      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{service.name}</p>
          {!service.isActive && (
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-gray-100 text-gray-500 border-gray-200 shrink-0">
              Inativo
            </span>
          )}
        </div>
        {service.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-lg">
            {service.description}
          </p>
        )}
      </div>

      {/* Value */}
      <div className="shrink-0 text-right min-w-[120px]">
        <ServiceValueBadge service={service} />
      </div>

      {/* Actions */}
      {canManage && (
        <div
          className="flex items-center gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onEdit(service)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={service.isActive}
                  onCheckedChange={() => onToggleActive(service)}
                  disabled={isToggling}
                  className="scale-90"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>{service.isActive ? 'Desativar' : 'Ativar'}</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const Services = () => {
  const { employee } = useAuth();
  const canManage = employee?.is_gerente ?? false;

  const { data: services = [], isLoading } = useServices();
  const seedDefaults = useSeedDefaultServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const toggleActive = useToggleServiceActive();
  const deleteService = useDeleteService();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilters, setTypeFilters] = useState<BillingType[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [collapsed, setCollapsed] = useState<Partial<Record<BillingType, boolean>>>({});

  useEffect(() => {
    const activeServices = services.filter((s) => s.isActive);
    if (!isLoading && activeServices.length === 0 && canManage && !seedDefaults.isPending) {
      seedDefaults.mutate();
    }
  }, [isLoading, services.length]);

  const handleAdd = () => {
    setSelectedService(null);
    setFormOpen(true);
  };

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: CreateServiceInput) => {
    if (selectedService) {
      updateService.mutate(
        { id: selectedService.id, updates: data },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      createService.mutate(data, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleToggleActive = (service: Service) => {
    toggleActive.mutate({ id: service.id, isActive: !service.isActive });
  };

  const handleDeleteConfirm = () => {
    if (selectedService) {
      deleteService.mutate(
        { id: selectedService.id },
        { onSuccess: () => setDeleteOpen(false) }
      );
    }
  };

  const toggleTypeFilter = (type: BillingType) => {
    setTypeFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleCollapse = (type: BillingType) => {
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (statusFilter === 'active' && !s.isActive) return false;
      if (statusFilter === 'inactive' && s.isActive) return false;
      if (typeFilters.length > 0 && !typeFilters.includes(s.billingType)) return false;
      if (searchTerm && !s.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [services, statusFilter, typeFilters, searchTerm]);

  const grouped = useMemo(() => {
    return BILLING_TYPE_ORDER.reduce<Record<BillingType, Service[]>>(
      (acc, type) => {
        acc[type] = filtered.filter((s) => s.billingType === type);
        return acc;
      },
      {} as Record<BillingType, Service[]>
    );
  }, [filtered]);

  const hasAnyResults = filtered.length > 0;
  const isFiltering = searchTerm !== '' || typeFilters.length > 0 || statusFilter !== 'all';

  if (isLoading || seedDefaults.isPending) {
    return (
      <AppLayout
        title="Serviços"
        description="Catálogo de serviços oferecidos pela empresa"
        breadcrumbs={[{ label: 'Comercial', href: '/comercial' }, { label: 'Serviços' }]}
      >
        <div className="space-y-6">
          {[...Array(2)].map((_, g) => (
            <div key={g} className="space-y-2">
              <Skeleton className="h-10 w-48" />
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-[64px] w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Serviços"
      description="Catálogo de serviços oferecidos pela empresa"
      breadcrumbs={[{ label: 'Comercial', href: '/comercial' }, { label: 'Serviços' }]}
      actions={
        canManage ? (
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar Serviço
          </Button>
        ) : undefined
      }
    >
      {/* Search + filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
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

          <div className="h-4 w-px bg-border mx-1" />

          {/* Type filter chips */}
          {BILLING_TYPE_ORDER.map((type) => (
            <button
              key={type}
              onClick={() => toggleTypeFilter(type)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                typeFilters.includes(type)
                  ? TYPE_BADGE_CLASSES[type] + ' border-current'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
              )}
            >
              {BILLING_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="rounded-full bg-muted p-5 mb-4">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold">Nenhum serviço cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {canManage
              ? 'Adicione seu primeiro serviço para começar a montar o catálogo da empresa.'
              : 'Aguarde um administrador cadastrar serviços.'}
          </p>
          {canManage && (
            <Button className="mt-5" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar Serviço
            </Button>
          )}
        </div>
      ) : !hasAnyResults && isFiltering ? (
        /* No results for current filter */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Nenhum serviço encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">Tente ajustar os filtros ou o termo de busca.</p>
        </div>
      ) : (
        /* Groups */
        <div className="space-y-6">
          {BILLING_TYPE_ORDER.map((type) => {
            const group = grouped[type];
            if (group.length === 0) return null;
            const isCollapsed = !!collapsed[type];

            return (
              <div key={type}>
                {/* Group header */}
                <button
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg border-l-4 bg-muted/40 hover:bg-muted/60 transition-colors mb-2',
                    TYPE_HEADER_CLASSES[type]
                  )}
                  onClick={() => toggleCollapse(type)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <Badge
                    variant="outline"
                    className={cn('text-xs font-medium', TYPE_BADGE_CLASSES[type])}
                  >
                    {BILLING_TYPE_LABELS[type]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {group.length} serviço{group.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {/* Cards */}
                {!isCollapsed && (
                  <div className="space-y-2">
                    {group.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        canManage={canManage}
                        onEdit={handleEdit}
                        onToggleActive={handleToggleActive}
                        isToggling={toggleActive.isPending}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={selectedService}
        onSubmit={handleFormSubmit}
        isLoading={createService.isPending || updateService.isPending}
      />

      <DeleteServiceDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        serviceName={selectedService?.name ?? ''}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteService.isPending}
      />
    </AppLayout>
  );
};

export default Services;
