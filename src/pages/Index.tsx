import { useState, useMemo } from 'react';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, Employee } from '@/hooks/useEmployees';
import { CreateEmployeeInput } from '@/services/employeeService';
import { AppLayout } from '@/components/layout/AppLayout';
import { DataTable } from '@/components/data-table/DataTable';
import { createEmployeeColumns } from '@/components/employees/EmployeesTable';
import EmployeeFormDialog from '@/components/employees/EmployeeFormDialog';
import DeleteConfirmDialog from '@/components/employees/DeleteConfirmDialog';
import EmployeeStats from '@/components/employees/EmployeeStats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { data: employees = [], isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [searchQuery, setSearchQuery] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setFormDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormDialogOpen(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: CreateEmployeeInput) => {
    if (selectedEmployee) {
      await updateEmployee.mutateAsync({ id: selectedEmployee.id, updates: data });
    } else {
      await createEmployee.mutateAsync(data);
    }
    setFormDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleDeleteConfirm = async () => {
    if (selectedEmployee) {
      await deleteEmployee.mutateAsync({ id: selectedEmployee.id, nome: selectedEmployee.nome });
    }
    setDeleteDialogOpen(false);
    setSelectedEmployee(null);
  };

  const columns = useMemo(
    () =>
      createEmployeeColumns({
        onEdit: handleEditEmployee,
        onDelete: handleDeleteEmployee,
      }),
    []
  );

  // Convert Employee to the format expected by stats components
  const allEmployeesForStats = employees.map((emp) => ({
    id: emp.id,
    nome: emp.nome,
    email: emp.email,
    telefone: emp.telefone,
    cargo: emp.cargo,
    cpf: emp.cpf,
    dataAdmissao: emp.dataAdmissao,
    isGerente: emp.isGerente,
    status: emp.status,
    salarioMensal: emp.salarioMensal,
    beneficios: emp.beneficios,
    encargos: emp.encargos,
  }));

  const actions = (
    <Button onClick={handleAddEmployee} className="gap-2">
      <Plus className="h-4 w-4" />
      Adicionar Funcionário
    </Button>
  );

  if (isLoading) {
    return (
      <AppLayout
        title="Funcionários"
        description="Gerencie sua equipe e acompanhe custos"
        breadcrumbs={[{ label: 'Funcionários' }]}
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
      title="Funcionários"
      description="Gerencie sua equipe e acompanhe custos"
      breadcrumbs={[{ label: 'Funcionários' }]}
      actions={actions}
    >
      {/* Stats */}
      <EmployeeStats employees={allEmployeesForStats} />

      {/* Search */}
      <div className="mt-6 mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cargo ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table or Empty State */}
      {employees.length > 0 ? (
        <DataTable
          columns={columns}
          data={employees}
          searchKey="nome"
          searchValue={searchQuery}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            Nenhum funcionário cadastrado
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Comece adicionando funcionários à sua equipe para gerenciar alocações e orçamentos.
          </p>
          <Button onClick={handleAddEmployee} className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Funcionário
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <EmployeeFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        employee={selectedEmployee}
        onSubmit={handleFormSubmit}
        isLoading={createEmployee.isPending || updateEmployee.isPending}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        employee={selectedEmployee ? {
          id: selectedEmployee.id,
          nome: selectedEmployee.nome,
          email: selectedEmployee.email,
          telefone: selectedEmployee.telefone,
          cargo: selectedEmployee.cargo,
          cpf: selectedEmployee.cpf,
          dataAdmissao: selectedEmployee.dataAdmissao,
          isGerente: selectedEmployee.isGerente,
          status: selectedEmployee.status,
          salarioMensal: selectedEmployee.salarioMensal,
          beneficios: selectedEmployee.beneficios,
          encargos: selectedEmployee.encargos,
        } : null}
        onConfirm={handleDeleteConfirm}
      />
    </AppLayout>
  );
};

export default Index;
