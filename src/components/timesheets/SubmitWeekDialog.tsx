import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface SubmitWeekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: Date;
  weekEnd: Date;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function SubmitWeekDialog({
  open,
  onOpenChange,
  weekStart,
  weekEnd,
  onConfirm,
  isSubmitting,
}: SubmitWeekDialogProps) {
  const weekStartStr = format(weekStart, "dd/MM", { locale: ptBR });
  const weekEndStr = format(weekEnd, "dd/MM/yyyy", { locale: ptBR });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar Semana</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja enviar os timesheets da semana{' '}
            <strong className="text-foreground">{weekStartStr} - {weekEndStr}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? 'Enviando...' : 'Confirmar Envio'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
