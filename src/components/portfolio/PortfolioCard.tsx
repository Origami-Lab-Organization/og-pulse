import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { Bell, Building2, Calendar, Layers, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { clientLabel, projectKindOf } from '@/lib/projectKind';
import { daysToEnd, isNoRevenueProject, receivedOf } from '@/lib/portfolioBoard';
import type { PortfolioProject } from '@/hooks/usePortfolioProjects';
import { PORTFOLIO_BOARD_COLUMN, type PortfolioAlert, type PortfolioBoardColumnId } from '@/types/portfolio';

interface PortfolioCardProps {
  project: PortfolioProject;
  column: PortfolioBoardColumnId;
  /** Hoje, `yyyy-MM-dd`. */
  today: string;
  /** Pode arrastar o card (permissão sobre o projeto). */
  canDrag?: boolean;
  hideValues?: boolean;
  /** Pendências do projeto: o sino aparece com o número (US-0037). */
  alerts?: PortfolioAlert[];
}

const shortDate = (date: string) => format(parseISO(date), 'dd/MM/yy');

function closingText(endDate: string, today: string): string {
  const left = daysToEnd(endDate, today);
  if (left > 1) return `termina em ${left} dias (${shortDate(endDate)})`;
  if (left === 1) return `termina amanhã (${shortDate(endDate)})`;
  return left === 0 ? 'termina hoje' : `terminou em ${shortDate(endDate)}`;
}

function rangeText(project: PortfolioProject): string {
  const start = project.start_date ? shortDate(project.start_date) : '—';
  if (project.is_continuous) return `${start} → Contínuo`;
  return `${start} → ${project.end_date ? shortDate(project.end_date) : 'Sem previsão'}`;
}

/** Linha de datas do card; no Encerramento, quanto falta para o fim ou quando terminou. */
function periodText(project: PortfolioProject, column: PortfolioBoardColumnId, today: string): string {
  if (column === PORTFOLIO_BOARD_COLUMN.CLOSING && project.end_date) return closingText(project.end_date, today);
  return rangeText(project);
}

interface RevenueBlockProps {
  project: PortfolioProject;
  hideValues?: boolean;
}

/** Recebimento: valor do contrato, % recebido e barra. */
function RevenueBlock(props: RevenueBlockProps) {
  const { project, hideValues } = props;
  if (isNoRevenueProject(project)) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Sem receita
      </span>
    );
  }
  const totalValue = project.total_value || 0;
  const receivedValue = receivedOf(project);
  const progressPercent = totalValue > 0 ? Math.round((receivedValue / totalValue) * 100) : 0;
  const money = (value: number) => (hideValues ? '•••••' : formatCurrency(value));
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-default">
          <span className="ol-label text-[10px] text-muted-foreground">Recebimento</span>
          <div className="mb-1.5 mt-0.5 flex items-center justify-between text-sm">
            <span className="font-medium tabular-nums text-foreground">{money(totalValue)}</span>
            <span className="text-muted-foreground">{hideValues ? '•••' : `${progressPercent}%`}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            {!hideValues && <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="space-y-0.5 text-xs">
        <p>Valor do contrato: {money(totalValue)}</p>
        <p>Valor recebido: {money(receivedValue)}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface AlertBellProps {
  alerts: PortfolioAlert[];
}

/** Sino com a contagem de pendências; a lista aparece ao passar o mouse ou focar. */
function AlertBell(props: AlertBellProps) {
  const { alerts } = props;
  const label = `${alerts.length} ${alerts.length === 1 ? 'pendência' : 'pendências'}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={`${label}: ${alerts.map((a) => a.text).join('; ')}`}
          className="relative -mr-1 -mt-1 inline-grid h-8 w-8 shrink-0 place-items-center rounded-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute -right-0.5 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold leading-none text-destructive-foreground ring-2 ring-card">
            {alerts.length}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[280px] space-y-1 text-xs">
        <p className="font-semibold">{label}</p>
        {alerts.map((alert) => (
          <p key={alert.text}>• {alert.text}</p>
        ))}
        <p className="text-muted-foreground">Abra o projeto para resolver.</p>
      </TooltipContent>
    </Tooltip>
  );
}

const dragClassName = (canDrag: boolean, isDragging: boolean) => {
  if (!canDrag) return 'cursor-pointer hover:shadow-md';
  return isDragging ? 'cursor-grabbing opacity-50 shadow-lg' : 'cursor-grab hover:shadow-md';
};

/** Card do quadro do portfólio (US-0035): sem lixeira nem selos; abre o projeto ao clicar. */
export function PortfolioCard(props: PortfolioCardProps) {
  const { project, column, today, canDrag = false, hideValues, alerts = [] } = props;
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    disabled: !canDrag,
    data: { type: 'project', project },
  });

  const clientName = clientLabel(project.client?.trading_name || project.client?.company_name, projectKindOf(project));
  const managerName = project.manager?.nome || 'Gerente não definido';

  const dragProps = canDrag ? { ...attributes, ...listeners } : {};

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'p-4 transition-all',
        dragClassName(canDrag, isDragging),
      )}
      {...dragProps}
      onClick={() => {
        if (!isDragging) navigate(`/projects/${project.id}`);
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 text-[0.95rem] font-medium text-foreground">{project.name}</h4>
        {alerts.length > 0 && <AlertBell alerts={alerts} />}
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{clientName}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{managerName}</span>
        </div>
        {project.service?.name && (
          <div className="flex min-w-0 items-center gap-2">
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{project.service.name}</span>
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-border pt-2">
        <RevenueBlock project={project} hideValues={hideValues} />
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{periodText(project, column, today)}</span>
        </div>
      </div>
    </Card>
  );
}
