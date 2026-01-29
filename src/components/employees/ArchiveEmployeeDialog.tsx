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

interface ArchiveEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

const ArchiveEmployeeDialog = ({
  open,
  onOpenChange,
  employee,
  onConfirm,
  isLoading,
}: ArchiveEmployeeDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arquivar Funcionário</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja arquivar <strong>{employee?.nome}</strong>?
            <br /><br />
            O funcionário será removido da listagem principal. Esta ação pode ser revertida posteriormente através das configurações.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-muted text-muted-foreground hover:bg-muted/80"
          >
            {isLoading ? 'Arquivando...' : 'Arquivar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ArchiveEmployeeDialog;
