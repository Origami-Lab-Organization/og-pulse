import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2, User, Calendar, Layers, History } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PortfolioProject } from '@/hooks/usePortfolioProjects';
import { useNavigate } from 'react-router-dom';

interface PortfolioCardProps {
  project: PortfolioProject;
}

export function PortfolioCard({ project }: PortfolioCardProps) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
    data: {
      type: 'project',
      project,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isNoRevenue = project.service?.billing_type === 'no_revenue';
  const installments = project.installments || [];
  const installmentsSum = installments.reduce((sum, i) => sum + Number(i.value), 0);
  const totalValue = installmentsSum > 0 ? installmentsSum : (project.total_value || 0);

  const receivedValue = installments
    .filter(i => i.status === 'received')
    .reduce((sum, i) => sum + Number(i.value), 0);
  const progressPercent = totalValue > 0 ? Math.round((receivedValue / totalValue) * 100) : 0;

  const clientName = project.client?.trading_name || project.client?.company_name || 'Cliente não definido';
  const managerName = project.manager?.nome || 'Gerente não definido';

  // Health badge
  const stage = project.portfolio_stage;
  const monthsElapsed = project.start_date
    ? Math.max(differenceInMonths(new Date(), parseISO(project.start_date)), 0)
    : 0;
  const expectedReceived = Math.min((monthsElapsed / 12) * totalValue, totalValue);
  const expectedPercent = totalValue > 0 ? (expectedReceived / totalValue) * 100 : 0;
  const actualPercent = totalValue > 0 ? (receivedValue / totalValue) * 100 : 0;
  const planningDays = project.start_date
    ? differenceInMonths(new Date(), parseISO(project.start_date)) * 30
    : 0;

  type HealthStatus = 'ok' | 'warning' | 'late';
  let health: HealthStatus = 'ok';
  if (stage === 'completed' || (!isNoRevenue && actualPercent >= Math.max(expectedPercent * 0.8, 0))) {
    health = 'ok';
  }
  if (
    (!isNoRevenue && actualPercent >= expectedPercent * 0.5 && actualPercent < expectedPercent * 0.8) ||
    (stage === 'planning' && planningDays > 30)
  ) {
    health = 'warning';
  }
  if (
    (!isNoRevenue && actualPercent < expectedPercent * 0.5) ||
    (!isNoRevenue && receivedValue === 0 && ['value_delivery', 'results_presentation', 'learning_case'].includes(stage))
  ) {
    health = 'late';
  }

  const healthBadge = isNoRevenue ? null : {
    ok:      { label: 'Em dia',   className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-[10px]' },
    warning: { label: 'Atenção',  className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 text-[10px]' },
    late:    { label: 'Atrasado', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-[10px]' },
  }[health];

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if dragging
    if (isDragging) return;
    navigate(`/projects/${project.id}`);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-3 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 shadow-lg rotate-2' : 'hover:shadow-md'
      }`}
      {...attributes}
      {...listeners}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <h4 className="font-medium text-sm text-foreground line-clamp-2 flex-1">
          {project.name}
        </h4>
        {healthBadge && (
          <Badge variant="outline" className={`shrink-0 ${healthBadge.className}`}>
            {healthBadge.label}
          </Badge>
        )}
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{clientName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <User className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{managerName}</span>
        </div>
        {project.service?.name && (
          <div className="flex items-center gap-1.5">
            <Layers className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{project.service.name}</span>
          </div>
        )}
      </div>

      {project.lead_id && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <History className="h-3 w-3" />
          <span>Histórico comercial disponível</span>
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-border">
        {isNoRevenue ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-medium">
              Sem receita
            </span>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-default">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Recebimento</span>
                <div className="flex items-center justify-between text-xs mb-1.5 mt-0.5">
                  <span className="font-medium text-foreground">{formatCurrency(totalValue)}</span>
                  <span className="text-muted-foreground">{progressPercent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs space-y-0.5">
              <p>Valor projetado: {formatCurrency(totalValue)}</p>
              <p>Valor recebido: {formatCurrency(receivedValue)}</p>
              <p>Percentual: {progressPercent}%</p>
            </TooltipContent>
          </Tooltip>
        )}
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            {project.start_date 
              ? format(parseISO(project.start_date), "dd MMM yyyy", { locale: ptBR })
              : 'Sem data'
            }
          </span>
        </div>
      </div>
    </Card>
  );
}
