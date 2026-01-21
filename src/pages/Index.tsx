import { useState, useMemo } from 'react';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, Employee } from '@/hooks/useEmployees';
import { CreateEmployeeInput } from '@/services/employeeService';
import Header from '@/components/layout/Header';
import EmployeeCard from '@/components/employees/EmployeeCard';
import EmployeeFormDialog from '@/components/employees/EmployeeFormDialog';
import DeleteConfirmDialog from '@/components/employees/DeleteConfirmDialog';
import EmployeeStats from '@/components/employees/EmployeeStats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users, Loader2 } from 'lucide-react';

const Index = () => {
  const { data: employees = [], isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [searchQuery, setSearchQuery] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.nome.toLowerCase().includes(query) ||
        emp.cargo.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

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

  // Convert Employee to the format expected by stats/card components
  const employeesForDisplay = filteredEmployees.map((emp) => ({
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 px-4">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8 px-4">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Gestão de Funcionários</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie sua equipe e acompanhe custos em um só lugar
          </p>
        </div>

        {/* Stats */}
        <EmployeeStats employees={allEmployeesForStats} />

        {/* Actions Bar */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cargo ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleAddEmployee} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Funcionário
          </Button>
        </div>

        {/* Employee Grid */}
        <div className="mt-6">
          {employeesForDisplay.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {employeesForDisplay.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  onEdit={() => handleEditEmployee(filteredEmployees.find(e => e.id === employee.id)!)}
                  onDelete={() => handleDeleteEmployee(filteredEmployees.find(e => e.id === employee.id)!)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground">
                {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhum funcionário cadastrado'}
              </h3>
              <p className="text-muted-foreground mt-1 max-w-sm">
                {searchQuery
                  ? 'Tente buscar por outro termo.'
                  : 'Comece adicionando funcionários à sua equipe para gerenciar alocações e orçamentos.'}
              </p>
              {!searchQuery && (
                <Button onClick={handleAddEmployee} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Funcionário
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

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
    </div>
  );
};

export default Index;
