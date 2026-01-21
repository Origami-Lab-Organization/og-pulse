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
import { RoleRateDB, SENIORITY_OPTIONS } from '@/types/roleRate';
import { Loader2 } from 'lucide-react';

interface DeleteRoleRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleRate: RoleRateDB | null;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteRoleRateDialog({
  open,
  onOpenChange,
  roleRate,
  onConfirm,
  isDeleting,
}: DeleteRoleRateDialogProps) {
  if (!roleRate) return null;

  const seniorityLabel = SENIORITY_OPTIONS.find(
    (opt) => opt.value === roleRate.seniority
  )?.label || roleRate.seniority;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Papel</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o papel{' '}
            <strong>
              {roleRate.role_name} ({seniorityLabel})
            </strong>
            ? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
