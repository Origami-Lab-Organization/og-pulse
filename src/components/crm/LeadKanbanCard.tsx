import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Clock, DollarSign, Lock, FileText, User } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { LeadWithBudget, CRMStage, SERVICE_LINE_LABELS } from '@/types/lead';
import { cn } from '@/lib/utils';

function formatElapsedTime(createdAt: string, endDate?: string | null): string {
  const start = new Date(createdAt).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years >= 1) return `${years}a`;
  if (months >= 1) return `${months}m`;
  if (weeks >= 1) return `${weeks}sem`;
  if (days >= 1) return `${days}d`;
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(1, minutes)}min`;
}

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

  const getEndDate = () => {
    if (currentStage === 'closed') return lead.closed_at || lead.updated_at;
    if (lead.archived) return lead.archived_at;
    return null;
  };
  const elapsedTime = formatElapsedTime(lead.created_at, getEndDate());

  const handleClick = (e: React.MouseEvent) => {
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
        <div className="flex items-center justify-between gap-1">
          <h4 className="font-medium text-sm line-clamp-1 flex-1">{lead.name}</h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {elapsedTime}
            </span>
            {isLocked && <Lock className="h-3.5 w-3.5 text-chart-2" />}
          </div>
        </div>

        {/* Company */}
        {lead.company_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{lead.company_name}</span>
          </div>
        )}

        {/* Service Line */}
        {lead.service_line && (
          <span className="text-xs text-muted-foreground">
            {SERVICE_LINE_LABELS[lead.service_line] || lead.service_line}
          </span>
        )}

        {/* Responsible */}
        {(lead.responsible?.nome || lead.creator?.nome) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{lead.responsible?.nome || lead.creator?.nome}</span>
          </div>
        )}

        {/* Value - only show when budget is linked */}
        {lead.budget?.final_total != null && (
          <div className="flex items-center gap-1 text-xs font-semibold text-primary">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(lead.budget.final_total)}
          </div>
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
