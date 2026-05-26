import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { holidayService } from '@/services/holidayService';
import { HolidayFormData, Holiday } from '@/types/holiday';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export const useHolidays = () => {
  return useQuery({
    queryKey: ['holidays'],
    queryFn: holidayService.getAll,
  });
};

function invalidateAllocationCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['holidays'] });
  queryClient.invalidateQueries({ queryKey: ['allocation-employee-month-summary'] });
  queryClient.invalidateQueries({ queryKey: ['allocation-type-kpis'] });
}

export const useCreateHoliday = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: (formData: HolidayFormData) => {
      if (!employee?.tenant_id) throw new Error('Tenant não encontrado');
      return holidayService.create(employee.tenant_id, formData);
    },
    onSuccess: () => {
      invalidateAllocationCaches(queryClient);
      toast.success('Feriado criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating holiday:', error);
      toast.error('Erro ao criar feriado');
    },
  });
};

export const useUpdateHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: HolidayFormData }) => {
      return holidayService.update(id, formData);
    },
    onSuccess: () => {
      invalidateAllocationCaches(queryClient);
      toast.success('Feriado atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating holiday:', error);
      toast.error('Erro ao atualizar feriado');
    },
  });
};

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => holidayService.delete(id),
    onSuccess: () => {
      invalidateAllocationCaches(queryClient);
      toast.success('Feriado excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting holiday:', error);
      toast.error('Erro ao excluir feriado');
    },
  });
};

// Utility function to check if a date is a holiday
export const isHoliday = (date: Date, holidays: Holiday[]): Holiday | null => {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const dateStr = format(date, 'yyyy-MM-dd');

  for (const holiday of holidays) {
    if (!holiday.is_active) continue;

    if (holiday.holiday_type === 'fixed') {
      if (holiday.fixed_day === day && holiday.fixed_month === month) {
        return holiday;
      }
    } else {
      if (holiday.specific_date === dateStr) {
        return holiday;
      }
    }
  }
  return null;
};

// Format holiday date for display
export const formatHolidayDate = (holiday: Holiday): string => {
  if (holiday.holiday_type === 'fixed') {
    const day = String(holiday.fixed_day).padStart(2, '0');
    const month = String(holiday.fixed_month).padStart(2, '0');
    return `${day}/${month}`;
  } else if (holiday.specific_date) {
    const date = parseISO(holiday.specific_date);
    return format(date, 'dd/MM/yyyy');
  }
  return '';
};
