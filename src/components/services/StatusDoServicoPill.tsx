import { AlertTriangle } from 'lucide-react';
import { ROTULO_DO_STATUS, STATUS_DO_SERVICO, type StatusDoServico } from '@/lib/catalogo.constants';
import { cn } from '@/lib/utils';

const ESTILO_DO_STATUS: Record<StatusDoServico, string> = {
  ativo: 'bg-success-subtle text-primary',
  sem_modelo: 'bg-warning-subtle text-warning-emphasis',
  desativado: 'bg-muted text-muted-foreground',
  linha_desativada: 'bg-muted text-muted-foreground',
};

/** Situação do serviço em uma pílula (US-0046). */
export function StatusDoServicoPill(props: { status: StatusDoServico; className?: string }) {
  const { status, className } = props;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        ESTILO_DO_STATUS[status],
        className,
      )}
    >
      {status === STATUS_DO_SERVICO.SEM_MODELO && <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
      {ROTULO_DO_STATUS[status]}
    </span>
  );
}
