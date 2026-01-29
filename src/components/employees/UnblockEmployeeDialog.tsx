import { Employee } from '@/hooks/useEmployees';
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

interface UnblockEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

const UnblockEmployeeDialog = ({
  open,
  onOpenChange,
  employee,
  onConfirm,
  isLoading,
}: UnblockEmployeeDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desbloquear Funcionário</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja restaurar o acesso de <strong>{employee?.nome}</strong> ao sistema?
            <br /><br />
            O funcionário poderá acessar o sistema normalmente após o desbloqueio.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? 'Desbloqueando...' : 'Desbloquear'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnblockEmployeeDialog;
