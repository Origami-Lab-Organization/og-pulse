import { useState, useCallback } from 'react';
import { Employee } from '@/hooks/useEmployees';

export function useInitiateTermination() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const initiateTermination = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setConfirmDialogOpen(true);
  }, []);

  const confirmAndOpenForm = useCallback(() => {
    setConfirmDialogOpen(false);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setConfirmDialogOpen(false);
    setTimeout(() => setSelectedEmployee(null), 300);
  }, []);

  return {
    isModalOpen,
    confirmDialogOpen,
    setConfirmDialogOpen,
    selectedEmployee,
    initiateTermination,
    confirmAndOpenForm,
    closeModal,
  };
}
