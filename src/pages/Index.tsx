import { useState, useMemo } from 'react';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useInactivateEmployee, Employee, useAddEmployeeBenefit, useAddEmployeeTool } from '@/hooks/useEmployees';
import { EmployeeFormSubmitData } from '@/components/employees/EmployeeFormDialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { DataTable } from '@/components/data-table/DataTable';
import { createEmployeeColumns } from '@/components/employees/EmployeesTable';
import EmployeeFormDialog from '@/components/employees/EmployeeFormDialog';
import InactivateConfirmDialog from '@/components/employees/InactivateConfirmDialog';
import EmployeeStats from '@/components/employees/EmployeeStats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { data: employees = [], isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const inactivateEmployee = useInactivateEmployee();
  const addBenefit = useAddEmployeeBenefit();
  const addTool = useAddEmployeeTool();

  const [searchQuery, setSearchQuery] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [inactivateDialogOpen, setInactivateDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setFormDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormDialogOpen(true);
  };

  const handleInactivateEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setInactivateDialogOpen(true);
  };

  const handleFormSubmit = async (data: EmployeeFormSubmitData) => {
    const { localBenefits, localTools, createNewVersion, ...employeeData } = data;
    
    if (selectedEmployee) {
      await updateEmployee.mutateAsync({ 
        id: selectedEmployee.id, 
        updates: employeeData,
        createNewVersion: createNewVersion || false,
      });
    } else {
      // Create employee first
      const newEmployee = await createEmployee.mutateAsync(employeeData);
      
      // Then create benefits and tools
      if (localBenefits && localBenefits.length > 0) {
        for (const benefit of localBenefits) {
          await addBenefit.mutateAsync({
            employeeId: newEmployee.id,
            name: benefit.name,
            description: benefit.description || undefined,
            monthlyValue: benefit.monthlyValue,
          });
        }
      }
      
      if (localTools && localTools.length > 0) {
        for (const tool of localTools) {
          await addTool.mutateAsync({
            employeeId: newEmployee.id,
            name: tool.name,
            description: tool.description || undefined,
            monthlyCost: tool.monthlyCost,
          });
        }
      }
    }
    setFormDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleInactivateConfirm = async () => {
    if (selectedEmployee) {
      await inactivateEmployee.mutateAsync({ id: selectedEmployee.id, nome: selectedEmployee.nome });
    }
    setInactivateDialogOpen(false);
    setSelectedEmployee(null);
  };

  const columns = useMemo(
    () =>
      createEmployeeColumns({
        onEdit: handleEditEmployee,
        onInactivate: handleInactivateEmployee,
      }),
    []
  );

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
      <EmployeeStats employees={employees} />

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
          onRowClick={handleEditEmployee}
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

      <InactivateConfirmDialog
        open={inactivateDialogOpen}
        onOpenChange={setInactivateDialogOpen}
        employee={selectedEmployee}
        onConfirm={handleInactivateConfirm}
      />
    </AppLayout>
  );
};

export default Index;
