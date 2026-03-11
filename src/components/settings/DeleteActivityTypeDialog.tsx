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
import { ActivityType } from '@/hooks/useActivityTypes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityType: ActivityType | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteActivityTypeDialog({ open, onOpenChange, activityType, onConfirm, isDeleting }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir atividade</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{activityType?.name}</strong>? Todos os lançamentos de horas
            associados serão permanentemente removidos. Esta ação não pode ser desfeita.
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
