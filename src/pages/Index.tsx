import { useState, useMemo } from 'react';
import { Employee, EmployeeFormData } from '@/types/employee';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  searchEmployees,
} from '@/lib/employeeStore';
import Header from '@/components/layout/Header';
import EmployeeCard from '@/components/employees/EmployeeCard';
import EmployeeFormDialog from '@/components/employees/EmployeeFormDialog';
import DeleteConfirmDialog from '@/components/employees/DeleteConfirmDialog';
import EmployeeStats from '@/components/employees/EmployeeStats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Users } from 'lucide-react';

const Index = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>(getEmployees());
  const [searchQuery, setSearchQuery] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    return searchEmployees(searchQuery);
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

  const handleFormSubmit = (data: EmployeeFormData) => {
    if (selectedEmployee) {
      updateEmployee(selectedEmployee.id, data);
      toast({
        title: 'Funcionário atualizado',
        description: `${data.nome} foi atualizado com sucesso.`,
      });
    } else {
      createEmployee(data);
      toast({
        title: 'Funcionário cadastrado',
        description: `${data.nome} foi adicionado à equipe.`,
      });
    }
    setEmployees(getEmployees());
    setFormDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleDeleteConfirm = () => {
    if (selectedEmployee) {
      deleteEmployee(selectedEmployee.id);
      toast({
        title: 'Funcionário excluído',
        description: `${selectedEmployee.nome} foi removido.`,
        variant: 'destructive',
      });
      setEmployees(getEmployees());
    }
    setDeleteDialogOpen(false);
    setSelectedEmployee(null);
  };

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
        <EmployeeStats employees={employees} />

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
          {filteredEmployees.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEmployees.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  onEdit={handleEditEmployee}
                  onDelete={handleDeleteEmployee}
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
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        employee={selectedEmployee}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default Index;
