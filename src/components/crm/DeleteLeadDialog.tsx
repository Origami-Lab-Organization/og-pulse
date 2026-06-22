import { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDeleteLead } from '@/hooks/useLeads';

interface DeleteLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  leadName: string;
  onDeleted?: () => void;
}

export function DeleteLeadDialog({ open, onOpenChange, leadId, leadName, onDeleted }: DeleteLeadDialogProps) {
  const deleteMutation = useDeleteLead();
  const [confirmText, setConfirmText] = useState('');

  // Limpa o campo de confirmação sempre que o diálogo abre/fecha.
  useEffect(() => {
    if (!open) setConfirmText('');
  }, [open]);

  const canDelete = !!leadName.trim() && confirmText.trim() === leadName.trim();

  const handleDelete = () => {
    if (!leadId || !canDelete) return;
    deleteMutation.mutate(leadId, {
      onSuccess: () => {
        onOpenChange(false);
        onDeleted?.();
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Oportunidade</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Para confirmar, digite o nome exato da
            oportunidade: <strong>{leadName}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delete-confirm">Nome da oportunidade</Label>
          <Input
            id="delete-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={leadName}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!canDelete || deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Excluindo...' : 'Confirmar exclusão'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
