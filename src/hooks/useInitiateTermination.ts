import { useState } from 'react';
import { Employee } from '@/hooks/useEmployees';

export function useInitiateTermination() {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [terminationFormOpen, setTerminationFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const initiateTermination = (employee: Employee) => {
    setSelectedEmployee(employee);
    setConfirmDialogOpen(true);
  };

  const confirmAndOpenForm = () => {
    setConfirmDialogOpen(false);
    setTerminationFormOpen(true);
  };

  const closeAll = () => {
    setConfirmDialogOpen(false);
    setTerminationFormOpen(false);
    setSelectedEmployee(null);
  };

  return {
    confirmDialogOpen,
    setConfirmDialogOpen,
    terminationFormOpen,
    setTerminationFormOpen,
    selectedEmployee,
    initiateTermination,
    confirmAndOpenForm,
    closeAll,
  };
}
