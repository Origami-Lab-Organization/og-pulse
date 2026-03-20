import { useState, useMemo } from 'react';
import { Plus, Search, Package } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/DataTable';
import { createMaterialColumns } from '@/components/materials/MaterialsTable';
import MaterialStats from '@/components/materials/MaterialStats';
import MaterialFormDialog from '@/components/materials/MaterialFormDialog';
import DeleteMaterialDialog from '@/components/materials/DeleteMaterialDialog';
import { useMaterials, useCreateMaterial, useUpdateMaterial, useDeleteMaterial } from '@/hooks/useMaterials';
import { Material, CreateMaterialInput } from '@/types/material';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const Materials = () => {
  const { employee } = useAuth();
  const { data: materials = [], isLoading } = useMaterials();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();

  const [searchQuery, setSearchQuery] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const canManage = employee?.is_gerente ?? false;

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

      {/* Search */}
      <div className="mt-6 mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, SKU ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table or Empty State */}
      {materials.length > 0 ? (
        <DataTable
          columns={columns}
          data={materials}
          searchKey="name"
          searchValue={searchQuery}
          onRowClick={canManage ? handleEditMaterial : undefined}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            Nenhum material cadastrado
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            {canManage
              ? 'Comece adicionando seu primeiro material ao catálogo'
              : 'Aguarde um administrador cadastrar materiais'}
          </p>
          {canManage && (
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
