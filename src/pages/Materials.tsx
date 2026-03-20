import { useState, useMemo } from 'react';
import { Plus, Search, Package } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/data-table/DataTable';
import { createMaterialColumns } from '@/components/materials/MaterialsTable';
import MaterialStats from '@/components/materials/MaterialStats';
import MaterialFormDialog from '@/components/materials/MaterialFormDialog';
import DeleteMaterialDialog from '@/components/materials/DeleteMaterialDialog';
import { useMaterials, useCreateMaterial, useUpdateMaterial, useDeleteMaterial } from '@/hooks/useMaterials';
import { Material, CreateMaterialInput, MATERIAL_CATEGORIES } from '@/types/material';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const Materials = () => {
  const { employee } = useAuth();
  const { data: materials = [], isLoading } = useMaterials();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const canManage = employee?.is_gerente ?? false;

  const filteredMaterials = useMemo(() => {
    let result = materials;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.sku?.toLowerCase().includes(q) ?? false) ||
          (m.description?.toLowerCase().includes(q) ?? false)
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter((m) => m.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((m) => m.status === statusFilter);
    }

    return result;
  }, [materials, searchQuery, categoryFilter, statusFilter]);

  const handleAddMaterial = () => {
    setSelectedMaterial(null);
    setFormDialogOpen(true);
  };

  const handleEditMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setFormDialogOpen(true);
  };

  const handleDeleteMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: CreateMaterialInput) => {
    if (selectedMaterial) {
      updateMaterial.mutate(
        { id: selectedMaterial.id, updates: data },
        { onSuccess: () => setFormDialogOpen(false) }
      );
    } else {
      createMaterial.mutate(data, { onSuccess: () => setFormDialogOpen(false) });
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedMaterial) {
      deleteMaterial.mutate(
        { id: selectedMaterial.id, name: selectedMaterial.name },
        { onSuccess: () => setDeleteDialogOpen(false) }
      );
    }
  };

  const columns = useMemo(
    () =>
      createMaterialColumns({
        onEdit: handleEditMaterial,
        onDelete: handleDeleteMaterial,
        canManage,
      }),
    [canManage]
  );

  const actions = canManage && (
    <Button onClick={handleAddMaterial} className="gap-2">
      <Plus className="h-4 w-4" />
      Adicionar Material
    </Button>
  );

  if (isLoading) {
    return (
      <AppLayout
        title="Materiais"
        description="Catálogo de materiais para projetos e orçamentos"
        breadcrumbs={[{ label: 'Materiais' }]}
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Materiais"
      description="Catálogo de materiais para projetos e orçamentos"
      breadcrumbs={[{ label: 'Materiais' }]}
      actions={actions}
    >
      {/* Stats */}
      <MaterialStats materials={materials} />

      {/* Search + Filters */}
      <div className="mt-6 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, SKU ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {MATERIAL_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table or Empty State */}
      {filteredMaterials.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredMaterials}
          onRowClick={canManage ? handleEditMaterial : undefined}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Nenhum material encontrado'
              : 'Nenhum material cadastrado'}
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Tente ajustar os filtros ou termos de busca'
              : 'Comece adicionando seu primeiro material ao catálogo'}
          </p>
          {!searchQuery && categoryFilter === 'all' && statusFilter === 'all' && canManage && (
            <Button onClick={handleAddMaterial} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Material
            </Button>
          )}
        </div>
      )}

      <MaterialFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        material={selectedMaterial}
        onSubmit={handleFormSubmit}
        isLoading={createMaterial.isPending || updateMaterial.isPending}
      />

      <DeleteMaterialDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        materialName={selectedMaterial?.name || ''}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMaterial.isPending}
      />
    </AppLayout>
  );
};

export default Materials;
