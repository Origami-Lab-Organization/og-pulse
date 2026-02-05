import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface SubmitWeekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: Date;
  weekEnd: Date;
  totalHours: number;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function SubmitWeekDialog({
  open,
  onOpenChange,
  weekStart,
  weekEnd,
  totalHours,
  onConfirm,
  isSubmitting,
}: SubmitWeekDialogProps) {
  const weekStartStr = format(weekStart, "dd/MM", { locale: ptBR });
  const weekEndStr = format(weekEnd, "dd/MM/yyyy", { locale: ptBR });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Enviar Semana
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Você está prestes a enviar os timesheets da semana{' '}
                <strong>{weekStartStr} - {weekEndStr}</strong>.
              </p>
              
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Total de horas lançadas</p>
                <p className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}h</p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  ⚠️ Após o envio, os valores serão <strong>travados</strong> e só poderão ser 
                  alterados por um administrador mediante justificativa.
                </p>
              </div>
            </div>
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
