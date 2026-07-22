import { Ban, Clock, UserMinus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EmployeeStatus, EMPLOYEE_STATUS_LABELS } from '@/types/employee';

const statusConfig: Record<
  EmployeeStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string; icon?: typeof Clock }
> = {
  ativo: { variant: 'default', className: 'bg-green-600 hover:bg-green-600/80' },
  aguardando_confirmacao: {
    variant: 'outline',
    className: 'border-amber-500 text-amber-600 bg-amber-50',
    icon: Clock,
  },
  bloqueado: { variant: 'destructive', icon: Ban },
  em_desligamento: {
    variant: 'outline',
    className: 'border-orange-500 text-orange-600 bg-orange-50',
    icon: UserMinus,
  },
  desligado: { variant: 'secondary' },
  arquivado: { variant: 'secondary' },
};

export const EmployeeStatusBadge = ({ status, className }: { status: EmployeeStatus; className?: string }) => {
  const { variant, className: styleClassName, icon: Icon } = statusConfig[status];
  return (
    <Badge variant={variant} className={cn(styleClassName, className)}>
      {Icon && <Icon className="h-3 w-3 mr-1" />}
      {EMPLOYEE_STATUS_LABELS[status]}
    </Badge>
  );
};
