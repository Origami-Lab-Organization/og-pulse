import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, DollarSign, Lock, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { LeadWithBudget, CRMStage } from '@/types/lead';
import { cn } from '@/lib/utils';

interface LeadKanbanCardProps {
  lead: LeadWithBudget;
  isDragging?: boolean;
  currentStage: CRMStage;
  onClick?: () => void;
}

export function LeadKanbanCard({ lead, isDragging, currentStage, onClick }: LeadKanbanCardProps) {
  const navigate = useNavigate();
  const isLocked = currentStage === 'closed';
  const canCreateBudget = !lead.budget_id && ['proposal', 'negotiation'].includes(currentStage);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
    disabled: isLocked,
  });

  const style = transform ? { transform: CSS.Transform.toString(transform) } : undefined;

  const handleCreateBudget = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/budgets/new?leadId=${lead.id}`);
  };

  const handleViewBudget = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.budget_id) navigate(`/budgets/${lead.budget_id}`);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only open detail if not dragging
    if (!transform && onClick) {
      onClick();
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={cn(
        'transition-all hover:shadow-md border-l-4',
        isDragging && 'opacity-50 rotate-2 shadow-lg',
        isLocked ? 'border-l-chart-2 bg-chart-2/10 cursor-default' : 'border-l-primary cursor-grab',
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm line-clamp-1 flex-1">{lead.name}</h4>
          {isLocked && <Lock className="h-3.5 w-3.5 text-chart-2 ml-2" />}
        </div>

        {/* Company */}
        {lead.company_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{lead.company_name}</span>
          </div>
        )}

        {/* Value - only show when budget is linked */}
        {lead.budget?.final_total != null && (
          <div className="flex items-center gap-1 text-xs font-semibold text-primary">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(lead.budget.final_total)}
          </div>
        )}

        {/* Budget badge */}
        {lead.budget && (
          <Badge
            variant="outline"
            className="text-xs font-mono cursor-pointer hover:bg-accent"
            onClick={handleViewBudget}
          >
            <FileText className="h-3 w-3 mr-1" />
            {lead.budget.budget_number}
          </Badge>
        )}

        {/* Create budget button */}
        {canCreateBudget && (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-7"
            onClick={handleCreateBudget}
          >
            <FileText className="h-3 w-3 mr-1" />
            Criar Orçamento
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
