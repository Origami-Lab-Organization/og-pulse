import { useState, useEffect } from 'react';
import { Plus, Briefcase, Trash2, Info, Pencil } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ServiceFormDialog } from '@/components/services/ServiceFormDialog';
import { DeleteServiceDialog } from '@/components/services/DeleteServiceDialog';
import {
  useServices,
  useSeedDefaultServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from '@/hooks/useServices';
import { Service, CreateServiceInput, PROJECT_TYPE_LABELS } from '@/types/service';
import { formatCurrency } from '@/lib/masks';
import { ProjectType } from '@/types/project';
import { useAuth } from '@/contexts/AuthContext';

const PROJECT_TYPE_ORDER: ProjectType[] = ['fixed_scope', 'continuous', 'success_fee', 'non_revenue'];

const TYPE_DESCRIPTIONS: Record<ProjectType, string> = {
  fixed_scope:
    'Projetos com valor e entrega fechados. A receita é reconhecida conforme as parcelas ou marcos entregues. Usado em projetos de implementação, desenvolvimento e consultoria pontual.',
  continuous:
    'Contrato de retainer com cobrança mensal recorrente. A receita é reconhecida mês a mês durante a vigência do contrato. Ideal para suporte contínuo, gestão de TI e squads alocados.',
  success_fee:
    'Receita vinculada a um evento ou resultado específico (ex: aprovação em Lei do Bem, captação de recursos). Reconhecida quando o marco é atingido. Gera milestones no projeto.',
  non_revenue:
    'Projetos internos, descobertas ou pré-vendas que não geram receita direta. Usados para rastrear esforço e custo sem expectativa de faturamento.',
};

const Services = () => {
  const { employee } = useAuth();
  const canManage = employee?.is_gerente ?? false;

  const { data: services = [], isLoading } = useServices();
  const seedDefaults = useSeedDefaultServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    if (!isLoading && services.length === 0 && canManage && !seedDefaults.isPending) {
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

  const handleDelete = (e: React.MouseEvent, service: Service) => {
    e.stopPropagation();
    setSelectedService(service);
    setDeleteOpen(true);
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

  const handleDeleteConfirm = () => {
    if (selectedService) {
      deleteService.mutate(
        { id: selectedService.id },
        { onSuccess: () => setDeleteOpen(false) }
      );
    }
  };

  if (isLoading || seedDefaults.isPending) {
    return (
      <AppLayout
        title="Serviços"
        description="Catálogo de serviços oferecidos pela empresa"
        breadcrumbs={[{ label: 'Comercial', href: '/comercial' }, { label: 'Serviços' }]}
      >
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const grouped = PROJECT_TYPE_ORDER.reduce<Record<ProjectType, Service[]>>(
    (acc, type) => {
      acc[type] = services.filter((s) => s.projectType === type);
      return acc;
    },
    {} as Record<ProjectType, Service[]>
  );

  return (
    <AppLayout
      title="Serviços"
      description="Catálogo de serviços oferecidos pela empresa"
      breadcrumbs={[{ label: 'Comercial', href: '/comercial' }, { label: 'Serviços' }]}
    >
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Serviços</CardTitle>
            <CardDescription>
              Defina os serviços que sua empresa oferece e o modelo de cobrança de cada um.
            </CardDescription>
          </div>
          {canManage && (
            <Button onClick={handleAdd} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar Serviço
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="rounded-full bg-muted p-4 mb-3 w-fit mx-auto">
                <Briefcase className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhum serviço cadastrado</p>
              <p className="text-xs mt-1">
                {canManage
                  ? 'Clique em "Adicionar Serviço" para começar.'
                  : 'Aguarde um administrador cadastrar serviços.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              {/* Column headers */}
              <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
                <span className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Serviço</span>
                <span className="w-36 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Preço Unitário</span>
                {canManage && <span className="w-20" />}
              </div>

              {PROJECT_TYPE_ORDER.map((type) => {
                const group = grouped[type];
                if (group.length === 0) return null;

                return (
                  <div key={type} className="border-t first:border-t-0">
                    {/* Section header */}
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {PROJECT_TYPE_LABELS[type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {group.length} serviço{group.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="text-xs leading-relaxed">{TYPE_DESCRIPTIONS[type]}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Service rows */}
                    {group.map((service) => (
                      <div
                        key={service.id}
                        className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 border-t"
                      >
                        {/* Name + description */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{service.name}</p>
                          {service.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{service.description}</p>
                          )}
                        </div>

                        {/* Unit price */}
                        <div className="w-36 text-right shrink-0">
                          {service.unitPrice ? (
                            <span className="text-sm font-medium">{formatCurrency(service.unitPrice)}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>

                        {/* Actions */}
                        {canManage && (
                          <div className="w-20 flex items-center justify-end gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(service)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={(e) => handleDelete(e, service)}
                                    disabled={services.length <= 1}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {services.length <= 1 && (
                                <TooltipContent>
                                  <p>É necessário ao menos um serviço</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
