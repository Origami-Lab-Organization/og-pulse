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
import { Employee } from '@/hooks/useEmployees';

interface InitiateTerminationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onConfirm: () => void;
}

const InitiateTerminationDialog = ({
  open,
  onOpenChange,
  employee,
  onConfirm,
}: InitiateTerminationDialogProps) => {
  if (!employee) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Iniciar Desligamento</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Você está prestes a iniciar o processo de desligamento de{' '}
                <strong>{employee.nome}</strong> ({employee.cargo}).
              </p>
              <p>Esta ação irá abrir o formulário de desligamento onde você poderá:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Definir as datas de comunicação e desligamento</li>
                <li>Configurar ajustes de folha de pagamento</li>
                <li>Anexar documentos necessários</li>
              </ul>
              <p>Deseja continuar?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default InitiateTerminationDialog;
