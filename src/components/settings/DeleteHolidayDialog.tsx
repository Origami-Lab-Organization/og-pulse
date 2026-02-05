import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteHoliday } from '@/hooks/useHolidays';
import { Holiday } from '@/types/holiday';

interface DeleteHolidayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holiday: Holiday | null;
}

export function DeleteHolidayDialog({ open, onOpenChange, holiday }: DeleteHolidayDialogProps) {
  const deleteHoliday = useDeleteHoliday();

  const handleDelete = async () => {
    if (!holiday) return;
    await deleteHoliday.mutateAsync(holiday.id);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Feriado</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o feriado "{holiday?.name}"? 
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteHoliday.isPending}
          >
            {deleteHoliday.isPending ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
