import { useState, useMemo } from 'react';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useBlockEmployee, useUnblockEmployee, useArchiveEmployee, useResendInvite, Employee, useAddEmployeeBenefit, useAddEmployeeTool } from '@/hooks/useEmployees';
import { EmployeeFormSubmitData } from '@/components/employees/EmployeeFormDialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { DataTable } from '@/components/data-table/DataTable';
import { createEmployeeColumns } from '@/components/employees/EmployeesTable';
import EmployeeFormDialog from '@/components/employees/EmployeeFormDialog';
import BlockEmployeeDialog from '@/components/employees/BlockEmployeeDialog';
import UnblockEmployeeDialog from '@/components/employees/UnblockEmployeeDialog';
import ArchiveEmployeeDialog from '@/components/employees/ArchiveEmployeeDialog';
import InitiateTerminationDialog from '@/components/employees/InitiateTerminationDialog';
import TerminationWizardModal from '@/components/employees/TerminationWizardModal';
import EmployeeStats from '@/components/employees/EmployeeStats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users, Calculator } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EmployeeCalculatorDialog from '@/components/employees/EmployeeCalculatorDialog';
import { useInitiateTermination } from '@/hooks/useInitiateTermination';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

type StatusFilter = 'ativo' | 'em_desligamento' | 'desligado' | 'todos';

const Index = () => {
  const { data: employees = [], isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const blockEmployee = useBlockEmployee();
  const unblockEmployee = useUnblockEmployee();
  const archiveEmployee = useArchiveEmployee();
  const resendInvite = useResendInvite();
  const addBenefit = useAddEmployeeBenefit();
  const addTool = useAddEmployeeTool();
  const navigate = useNavigate();
  const termination = useInitiateTermination();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ativo');
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Status counts
  const statusCounts = useMemo(() => ({
    ativo: employees.filter(e => e.status === 'ativo').length,
    em_desligamento: employees.filter(e => e.status === 'em_desligamento').length,
    desligado: employees.filter(e => e.status === 'desligado').length,
    todos: employees.length,
  }), [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    if (statusFilter === 'todos') return employees;
    return employees.filter(e => e.status === statusFilter);
  }, [employees, statusFilter]);

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setFormDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormDialogOpen(true);
  };

  const handleBlockEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setBlockDialogOpen(true);
  };

  const handleUnblockEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setUnblockDialogOpen(true);
  };

  const handleArchiveEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setArchiveDialogOpen(true);
  };

  const handleResendInvite = async (employee: Employee) => {
    await resendInvite.mutateAsync({ id: employee.id, nome: employee.nome });
  };

  const handleFormSubmit = async (data: EmployeeFormSubmitData) => {
    const { localBenefits, localTools, createNewVersion, effectiveFrom, ...employeeData } = data;
    
    if (selectedEmployee) {
      await updateEmployee.mutateAsync({ 
        id: selectedEmployee.id, 
        updates: employeeData,
        createNewVersion: createNewVersion || false,
        effectiveFrom,
      });
    } else {
      const newEmployee = await createEmployee.mutateAsync(employeeData);
      
      const benefitPromises = (localBenefits || []).map(benefit => 
        addBenefit.mutateAsync({
          employeeId: newEmployee.id,
          name: benefit.name,
          description: benefit.description || undefined,
          monthlyValue: benefit.monthlyValue,
        })
      );
      
      const toolPromises = (localTools || []).map(tool => 
        addTool.mutateAsync({
          employeeId: newEmployee.id,
          name: tool.name,
          description: tool.description || undefined,
          monthlyCost: tool.monthlyCost,
        })
      );
      
      await Promise.all([...benefitPromises, ...toolPromises]);
    }
    setFormDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleBlockConfirm = async () => {
    if (selectedEmployee) {
      await blockEmployee.mutateAsync({ id: selectedEmployee.id, nome: selectedEmployee.nome });
    }
    setBlockDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleUnblockConfirm = async () => {
    if (selectedEmployee) {
      const hadLoggedIn = !!selectedEmployee.authId;
      await unblockEmployee.mutateAsync({ 
        id: selectedEmployee.id, 
        nome: selectedEmployee.nome,
        hadLoggedIn
      });
    }
    setUnblockDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleArchiveConfirm = async () => {
    if (selectedEmployee) {
      await archiveEmployee.mutateAsync({ id: selectedEmployee.id, nome: selectedEmployee.nome });
    }
    setArchiveDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleViewTermination = (employee: Employee) => {
    if (employee.terminationId) {
      navigate(`/rh/desligamentos`);
    }
  };

  const columns = useMemo(
    () =>
      createEmployeeColumns({
        onEdit: handleEditEmployee,
        onBlock: handleBlockEmployee,
        onUnblock: handleUnblockEmployee,
        onArchive: handleArchiveEmployee,
        onResendInvite: handleResendInvite,
        onTerminate: termination.initiateTermination,
        onViewTermination: handleViewTermination,
        isResendingInvite: resendInvite.isPending,
      }),
    [resendInvite.isPending]
  );

  const actions = (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" onClick={() => setCalculatorOpen(true)}>
            <Calculator className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Calculadora de Custos</TooltipContent>
      </Tooltip>
      <Button onClick={handleAddEmployee} className="gap-2">
        <Plus className="h-4 w-4" />
        Adicionar Funcionário
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <AppLayout
        title="Funcionários"
        description="Gerencie sua equipe e acompanhe custos"
        breadcrumbs={[{ label: 'RH' }, { label: 'Funcionários' }]}
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
      breadcrumbs={[{ label: 'RH' }, { label: 'Funcionários' }]}
      actions={actions}
    >
      {/* Stats */}
      <EmployeeStats employees={employees} />

      {/* Status Tabs */}
      <div className="mt-6">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="ativo" className="gap-2">
              Ativos
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {statusCounts.ativo}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="em_desligamento" className="gap-2">
              Em Desligamento
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {statusCounts.em_desligamento}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="desligado" className="gap-2">
              Desligados
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {statusCounts.desligado}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="todos" className="gap-2">
              Todos
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {statusCounts.todos}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search */}
      <div className="mt-4 mb-4">
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
      {filteredEmployees.length > 0 ? (
      <DataTable
          columns={columns}
          data={filteredEmployees}
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
            {statusFilter === 'todos' ? 'Nenhum funcionário cadastrado' : `Nenhum funcionário com status "${statusFilter === 'ativo' ? 'Ativo' : statusFilter === 'em_desligamento' ? 'Em Desligamento' : 'Desligado'}"`}
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            {statusFilter === 'ativo' || statusFilter === 'todos' 
              ? 'Comece adicionando funcionários à sua equipe para gerenciar alocações e orçamentos.'
              : 'Nenhum registro encontrado para este filtro.'}
          </p>
          {(statusFilter === 'ativo' || statusFilter === 'todos') && (
            <Button onClick={handleAddEmployee} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Funcionário
            </Button>
          )}
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

      <BlockEmployeeDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        employee={selectedEmployee}
        onConfirm={handleBlockConfirm}
        isLoading={blockEmployee.isPending}
      />

      <UnblockEmployeeDialog
        open={unblockDialogOpen}
        onOpenChange={setUnblockDialogOpen}
        employee={selectedEmployee}
        onConfirm={handleUnblockConfirm}
        isLoading={unblockEmployee.isPending}
      />

      <ArchiveEmployeeDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        employee={selectedEmployee}
        onConfirm={handleArchiveConfirm}
        isLoading={archiveEmployee.isPending}
      />

      <EmployeeCalculatorDialog
        open={calculatorOpen}
        onOpenChange={setCalculatorOpen}
      />

      <InitiateTerminationDialog
        open={termination.confirmDialogOpen}
        onOpenChange={termination.setConfirmDialogOpen}
        employee={termination.selectedEmployee}
        onConfirm={termination.confirmAndOpenForm}
      />

      <TerminationWizardModal
        isOpen={termination.terminationFormOpen}
        onClose={termination.closeAll}
        employee={termination.selectedEmployee}
        onSuccess={() => {
          navigate('/rh/desligamentos');
        }}
      />
    </AppLayout>
  );
};

export default Index;
