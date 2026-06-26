import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layers, Loader2, MoreHorizontal, Search, ChevronRight, PencilLine } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ServiceLineFormDialog } from '@/components/services/ServiceLineFormDialog';
import { ServiceSetupWizard } from '@/components/services/ServiceSetupWizard';
import { DeleteCatalogItemDialog } from '@/components/services/DeleteCatalogItemDialog';
import {
  useServiceLines,
  useCreateServiceLine,
  useUpdateServiceLine,
  useToggleServiceLineActive,
  useDeleteServiceLine,
} from '@/hooks/useServiceLines';
import { useServices } from '@/hooks/useServices';
import { useWizardDraft } from '@/hooks/useWizardDraft';
import { WizardDraft } from '@/components/services/wizard/types';
import { ServiceLine, CreateServiceLineInput } from '@/types/serviceLine';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'inactive';

const Services = () => {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const canManage = employee?.isAdmin ?? false;
  const tenantId = employee?.tenant_id;

  const { data: serviceLines = [], isLoading: linesLoading } = useServiceLines();
  const { data: services = [], isLoading: servicesLoading } = useServices();

  const createLine = useCreateServiceLine();
  const updateLine = useUpdateServiceLine();
  const toggleLine = useToggleServiceLineActive();
  const deleteLine = useDeleteServiceLine();

  const { getDraft, saveDraft, clearDraft } = useWizardDraft(tenantId);
  const [wizardDraft, setWizardDraft] = useState<WizardDraft | null>(() => getDraft());
  const [wizardInitialDraft, setWizardInitialDraft] = useState<WizardDraft | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<ServiceLine | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceLine | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ServiceLine | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const isLoading = linesLoading || servicesLoading;

  // Contagem de serviços (ativos) por linha
  const serviceCountByLine = useMemo(() => {
    return services.reduce<Record<string, number>>((acc, s) => {
      if (!s.serviceLineId || !s.isActive) return acc;
      acc[s.serviceLineId] = (acc[s.serviceLineId] ?? 0) + 1;
      return acc;
    }, {});
  }, [services]);

  const filteredLines = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return serviceLines.filter((line) => {
      if (statusFilter === 'active' && !line.isActive) return false;
      if (statusFilter === 'inactive' && line.isActive) return false;
      if (search && !line.name.toLowerCase().includes(search)) return false;
      return true;
    });
  }, [serviceLines, statusFilter, searchTerm]);

  const isFiltering = searchTerm !== '' || statusFilter !== 'all';

  const openNew = () => {
    setWizardInitialDraft(null);
    setWizardOpen(true);
  };
  const openEdit = (line: ServiceLine) => {
    setSelectedLine(line);
    setFormOpen(true);
  };
  const submitLine = (data: CreateServiceLineInput) => {
    if (selectedLine) {
      updateLine.mutate({ id: selectedLine.id, updates: data }, { onSuccess: () => setFormOpen(false) });
    } else {
      createLine.mutate(data, { onSuccess: () => setFormOpen(false) });
    }
  };
  const confirmDelete = () => {
    if (deleteTarget) {
      deleteLine.mutate({ id: deleteTarget.id }, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const confirmDeactivate = () => {
    if (deactivateTarget) {
      toggleLine.mutate(
        { id: deactivateTarget.id, isActive: false },
        { onSuccess: () => setDeactivateTarget(null) }
      );
    }
  };

  if (isLoading) {
    return (
      <AppLayout
        title="Linhas de Serviço"
        description="O catálogo de tudo que a empresa vende, organizado em Linhas de Serviço. Cada linha agrupa serviços com modelos de cobrança definidos."
        breadcrumbs={[{ label: 'Comercial', href: '/comercial' }, { label: 'Linhas de Serviço' }]}
      >
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[52px] w-full rounded-lg" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Linhas de Serviço"
      description="O catálogo de tudo que a empresa vende, organizado em Linhas de Serviço. Cada linha agrupa serviços com modelos de cobrança definidos."
      breadcrumbs={[{ label: 'Comercial', href: '/comercial' }, { label: 'Linhas de Serviço' }]}
      actions={
        canManage ? (
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Linha de Serviço
          </Button>
        ) : undefined
      }
    >
      {/* Draft banner */}
      {wizardDraft && canManage && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-4 dark:bg-amber-950/20 dark:border-amber-800">
          <PencilLine className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Rascunho não publicado — &quot;{wizardDraft.lineData?.name}&quot;
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Serviços em rascunho não estão disponíveis em oportunidades ou orçamentos.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
              onClick={() => {
                clearDraft();
                setWizardDraft(null);
              }}
            >
              Descartar
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setWizardInitialDraft(wizardDraft);
                setWizardOpen(true);
              }}
            >
              Continuar configuração
            </Button>
          </div>
        </div>
      )}

      {/* Search + status filter */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar linhas de serviço..."
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
                {s === 'all' ? 'Todas' : s === 'active' ? 'Ativas' : 'Inativas'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty states */}
      {serviceLines.length === 0 ? (
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
            <Button className="mt-5" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Linha de Serviço
            </Button>
          )}
        </div>
      ) : filteredLines.length === 0 && isFiltering ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Nenhuma linha encontrada</p>
          <p className="text-xs text-muted-foreground mt-1">Tente ajustar os filtros ou o termo de busca.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Linha de Serviço</TableHead>
                <TableHead className="w-28 text-center">Serviços</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLines.map((line) => (
                <TableRow
                  key={line.id}
                  className={cn('cursor-pointer', !line.isActive && 'opacity-60')}
                  onClick={() => navigate(`/comercial/servicos/${line.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Layers className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{line.name}</p>
                        {line.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-md">{line.description}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
                    {serviceCountByLine[line.id] ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        line.isActive
                          ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {line.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(line)}>
                              Editar nome
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {line.isActive ? (
                              <DropdownMenuItem onClick={() => setDeactivateTarget(line)}>
                                Desativar linha
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => toggleLine.mutate({ id: line.id, isActive: true })}
                              >
                                Ativar linha
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(line)}
                            >
                              Excluir linha
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ServiceSetupWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        initialDraft={wizardInitialDraft}
        onDraftSaved={(draft) => {
          saveDraft(draft);
          setWizardDraft(draft);
        }}
        onDraftAbandoned={() => {
          clearDraft();
          setWizardDraft(null);
        }}
        onCompleted={() => {
          clearDraft();
          setWizardDraft(null);
        }}
      />

      <ServiceLineFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        serviceLine={selectedLine}
        onSubmit={submitLine}
        isLoading={createLine.isPending || updateLine.isPending}
      />

      <DeleteCatalogItemDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemLabel="linha de serviço"
        itemName={deleteTarget?.name ?? ''}
        onConfirm={confirmDelete}
        isLoading={deleteLine.isPending}
      />

      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar &quot;{deactivateTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              A linha ficará oculta do portfólio ativo e não poderá ser usada em novos orçamentos.
              Linhas já em andamento em oportunidades não são afetadas. Você pode reativá-la a
              qualquer momento na aba Inativas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} disabled={toggleLine.isPending}>
              {toggleLine.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Services;
