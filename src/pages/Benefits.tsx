import { useState, useMemo } from 'react';
import { Plus, Gift, Pencil, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BenefitFormDialog } from '@/components/benefits/BenefitFormDialog';
import {
  useBenefits,
  useCreateBenefit,
  useUpdateBenefit,
  useToggleBenefitActive,
  useDeleteBenefit,
} from '@/hooks/useBenefits';
import { Benefit, CreateBenefitInput } from '@/types/benefit';
import { formatCurrency } from '@/lib/masks';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'inactive';

const Benefits = () => {
  const { data: benefits = [], isLoading } = useBenefits();
  const createBenefit = useCreateBenefit();
  const updateBenefit = useUpdateBenefit();
  const toggleActive = useToggleBenefitActive();
  const deleteBenefit = useDeleteBenefit();

  const [formOpen, setFormOpen] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAdd = () => {
    setSelectedBenefit(null);
    setFormOpen(true);
  };

  const handleEdit = (benefit: Benefit) => {
    setSelectedBenefit(benefit);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: CreateBenefitInput) => {
    if (selectedBenefit) {
      updateBenefit.mutate(
        { id: selectedBenefit.id, updates: data },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      createBenefit.mutate(data, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleToggleActive = (benefit: Benefit) => {
    toggleActive.mutate({ id: benefit.id, isActive: !benefit.isActive });
  };

  const handleDelete = (id: string) => {
    deleteBenefit.mutate({ id }, { onSuccess: () => setConfirmDeleteId(null) });
  };

  const filtered = useMemo(() => {
    return benefits.filter((b) => {
      if (statusFilter === 'active' && !b.isActive) return false;
      if (statusFilter === 'inactive' && b.isActive) return false;
      if (searchTerm && !b.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [benefits, statusFilter, searchTerm]);

  if (isLoading) {
    return (
      <AppLayout
        title="Benefícios"
        description="Catálogo de benefícios da empresa"
        breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Benefícios' }]}
      >
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[64px] w-full rounded-lg" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Benefícios"
      description="Catálogo de benefícios da empresa"
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Benefícios' }]}
      actions={
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Adicionar Benefício
        </Button>
      }
    >
      {/* Search + status filter */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar benefícios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
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
      </div>

      {/* Empty state */}
      {benefits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="rounded-full bg-muted p-5 mb-4">
            <Gift className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold">Nenhum benefício cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Adicione os benefícios oferecidos pela empresa para vinculá-los aos funcionários.
          </p>
          <Button className="mt-5" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar Benefício
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Nenhum benefício encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">Tente ajustar os filtros ou o termo de busca.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((benefit) => (
            <div
              key={benefit.id}
              className={cn(
                'group flex items-center gap-4 rounded-lg border bg-card px-4 py-3 transition-all',
                'hover:shadow-sm hover:border-border/80 cursor-default',
                !benefit.isActive && 'opacity-60'
              )}
              onClick={() => handleEdit(benefit)}
            >
              {/* Name + description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{benefit.name}</p>
                  {!benefit.isActive && (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-gray-100 text-gray-500 border-gray-200 shrink-0">
                      Inativo
                    </span>
                  )}
                </div>
                {benefit.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-lg">
                    {benefit.description}
                  </p>
                )}
              </div>

              {/* Value */}
              <div className="shrink-0 text-right min-w-[100px]">
                <span className="text-sm font-medium tabular-nums">
                  {formatCurrency(benefit.value)}
                  <span className="text-xs text-muted-foreground font-normal">/mês</span>
                </span>
              </div>

              {/* Actions */}
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
                      onClick={() => handleEdit(benefit)}
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
                        checked={benefit.isActive}
                        onCheckedChange={() => handleToggleActive(benefit)}
                        disabled={toggleActive.isPending}
                        className="scale-90"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{benefit.isActive ? 'Desativar' : 'Ativar'}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      <BenefitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        benefit={selectedBenefit}
        onSubmit={handleFormSubmit}
        isLoading={createBenefit.isPending || updateBenefit.isPending}
      />
    </AppLayout>
  );
};

export default Benefits;
