import { Badge } from '@/components/ui/badge';
import { BudgetStatus, getBudgetStatusOption } from '@/types/budget';
import { cn } from '@/lib/utils';

interface BudgetStatusBadgeProps {
  status: BudgetStatus;
  className?: string;
}

export function BudgetStatusBadge({ status, className }: BudgetStatusBadgeProps) {
  const option = getBudgetStatusOption(status);
  
  return (
    <Badge variant="outline" className={cn(option.color, 'border-0', className)}>
      {option.label}
    </Badge>
  );
}
