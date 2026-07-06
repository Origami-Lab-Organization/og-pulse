import { AlertTriangle } from 'lucide-react';
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

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  opportunitiesCount?: number;
  projectsCount?: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

const buildLinksLabel = (opportunities: number, projects: number): string | null => {
  const parts: string[] = [];
  if (opportunities > 0) {
    parts.push(`${opportunities} oportunidade${opportunities > 1 ? 's' : ''}`);
  }
  if (projects > 0) {
    parts.push(`${projects} projeto${projects > 1 ? 's' : ''}`);
  }
  return parts.length > 0 ? parts.join(' e ') : null;
};

const DeleteClientDialog = ({
  open,
  onOpenChange,
  clientName,
  opportunitiesCount = 0,
  projectsCount = 0,
  onConfirm,
  isLoading = false,
}: DeleteClientDialogProps) => {
  const linksLabel = buildLinksLabel(opportunitiesCount, projectsCount);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o cliente{' '}
            <span className="font-semibold text-foreground">{clientName}</span>?
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {linksLabel && (
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-foreground">
              Este cliente tem <span className="font-semibold">{linksLabel}</span> vinculado
              {opportunitiesCount + projectsCount > 1 ? 's' : ''}. O histórico associado pode ser
              afetado.
            </p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteClientDialog;
