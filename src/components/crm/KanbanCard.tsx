import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, User, Calendar, DollarSign, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { BudgetWithDetails } from '@/types/budget';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  budget: BudgetWithDetails;
  isDragging?: boolean;
}

export function KanbanCard({ budget, isDragging }: KanbanCardProps) {
  const navigate = useNavigate();
  const isLocked = budget.status === 'active';
  
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: budget.id,
    disabled: isLocked,
  });

  const style = transform ? {
    transform: CSS.Transform.toString(transform),
  } : undefined;

  const handleClick = () => {
    navigate(`/budgets/${budget.id}`);
  };

  const clientOrLeadName = budget.client?.company_name || budget.client?.trading_name || budget.lead_name || 'Sem cliente';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={cn(
        'cursor-pointer transition-all hover:shadow-md border-l-4',
        isDragging && 'opacity-50 rotate-2 shadow-lg',
        isLocked ? 'border-l-chart-2 bg-chart-2/10' : 'border-l-primary',
        isLocked && 'cursor-default'
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header with number and lock */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs font-mono">
            {budget.budget_number}
          </Badge>
          {isLocked && (
            <Lock className="h-3.5 w-3.5 text-chart-2" />
          )}
        </div>

        {/* Title */}
        <h4 className="font-medium text-sm line-clamp-2">
          {budget.title}
        </h4>

        {/* Client/Lead */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {budget.client_id ? (
            <Building2 className="h-3 w-3 flex-shrink-0" />
          ) : (
            <User className="h-3 w-3 flex-shrink-0" />
          )}
          <span className="truncate">{clientOrLeadName}</span>
        </div>

        {/* Footer with value and date */}
        <div className="flex items-center justify-between pt-1 border-t">
          <div className="flex items-center gap-1 text-xs font-semibold text-primary">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(budget.final_total)}
          </div>
          {budget.valid_until && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(budget.valid_until), 'dd/MM', { locale: ptBR })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
