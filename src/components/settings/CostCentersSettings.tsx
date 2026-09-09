import { useMemo, useState } from 'react';
import { Layers, Pencil, Plus, Power, PowerOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useCostCenters, useCreateCostCenter, useSetCostCenterActive, useUpdateCostCenter } from '@/hooks/useCostCenters';
import type { CostCenter, CostCenterFormData, CostCenterRowProps } from '@/types/costCenter';
import { CostCenterFilter } from '@/types/costCenter';
import { CostCenterFormDialog } from './CostCenterFormDialog';

/**
 * Aba "Centros de custo" do Portal do Admin (PUL-217). Todo membro do tenant lê; só quem
 * tem `configuracao:editar` cria, edita e inativa (a RLS é quem garante; a tela só esconde
 * as ações). Não existe excluir: inativar preserva o histórico.
 */

const EDIT_CAPABILITY = 'configuracao:editar';

function CostCenterRow(props: CostCenterRowProps) {
  const { costCenter, canEdit, onEdit, onToggleActive } = props;
  const toggleLabel = costCenter.is_active ? `Inativar ${costCenter.name}` : `Reativar ${costCenter.name}`;
  return (
    <li className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{costCenter.name}</span>
          {costCenter.is_active ? (
            <Badge className="border-transparent bg-success-subtle text-success-emphasis hover:bg-success-subtle">Ativo</Badge>
          ) : (
            <Badge variant="secondary">Inativo</Badge>
          )}
        </div>
        {costCenter.description && <p className="mt-1 text-sm text-muted-foreground">{costCenter.description}</p>}
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" aria-label={`Editar ${costCenter.name}`} onClick={() => onEdit(costCenter)}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={toggleLabel} onClick={() => onToggleActive(costCenter)}>
            {costCenter.is_active ? <PowerOff className="h-4 w-4" aria-hidden="true" /> : <Power className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      )}
    </li>
  );
}

function LoadingState() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState(props: { canEdit: boolean; onCreate: () => void }) {
  const { canEdit, onCreate } = props;
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <Layers className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="max-w-md text-sm text-muted-foreground">
        Nenhum centro de custo cadastrado. Cadastre os centros da empresa (por exemplo, Consultoria, Produto e
        Administrativo) para cada hora e cada item do catálogo terem onde ser lidos.
      </p>
      {canEdit && (
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Cadastrar o primeiro centro
        </Button>
      )}
    </div>
  );
}

export function CostCentersSettings() {
  const { can } = useAuth();
  const canEdit = can(EDIT_CAPABILITY);
  const { data: costCenters = [], isLoading, isError, error, refetch } = useCostCenters();
  const createMutation = useCreateCostCenter();
  const updateMutation = useUpdateCostCenter();
  const setActiveMutation = useSetCostCenterActive();

  const [filter, setFilter] = useState<CostCenterFilter>(CostCenterFilter.ACTIVE);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<CostCenter | null>(null);

  const visible = useMemo(
    () => (filter === CostCenterFilter.ALL ? costCenters : costCenters.filter((c) => c.is_active)),
    [costCenters, filter],
  );
  const inactiveCount = costCenters.length - costCenters.filter((c) => c.is_active).length;

  const openCreate = () => {
    setSelected(null);
    setFormOpen(true);
  };
  const openEdit = (costCenter: CostCenter) => {
    setSelected(costCenter);
    setFormOpen(true);
  };
  const submit = (data: CostCenterFormData) => {
    const close = () => setFormOpen(false);
    if (selected) updateMutation.mutate({ ...data, id: selected.id }, { onSuccess: close });
    else createMutation.mutate(data, { onSuccess: close });
  };
  const toggleActive = (costCenter: CostCenter) =>
    setActiveMutation.mutate({ id: costCenter.id, isActive: !costCenter.is_active });

  if (isLoading) return <LoadingState />;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
            Centros de custo
          </CardTitle>
          <CardDescription className="mt-1">
            Onde custo e receita são lidos. Serviços, atividades internas e pessoas apontam para um centro; toda pessoa vê a
            lista, e só quem configura a empresa edita.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {inactiveCount > 0 && (
            <div className="flex items-center gap-2">
              <Switch
                id="cost-centers-show-inactive"
                checked={filter === CostCenterFilter.ALL}
                onCheckedChange={(checked) => setFilter(checked ? CostCenterFilter.ALL : CostCenterFilter.ACTIVE)}
              />
              <Label htmlFor="cost-centers-show-inactive" className="text-sm text-muted-foreground">
                Mostrar inativos ({inactiveCount})
              </Label>
            </div>
          )}
          {canEdit && costCenters.length > 0 && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Novo centro
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive-subtle p-4 text-sm text-destructive">
            <p>Não foi possível carregar os centros de custo. {error instanceof Error ? error.message : ''}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar de novo
            </Button>
          </div>
        ) : costCenters.length === 0 ? (
          <EmptyState canEdit={canEdit} onCreate={openCreate} />
        ) : (
          <ul className="space-y-2" aria-label="Centros de custo">
            {visible.map((costCenter) => (
              <CostCenterRow key={costCenter.id} costCenter={costCenter} canEdit={canEdit} onEdit={openEdit} onToggleActive={toggleActive} />
            ))}
          </ul>
        )}
      </CardContent>
      <CostCenterFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        costCenter={selected}
        existing={costCenters}
        onSubmit={submit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </Card>
  );
}
