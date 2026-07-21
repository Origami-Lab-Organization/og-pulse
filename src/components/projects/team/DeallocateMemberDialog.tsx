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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface DeallocateMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  /** Horas planejadas do membro no mês vigente neste projeto. */
  currentMonthPlanned: number;
  currentMonthLabel: string;
  nextMonthLabel: string;
  onConfirm: (clearCurrentMonth: boolean) => void;
}

type CurrentMonthChoice = 'keep' | 'clear';

export function DeallocateMemberDialog({
  open,
  onOpenChange,
  memberName,
  currentMonthPlanned,
  currentMonthLabel,
  nextMonthLabel,
  onConfirm,
}: DeallocateMemberDialogProps) {
  // "manter" é o default mais seguro — não apaga trabalho já em curso.
  const [choice, setChoice] = useState<CurrentMonthChoice>('keep');
  const hasCurrentPlan = currentMonthPlanned > 0;

  // Reseta a escolha sempre que o diálogo reabre.
  useEffect(() => {
    if (open) setChoice('keep');
  }, [open]);

  const handleConfirm = () => {
    onConfirm(hasCurrentPlan ? choice === 'clear' : false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desalocar {memberName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasCurrentPlan ? (
              <>
                {memberName} tem{' '}
                <span className="font-semibold text-foreground">
                  {Math.round(currentMonthPlanned)}h
                </span>{' '}
                planejadas em {currentMonthLabel}. Os meses seguintes serão zerados
                automaticamente. Meses anteriores não são afetados.
              </>
            ) : (
              <>
                As horas planejadas a partir de {nextMonthLabel} serão zeradas. Meses
                anteriores não são afetados.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasCurrentPlan && (
          <RadioGroup
            value={choice}
            onValueChange={(v) => setChoice(v as CurrentMonthChoice)}
            className="gap-2"
          >
            <label
              htmlFor="deallocate-keep"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary-deep has-[:checked]:bg-accent-subtle"
            >
              <RadioGroupItem value="keep" id="deallocate-keep" className="mt-0.5" />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">
                  Manter as {Math.round(currentMonthPlanned)}h planejadas de {currentMonthLabel}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Trabalho já em curso neste mês é preservado.
                </span>
              </span>
            </label>
            <label
              htmlFor="deallocate-clear"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary-deep has-[:checked]:bg-accent-subtle"
            >
              <RadioGroupItem value="clear" id="deallocate-clear" className="mt-0.5" />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">
                  Zerar também {currentMonthLabel}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Para desalocação retroativa ou erro de alocação.
                </span>
              </span>
            </label>
          </RadioGroup>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Desalocar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
