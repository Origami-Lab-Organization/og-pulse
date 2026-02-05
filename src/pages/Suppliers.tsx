import { useState, useMemo } from 'react';
import { Plus, Search, Truck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/DataTable';
import { createSupplierColumns } from '@/components/suppliers/SuppliersTable';
import SupplierStats from '@/components/suppliers/SupplierStats';
import SupplierFormDialog from '@/components/suppliers/SupplierFormDialog';
import DeleteSupplierDialog from '@/components/suppliers/DeleteSupplierDialog';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliers';
import { Supplier, CreateSupplierInput } from '@/types/supplier';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const Suppliers = () => {
  const { employee } = useAuth();
  const { data: suppliers = [], isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [searchQuery, setSearchQuery] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const canManage = employee?.is_gerente ?? false;

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setFormDialogOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormDialogOpen(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (data: CreateSupplierInput) => {
    if (selectedSupplier) {
      updateSupplier.mutate(
        { id: selectedSupplier.id, updates: data },
        { onSuccess: () => setFormDialogOpen(false) }
      );
    } else {
      createSupplier.mutate(data, { onSuccess: () => setFormDialogOpen(false) });
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedSupplier) {
      deleteSupplier.mutate(
        { id: selectedSupplier.id, companyName: selectedSupplier.companyName },
        { onSuccess: () => setDeleteDialogOpen(false) }
      );
    }
  };

  const columns = useMemo(
    () =>
      createSupplierColumns({
        onEdit: handleEditSupplier,
        onDelete: handleDeleteSupplier,
        canManage,
      }),
    [canManage]
  );

  const actions = canManage && (
    <Button onClick={handleAddSupplier} className="gap-2">
      <Plus className="h-4 w-4" />
      Adicionar Fornecedor
    </Button>
  );

  if (isLoading) {
    return (
      <AppLayout
        title="Fornecedores"
        description="Gerencie seus fornecedores e parceiros"
        breadcrumbs={[{ label: 'Fornecedores' }]}
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
      title="Fornecedores"
      description="Gerencie seus fornecedores e parceiros"
      breadcrumbs={[{ label: 'Fornecedores' }]}
      actions={actions}
    >
      {/* Stats */}
      <SupplierStats suppliers={suppliers} />

      {/* Search */}
      <div className="mt-6 mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, fantasia ou CNPJ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table or Empty State */}
      {suppliers.length > 0 ? (
        <DataTable
          columns={columns}
          data={suppliers}
          searchKey="companyName"
          searchValue={searchQuery}
          onRowClick={canManage ? handleEditSupplier : undefined}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Truck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            Nenhum fornecedor cadastrado
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            {canManage
              ? 'Comece adicionando seu primeiro fornecedor'
              : 'Aguarde um administrador cadastrar fornecedores'}
          </p>
          {canManage && (
            <Button onClick={handleAddSupplier} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Fornecedor
            </Button>
          )}
        </div>
      )}

      <SupplierFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        supplier={selectedSupplier}
        onSubmit={handleFormSubmit}
        isLoading={createSupplier.isPending || updateSupplier.isPending}
      />

      <DeleteSupplierDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        supplierName={selectedSupplier?.companyName || ''}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteSupplier.isPending}
      />
    </AppLayout>
  );
};

export default Suppliers;
