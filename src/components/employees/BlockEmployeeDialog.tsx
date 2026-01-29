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

interface BlockEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

const BlockEmployeeDialog = ({
  open,
  onOpenChange,
  employee,
  onConfirm,
  isLoading,
}: BlockEmployeeDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bloquear Funcionário</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja bloquear <strong>{employee?.nome}</strong>?
            <br /><br />
            O funcionário não poderá mais acessar o sistema até ser desbloqueado por um administrador.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Bloqueando...' : 'Bloquear'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BlockEmployeeDialog;
