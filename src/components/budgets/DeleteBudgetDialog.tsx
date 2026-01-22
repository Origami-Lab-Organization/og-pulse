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
import { BudgetWithDetails } from '@/types/budget';

interface DeleteBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: BudgetWithDetails | null;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteBudgetDialog({
  open,
  onOpenChange,
  budget,
  onConfirm,
  isDeleting,
}: DeleteBudgetDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Orçamento</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o orçamento{' '}
            <strong>{budget?.budget_number}</strong>? Esta ação não pode ser
            desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
