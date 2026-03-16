import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Clock, DollarSign, Lock, FileText, User } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { LeadWithBudget, CRMStage } from '@/types/lead';
import { Service, BillingType, BILLING_TYPE_LABELS } from '@/types/service';
import { LeadServiceRow } from '@/services/leadServicesService';
import { useUpdateLead } from '@/hooks/useLeads';
import { cn } from '@/lib/utils';

const TYPE_DOT: Record<BillingType, string> = {
  fixed_scope: 'bg-green-500',
  recurring: 'bg-blue-500',
  success_fee: 'bg-amber-500',
  no_revenue: 'bg-gray-400',
};
import { useNavigate } from 'react-router-dom';

function formatElapsedTime(createdAt: string, endDate?: string | null): string {
  const diffMs = Math.max(0, (endDate ? new Date(endDate).getTime() : Date.now()) - new Date(createdAt).getTime());
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

function getDaysInStage(createdAt: string, endDate?: string | null): number {
  const start = new Date(createdAt).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  return Math.floor(Math.max(0, end - start) / 86400000);
}

interface LeadKanbanCardProps {
  lead: LeadWithBudget;
  currentStage: CRMStage;
  onClick?: () => void;
  services?: Service[];
  leadServices?: LeadServiceRow[];
}

const BILLING_TYPES: BillingType[] = ['fixed_scope', 'recurring', 'success_fee', 'no_revenue'];

export function LeadKanbanCard({ lead, currentStage, onClick, services = [], leadServices = [] }: LeadKanbanCardProps) {
  const navigate = useNavigate();
  const updateLead = useUpdateLead();
  const isLocked = currentStage === 'closed';

  const activeServices = services.filter((s) => s.isActive);
  const servicesByType = BILLING_TYPES.reduce((acc, type) => {
    acc[type] = activeServices.filter((s) => s.billingType === type);
    return acc;
  }, {} as Record<BillingType, Service[]>);
  const canCreateBudget = !lead.budget_id && ['proposal', 'negotiation'].includes(currentStage);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead, currentStage },
    disabled: isLocked || lead.archived,
  });

  const getEndDate = () => {
    if (currentStage === 'closed') return lead.closed_at || lead.updated_at;
    if (lead.archived) return lead.archived_at;
    return null;
  };
  const elapsedTime = formatElapsedTime(lead.created_at, getEndDate());

  const daysInStage = getDaysInStage(lead.created_at, getEndDate());
  const stuckThreshold = ['screening', 'qualification'].includes(currentStage) ? 14 : 7;
  const isStuck = !isLocked && daysInStage > stuckThreshold;

  const linkedServices = leadServices
    .map((ls) => services.find((s) => s.id === ls.service_id))
    .filter(Boolean) as Service[];

  const visibleServices = linkedServices.slice(0, 3);
  const extraCount = linkedServices.length - visibleServices.length;

  const handleCreateBudget = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/budgets/new?leadId=${lead.id}`);
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      {...listeners}
      {...attributes}
      className={cn(
        'transition-all hover:shadow-md border-l-4 cursor-grab active:cursor-grabbing',
        isLocked && 'cursor-default',
        isLocked
          ? 'border-l-chart-2 bg-chart-2/10'
          : isStuck
          ? 'border-l-amber-400'
          : 'border-l-primary',
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header: name + elapsed time + lock */}
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

        {/* Service: inline select in qualification, badges elsewhere */}
        {currentStage === 'qualification' ? (
          <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <Select
              value={lead.service_line || ''}
              onValueChange={(value) => updateLead.mutate({ id: lead.id, service_line: value })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Selecionar serviço..." />
              </SelectTrigger>
              <SelectContent>
                {BILLING_TYPES.map((type) =>
                  servicesByType[type].length > 0 && (
                    <SelectGroup key={type}>
                      <SelectLabel className="text-xs">{BILLING_TYPE_LABELS[type]}</SelectLabel>
                      {servicesByType[type].map((svc) => (
                        <SelectItem key={svc.id} value={svc.id} className="text-xs">{svc.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        ) : visibleServices.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {visibleServices.map((svc) => (
              <span
                key={svc.id}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground max-w-[90px]"
              >
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', TYPE_DOT[svc.billingType])} />
                <span className="truncate">{svc.name}</span>
              </span>
            ))}
            {extraCount > 0 && (
              <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                +{extraCount}
              </span>
            )}
          </div>
        ) : null}

        {/* Responsible */}
        {(lead.responsible?.nome || lead.creator?.nome) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{lead.responsible?.nome || lead.creator?.nome}</span>
          </div>
        )}

        {/* Value */}
        {lead.budget?.final_total != null ? (
          <div className="flex items-center gap-1 text-xs font-semibold text-primary">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(lead.budget.final_total)}
          </div>
        ) : lead.estimated_value > 0 ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>~ {formatCurrency(lead.estimated_value)}</span>
          </div>
        ) : null}

        {/* Create budget button */}
        {canCreateBudget && (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-7"
            onClick={handleCreateBudget}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <FileText className="h-3 w-3 mr-1" />
            Criar Orçamento
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
