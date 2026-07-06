import { useState, useMemo } from 'react';
import { Plus, Gift, Wrench, Pencil, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BenefitToolFormDialog, ItemType } from '@/components/benefits/BenefitToolFormDialog';
import {
  useBenefits,
  useCreateBenefit,
  useUpdateBenefit,
  useToggleBenefitActive,
} from '@/hooks/useBenefits';
import {
  useTools,
  useCreateTool,
  useUpdateTool,
  useToggleToolActive,
} from '@/hooks/useTools';
import { Benefit, CreateBenefitInput } from '@/types/benefit';
import { Tool, CreateToolInput } from '@/types/tool';
import { formatCurrency } from '@/lib/masks';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'inactive';

// ─── Item card (reutilizado para benefit e tool) ──────────────────────────────

interface ItemCardProps {
  name: string;
  description: string | null;
  value: number;
  isActive: boolean;
  isToggling: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
}

function ItemCard({ name, description, value, isActive, isToggling, onEdit, onToggleActive }: ItemCardProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-4 rounded-lg border bg-card px-4 py-3 transition-all',
        'hover:shadow-sm hover:border-border/80 cursor-default',
        !isActive && 'opacity-60'
      )}
      onClick={onEdit}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{name}</p>
          {!isActive && (
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-gray-100 text-gray-500 border-gray-200 shrink-0">
              Inativo
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-lg">{description}</p>
        )}
      </div>

      <div className="shrink-0 text-right min-w-[100px]">
        <span className="text-sm font-medium tabular-nums">
          {formatCurrency(value)}
          <span className="text-xs text-muted-foreground font-normal">/mês</span>
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onEdit}
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
                checked={isActive}
                onCheckedChange={onToggleActive}
                disabled={isToggling}
                className="scale-90"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>{isActive ? 'Desativar' : 'Ativar'}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// ─── Section (benefícios ou ferramentas) ─────────────────────────────────────

interface SectionProps {
  title: string;
  icon: React.ElementType;
  items: Array<Benefit | Tool>;
  statusFilter: StatusFilter;
  searchTerm: string;
  isToggling: boolean;
  onEdit: (item: Benefit | Tool) => void;
  onToggleActive: (item: Benefit | Tool) => void;
  onAdd: () => void;
  emptyDescription: string;
}

function Section({
  title, icon: Icon, items, statusFilter, searchTerm,
  isToggling, onEdit, onToggleActive, onAdd, emptyDescription,
}: SectionProps) {
  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (statusFilter === 'active' && !i.isActive) return false;
      if (statusFilter === 'inactive' && i.isActive) return false;
      if (searchTerm && !i.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [items, statusFilter, searchTerm]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
          <Icon className="h-7 w-7 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Nenhum item cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">{emptyDescription}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Adicionar
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center">
          <Search className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Nenhum resultado para os filtros aplicados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              name={item.name}
              description={item.description}
              value={item.value}
              isActive={item.isActive}
              isToggling={isToggling}
              onEdit={() => onEdit(item)}
              onToggleActive={() => onToggleActive(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const BenefitsAndTools = () => {
  const { data: benefits = [], isLoading: loadingBenefits } = useBenefits();
  const { data: tools = [], isLoading: loadingTools } = useTools();

  const createBenefit = useCreateBenefit();
  const updateBenefit = useUpdateBenefit();
  const toggleBenefit = useToggleBenefitActive();

  const createTool = useCreateTool();
  const updateTool = useUpdateTool();
  const toggleTool = useToggleToolActive();

  const [formOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Benefit | Tool | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType>('benefit');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [typeFilter, setTypeFilter] = useState<'all' | 'benefit' | 'tool'>('all');

  const isLoading = loadingBenefits || loadingTools;
  const isSaving =
    createBenefit.isPending || updateBenefit.isPending ||
    createTool.isPending || updateTool.isPending;

  const handleAdd = (type: ItemType = 'benefit') => {
    setSelectedItem(null);
    setSelectedType(type);
    setFormOpen(true);
  };

  const handleEdit = (item: Benefit | Tool, type: ItemType) => {
    setSelectedItem(item);
    setSelectedType(type);
    setFormOpen(true);
  };

  const handleFormSubmit = (type: ItemType, data: CreateBenefitInput | CreateToolInput) => {
    if (selectedItem) {
      if (type === 'benefit') {
        updateBenefit.mutate({ id: selectedItem.id, updates: data }, { onSuccess: () => setFormOpen(false) });
      } else {
        updateTool.mutate({ id: selectedItem.id, updates: data }, { onSuccess: () => setFormOpen(false) });
      }
    } else {
      if (type === 'benefit') {
        createBenefit.mutate(data, { onSuccess: () => setFormOpen(false) });
      } else {
        createTool.mutate(data, { onSuccess: () => setFormOpen(false) });
      }
    }
  };

  if (isLoading) {
    return (
      <AppLayout
        title="Ferramentas e Benefícios"
        description="Catálogo de ferramentas e benefícios da empresa"
        breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Ferramentas e Benefícios' }]}
      >
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-[64px] w-full rounded-lg" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Ferramentas e Benefícios"
      description="Catálogo de ferramentas e benefícios da empresa"
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Ferramentas e Benefícios' }]}
      actions={
        <Button onClick={() => handleAdd('benefit')} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Adicionar
        </Button>
      }
    >
      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 ml-auto">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'benefit' | 'tool')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="benefit">Benefícios</SelectItem>
              <SelectItem value="tool">Ferramentas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-8">
        {typeFilter !== 'tool' && (
          <Section
            title="Benefícios"
            icon={Gift}
            items={benefits}
            statusFilter={statusFilter}
            searchTerm={searchTerm}
            isToggling={toggleBenefit.isPending}
            onEdit={(item) => handleEdit(item, 'benefit')}
            onToggleActive={(item) => toggleBenefit.mutate({ id: item.id, isActive: !item.isActive })}
            onAdd={() => handleAdd('benefit')}
            emptyDescription="Adicione benefícios como vale refeição, plano de saúde, Gympass etc."
          />
        )}

        {typeFilter !== 'benefit' && (
          <Section
            title="Ferramentas"
            icon={Wrench}
            items={tools}
            statusFilter={statusFilter}
            searchTerm={searchTerm}
            isToggling={toggleTool.isPending}
            onEdit={(item) => handleEdit(item, 'tool')}
            onToggleActive={(item) => toggleTool.mutate({ id: item.id, isActive: !item.isActive })}
            onAdd={() => handleAdd('tool')}
            emptyDescription="Adicione ferramentas como GitHub, Figma, Slack, etc."
          />
        )}
      </div>

      <BenefitToolFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={selectedItem}
        defaultType={selectedType}
        onSubmit={handleFormSubmit}
        isLoading={isSaving}
      />
    </AppLayout>
  );
};

export default BenefitsAndTools;
