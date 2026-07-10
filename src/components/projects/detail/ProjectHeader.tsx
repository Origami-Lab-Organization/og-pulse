import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Calendar, User, Layers, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectWithRelations } from '@/types/project';
import { PORTFOLIO_STAGE_LABELS, PortfolioStage } from '@/types/portfolio';
import { PROJECT_STATUS_LABELS, ProjectStatus } from '@/types/project';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectHeaderProps {
  project: ProjectWithRelations;
  actions?: React.ReactNode;
}

// Ordem oficial dos estágios do portfólio (jornada gp.md) — usada no stepper.
const STAGE_ORDER: PortfolioStage[] = [
  'planning',
  'value_delivery',
  'results_presentation',
  'learning_case',
  'completed',
];

// Status que renderizam como "saudável" (badge verde de ênfase). Demais
// status caem no estilo neutro/semântico correspondente.
const STATUS_TONE: Record<ProjectStatus, 'ok' | 'neutral' | 'danger'> = {
  planning: 'neutral',
  active: 'ok',
  paused: 'neutral',
  completed: 'ok',
  cancelled: 'danger',
};

function StageStepper({ current }: { current: PortfolioStage }) {
  const currentIndex = STAGE_ORDER.indexOf(current);

  return (
    <ol className="flex flex-nowrap items-center gap-x-1 overflow-x-auto">
      {STAGE_ORDER.map((stage, index) => {
        const isCurrent = index === currentIndex;
        const isDone = index < currentIndex;
        return (
          <li key={stage} className="flex shrink-0 items-center gap-1">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                isCurrent && 'bg-primary-deep text-primary-deep-foreground',
                isDone && 'text-primary-deep',
                !isCurrent && !isDone && 'text-muted-foreground',
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isDone ? (
                <Check className="h-3 w-3 shrink-0" aria-hidden />
              ) : (
                <span
                  className={cn(
                    'inline-block h-1.5 w-1.5 rounded-full',
                    isCurrent ? 'bg-primary-deep-foreground' : 'bg-current opacity-50',
                  )}
                  aria-hidden
                />
              )}
              {PORTFOLIO_STAGE_LABELS[stage]}
            </span>
            {index < STAGE_ORDER.length - 1 && (
              <span
                className={cn(
                  'h-px w-5 shrink-0',
                  index < currentIndex ? 'bg-primary-deep/40' : 'bg-border',
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function ProjectHeader({ project, actions }: ProjectHeaderProps) {
  const startDate = parseISO(project.start_date);
  const endDate = project.end_date ? parseISO(project.end_date) : null;

  const clientName = project.client?.trading_name || project.client?.company_name || '-';
  const managerName = project.manager?.nome || '-';
  const stage = (project.portfolio_stage || 'planning') as PortfolioStage;
  const status = (project.status || 'planning') as ProjectStatus;
  const tone = STATUS_TONE[status];

  const formatPeriod = () => {
    const start = format(startDate, 'MMM/yyyy', { locale: ptBR });
    if (project.is_continuous) return `${start} - Contínuo`;
    if (endDate) return `${start} - ${format(endDate, 'MMM/yyyy', { locale: ptBR })}`;
    return start;
  };

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-6">
      {/* Bloco esquerdo: breadcrumb + título + metadados */}
      <div className="min-w-0 space-y-2">
        {/* Breadcrumb */}
        <nav aria-label="Trilha de navegação">
          <ol className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <li>
              <Link
                to="/projetos"
                className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Portfólio
              </Link>
            </li>
            <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
            <li className="truncate text-foreground/70">{project.name}</li>
          </ol>
        </nav>

        {/* Título + status */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground">
            {project.name}
          </h1>
          {/* Status do projeto (ex.: "Em Planejamento") ocultado a pedido — comentado, não removido. */}
          {/* <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
              tone === 'ok' && 'bg-primary-deep/10 text-primary-deep',
              tone === 'neutral' && 'bg-muted text-muted-foreground',
              tone === 'danger' && 'bg-destructive/10 text-destructive',
            )}
          >
            {tone === 'ok' && <Check className="h-3.5 w-3.5" aria-hidden />}
            {PROJECT_STATUS_LABELS[status]}
          </span> */}
        </div>

        {/* Metadados */}
        <div className="flex flex-wrap items-center justify-start gap-x-4 lg:gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="font-medium text-foreground truncate">{clientName}</span>
          </span>
          {project.service?.name && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{project.service.name}</span>
            </span>
          )}
          <span className="flex min-w-0 items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{managerName}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{formatPeriod()}</span>
          </span>
        </div>

      </div>

      {/* Bloco direito: stepper de estágios + ações, alinhados à direita */}
      <div className="flex items-start gap-3 xl:shrink-0 xl:justify-end">
        <StageStepper current={stage} />
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
