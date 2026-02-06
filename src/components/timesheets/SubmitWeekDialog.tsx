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

interface SubmitProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  weekStart: Date;
  weekEnd: Date;
  totalHours: number;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function SubmitProjectDialog({
  open,
  onOpenChange,
  projectName,
  weekStart,
  weekEnd,
  totalHours,
  onConfirm,
  isSubmitting,
}: SubmitProjectDialogProps) {
  const weekStartStr = format(weekStart, "dd/MM", { locale: ptBR });
  const weekEndStr = format(weekEnd, "dd/MM/yyyy", { locale: ptBR });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar Projeto</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Deseja enviar os timesheets do projeto{' '}
              <strong className="text-foreground">{projectName}</strong> para a semana de{' '}
              <strong className="text-foreground">{weekStartStr} - {weekEndStr}</strong>?
            </p>
            <p>
              Total de horas: <strong className="text-foreground">{totalHours.toFixed(1)}h</strong>
            </p>
            <p className="text-sm">
              Após o envio, os valores ficarão travados e apenas administradores poderão editá-los.
            </p>
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

interface SubmitAllProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingCount: number;
  weekStart: Date;
  weekEnd: Date;
  totalHours: number;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function SubmitAllProjectsDialog({
  open,
  onOpenChange,
  pendingCount,
  weekStart,
  weekEnd,
  totalHours,
  onConfirm,
  isSubmitting,
}: SubmitAllProjectsDialogProps) {
  const weekStartStr = format(weekStart, "dd/MM", { locale: ptBR });
  const weekEndStr = format(weekEnd, "dd/MM/yyyy", { locale: ptBR });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar Todos os Projetos</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Deseja enviar os timesheets de{' '}
              <strong className="text-foreground">{pendingCount} projeto(s)</strong> para a semana de{' '}
              <strong className="text-foreground">{weekStartStr} - {weekEndStr}</strong>?
            </p>
            <p>
              Total de horas: <strong className="text-foreground">{totalHours.toFixed(1)}h</strong>
            </p>
            <p className="text-sm">
              Após o envio, os valores ficarão travados e apenas administradores poderão editá-los.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? 'Enviando...' : `Enviar ${pendingCount} Projeto(s)`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Keep legacy export for backward compatibility
export function SubmitWeekDialog({
  open,
  onOpenChange,
  weekStart,
  weekEnd,
  onConfirm,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: Date;
  weekEnd: Date;
  onConfirm: () => void;
  isSubmitting: boolean;
}) {
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
