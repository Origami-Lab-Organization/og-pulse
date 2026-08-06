import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Clock, Compass, DollarSign, Lock, FileText, User, CalendarClock } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { LeadWithBudget, CRMStage, LEAD_SOURCE_OPTIONS, LEAD_SOURCE_LABELS, isRecentlyRestored } from '@/types/lead';
import { resolveLeadEstimatedValue, ServiceAvgTicketLookup, EMPTY_AVG_TICKET_LOOKUP } from '@/lib/leadValue';
import { Service, BillingType, BILLING_TYPE_LABELS } from '@/types/service';
import { LeadServiceRow } from '@/services/leadServicesService';
import { LeadFollowUp } from '@/hooks/useLeadFollowUps';
import { isFollowUpOverdue } from '@/lib/followUps';
import { useUpdateLead } from '@/hooks/useLeads';
import { cn } from '@/lib/utils';

const TYPE_DOT: Record<BillingType, string> = {
  fixed_scope: 'bg-green-500',
  recurring: 'bg-blue-500',
  success_fee: 'bg-amber-500',
  no_revenue: 'bg-gray-400',
};

const TYPE_BADGE_CLASSES: Record<BillingType, string> = {
  fixed_scope: 'bg-green-100 text-green-800 border-green-200',
  recurring: 'bg-blue-100 text-blue-800 border-blue-200',
  success_fee: 'bg-amber-100 text-amber-800 border-amber-200',
  no_revenue: 'bg-gray-100 text-gray-600 border-gray-200',
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
  avgTickets?: ServiceAvgTicketLookup;
  leadServices?: LeadServiceRow[];
  pendingFollowUps?: LeadFollowUp[];
}

const BILLING_TYPES: BillingType[] = ['fixed_scope', 'recurring', 'success_fee', 'no_revenue'];

export function LeadKanbanCard({ lead, currentStage, onClick, services = [], avgTickets = EMPTY_AVG_TICKET_LOOKUP, leadServices = [], pendingFollowUps = [] }: LeadKanbanCardProps) {
  const navigate = useNavigate();
  const updateLead = useUpdateLead();
  const isWon = currentStage === 'closed';
  const isLost = currentStage === 'closed_lost';
  const isLocked = isWon || isLost;

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
    if (isWon) return lead.closed_at || lead.updated_at;
    if (isLost) return lead.lost_at || lead.updated_at;
    if (lead.archived) return lead.archived_at;
    return null;
  };
  const elapsedTime = formatElapsedTime(lead.created_at, getEndDate());

  const daysInStage = getDaysInStage(lead.created_at, getEndDate());
  const stuckThreshold = ['screening', 'qualification'].includes(currentStage) ? 14 : 7;
  const isStuck = !isLocked && daysInStage > stuckThreshold;
  const reactivated = isRecentlyRestored(lead);

  const linkedServices = leadServices
    .map((ls) => services.find((s) => s.id === ls.service_id))
    .filter(Boolean) as Service[];

  const visibleServices = linkedServices.slice(0, 3);
  const extraCount = linkedServices.length - visibleServices.length;

  const linkedService = lead.service_line
    ? services.find((s) => s.id === lead.service_line) ?? null
    : null;

  const estimatedValue = resolveLeadEstimatedValue(lead, avgTickets);

  const hasOverdueFollowUp = pendingFollowUps.some((f) => isFollowUpOverdue(f));
  const followUpIndicator = hasOverdueFollowUp
    ? 'overdue'
    : pendingFollowUps.length > 0
    ? 'upcoming'
    : null;

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
        isWon
          ? 'border-l-chart-2 bg-chart-2/10'
          : isLost
          ? 'border-l-destructive bg-destructive/10'
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
            {followUpIndicator && (
              <CalendarClock
                aria-label={followUpIndicator === 'overdue' ? 'Follow-up vencido' : 'Follow-up agendado'}
                className={cn(
                  'h-3.5 w-3.5',
                  followUpIndicator === 'overdue' ? 'text-red-500' : 'text-emerald-500',
                )}
              />
            )}
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {elapsedTime}
            </span>
            {isLocked && <Lock className={cn('h-3.5 w-3.5', isLost ? 'text-destructive' : 'text-chart-2')} />}
          </div>
        </div>

        {/* Reactivated badge (48h after restore) */}
        {reactivated && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Reativada
          </span>
        )}

        {/* Company */}
        {lead.company_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{lead.company_name}</span>
          </div>
        )}

        {/* Service badges (all stages except qualification) */}
        {currentStage !== 'qualification' && (
          <>
            {linkedService && (
              <span className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none',
                TYPE_BADGE_CLASSES[linkedService.billingType]
              )}>
                {linkedService.name}
              </span>
            )}
            {visibleServices.length > 0 && (
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
            )}
          </>
        )}

        {/* Responsible */}
        {(lead.responsible?.nome || lead.creator?.nome) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{lead.responsible?.nome || lead.creator?.nome}</span>
          </div>
        )}

        {/* Value */}
        {lead.budget?.monthly_value != null && lead.budget.final_total === 0 ? (
          // no_revenue continuous — show as cost
          <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            Custo: {formatCurrency(lead.budget.monthly_value)}/mês
          </div>
        ) : lead.budget?.monthly_value != null ? (
          // recurring revenue
          <div className="flex items-center gap-1 text-xs font-semibold text-primary">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(lead.budget.monthly_value)}/mês
          </div>
        ) : lead.budget?.final_total != null && lead.budget.final_total > 0 ? (
          <div className="flex items-center gap-1 text-xs font-semibold text-primary">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(lead.budget.final_total)}
          </div>
        ) : estimatedValue > 0 && linkedService?.billingType !== 'no_revenue' ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>~ {formatCurrency(estimatedValue)}</span>
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

        {/* Origem — prospecção/oportunidade only, always last. Já é obrigatória na
            criação (LeadFormDialog); aqui fica visível/editável direto no card
            para o comercial revisar ou corrigir sem abrir o detalhe. */}
        {currentStage === 'screening' && (
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="pt-1 border-t border-border/50"
          >
            <Select
              value={lead.source || ''}
              onValueChange={(value) => updateLead.mutate({ id: lead.id, source: value })}
            >
              <SelectTrigger className={cn('h-7 text-xs w-full', !lead.source && 'border-amber-400 text-amber-700')}>
                <Compass className="h-3 w-3 mr-1 shrink-0 opacity-70" />
                <SelectValue placeholder="De onde veio este lead?" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Origem — badge somente leitura nas demais etapas, para contexto rápido. */}
        {currentStage !== 'screening' && lead.source && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Compass className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{LEAD_SOURCE_LABELS[lead.source] || lead.source}</span>
          </div>
        )}

        {/* Service select — qualification only, always last */}
        {currentStage === 'qualification' && (
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="pt-1 border-t border-border/50"
          >
            <Select
              value={lead.service_line || ''}
              onValueChange={(value) => updateLead.mutate({ id: lead.id, service_line: value })}
            >
              <SelectTrigger className="h-7 text-xs w-full">
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
        )}
      </CardContent>
    </Card>
  );
}
