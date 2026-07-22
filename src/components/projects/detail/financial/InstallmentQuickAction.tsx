import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { InstallmentQuickActionKind } from '@/lib/installmentStatus';

interface InstallmentQuickActionProps {
  kind: Exclude<InstallmentQuickActionKind, 'none'>;
  onClick: () => void;
  disabled?: boolean;
}

const LABELS: Record<InstallmentQuickActionProps['kind'], string> = {
  mark_invoiced: 'Marcar NF emitida',
  register_payment: 'Registrar recebimento',
};

/** Ação rápida por status. `register_payment` é a ação primária (preenchida). */
export function InstallmentQuickAction({ kind, onClick, disabled }: InstallmentQuickActionProps) {
  const solid = kind === 'register_payment';
  return (
    <Button
      size="sm"
      variant={solid ? 'default' : 'outline'}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-8 gap-1.5 whitespace-nowrap rounded-full text-[11px] font-semibold',
        solid
          ? 'bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90'
          : 'text-primary-deep',
      )}
    >
      {LABELS[kind]}
      <ArrowRight className="h-3 w-3" />
    </Button>
  );
}
