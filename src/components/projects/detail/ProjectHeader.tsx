import { ServicoDoProjeto } from '@/components/catalogo/ServicoDoProjeto';
import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Calendar, User, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectWithRelations } from '@/types/project';
import { PORTFOLIO_STAGE_LABELS, PortfolioStage } from '@/types/portfolio';
import { PROJECT_STATUS_LABELS, ProjectStatus } from '@/types/project';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectHeaderProps {
  project: ProjectWithRelations;
  actions?: React.ReactNode;
  /** Frase sob o título — no planejamento, "Em planejamento há N dias · começa em…" (US-0039). */
  subtitle?: React.ReactNode;
  /** Itens a mais na linha de metadados — no planejamento, contrato, parcelas e origem (US-0039). */
  extraMeta?: React.ReactNode;
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

function formatPeriod(project: ProjectWithRelations) {
  const start = format(parseISO(project.start_date), 'MMM/yyyy', { locale: ptBR });
  if (project.is_continuous) return `${start} - Contínuo`;
  if (project.end_date) return `${start} - ${format(parseISO(project.end_date), 'MMM/yyyy', { locale: ptBR })}`;
  return start;
}

/** Linha de metadados: cliente, serviço, gerente e período. */
function ProjectMeta({ project, extra }: { project: ProjectWithRelations; extra?: React.ReactNode }) {
  const clientName = project.client?.trading_name || project.client?.company_name || '-';
  const managerName = project.manager?.nome || '-';
  const period = formatPeriod(project);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="whitespace-nowrap font-medium text-foreground" title={clientName}>{clientName}</span>
      </span>
      {/* US-0048: ícone da linha e etiqueta do serviço. */}
      <ServicoDoProjeto serviceLine={project.service_line} />
      <span className="inline-flex items-center gap-1.5">
        <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="whitespace-nowrap" title={managerName}>{managerName}</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="whitespace-nowrap" title={period}>{period}</span>
      </span>
      {extra}
    </div>
  );
}

export function ProjectHeader({ project, actions, subtitle, extraMeta }: ProjectHeaderProps) {
  const stage = (project.portfolio_stage || 'planning') as PortfolioStage;
  const status = (project.status || 'planning') as ProjectStatus;
  const tone = STATUS_TONE[status];

  // Produto interno mora em Produtos, não no portfólio (ADR-0049).
  const parent = project.is_internal_product
    ? { label: 'Produtos', href: '/projetos/produtos' }
    : { label: 'Portfólio', href: '/projetos/portfolio' };

  return (
    <div className="space-y-3">
      {/* Título com largura de leitura garantida: se não couber junto, o stepper desce de linha. */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        {/* Bloco esquerdo: breadcrumb + título */}
        <div className="min-w-0 flex-[1_1_28rem] space-y-2">
        {/* Breadcrumb */}
        <nav aria-label="Trilha de navegação">
          <ol className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <li>
              <Link
                to={parent.href}
                className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {parent.label}
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
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}

        </div>

        {/* Bloco direito: stepper de estágios + ações, alinhados à direita */}
        <div className="ml-auto flex min-w-0 max-w-full items-start gap-3">
          <div className="min-w-0">
            <StageStepper current={stage} />
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>

      <ProjectMeta project={project} extra={extraMeta} />
    </div>
  );
}
