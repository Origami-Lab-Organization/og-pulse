import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Flag, Package, Rocket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatHours, formatShortDate, parseDateString } from '@/lib/formatters';
import { PORTFOLIO_STAGE_LABELS, type PortfolioStage } from '@/types/portfolio';
import type { InternalProductSummary } from '@/types/internalProduct';

interface StatProps {
  label: string;
  value: string;
  hint?: string;
}

function Stat(props: StatProps) {
  const { label, value, hint } = props;
  return (
    <div className="min-w-0">
      <dt className="ui-label">{label}</dt>
      <dd className="mt-0.5 truncate text-base font-semibold tabular-nums text-foreground">{value}</dd>
      {hint && <dd className="truncate text-xs text-muted-foreground tabular-nums">{hint}</dd>}
    </div>
  );
}

interface CostStatProps {
  costTotal: number | null;
  costMonth: number | null;
}

/** Custo só existe para quem tem `financeiro:ler`: o banco devolve nulo para os demais. */
function CostStat(props: CostStatProps) {
  const { costTotal, costMonth } = props;
  if (costTotal === null) return null;
  return (
    <Stat
      label="Custo das horas"
      value={formatCurrency(costTotal)}
      hint={`${formatCurrency(costMonth ?? 0)} neste mês`}
    />
  );
}

interface RoadmapLineProps {
  icon: typeof Flag;
  label: string;
  value: string;
}

function RoadmapLine(props: RoadmapLineProps) {
  const { icon: Icon, label, value } = props;
  return (
    <p className="flex min-w-0 items-center gap-2 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate text-foreground">{value}</span>
    </p>
  );
}

/** "Título · 12 nov", ou só o título quando não há data. */
function withDate(text: string, on: string | null): string {
  return on ? `${text} · ${formatShortDate(on)}` : text;
}

function stageLabel(stage: string | null): string | null {
  if (!stage) return null;
  return PORTFOLIO_STAGE_LABELS[stage as PortfolioStage] ?? null;
}

function sinceLabel(firstHourOn: string | null): string {
  if (!firstHourOn) return 'sem horas ainda';
  return format(parseDateString(firstHourOn), "MMM 'de' yyyy", { locale: ptBR });
}

function teamLabel(size: number): string {
  return size === 1 ? '1 pessoa' : `${size} pessoas`;
}

function nextMilestoneLabel(product: InternalProductSummary): string {
  const next = product.nextMilestone;
  return next ? withDate(next.title, next.on) : 'nenhum marco aberto no roadmap';
}

function lastReleaseLabel(product: InternalProductSummary): string {
  const last = product.lastRelease;
  return last ? withDate(last.name, last.on) : 'nenhuma ainda';
}

interface InternalProductCardProps {
  product: InternalProductSummary;
}

/**
 * Um produto na tela Produtos (ADR-0049): quanto já se investiu, quem cuida, quem trabalha
 * nele agora e o que vem a seguir. O clique abre o projeto, que é o próprio produto.
 */
export function InternalProductCard(props: InternalProductCardProps) {
  const { product } = props;
  const stage = stageLabel(product.portfolioStage);

  return (
    <Link
      to={`/projects/${product.projectId}`}
      className="block rounded-lg border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Package className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">{product.name}</h2>
            <p className="truncate text-xs text-muted-foreground">Responsável: {product.managerName}</p>
          </div>
        </div>
        {stage && <Badge variant="secondary" className="shrink-0">{stage}</Badge>}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat
          label="Horas investidas"
          value={formatHours(product.hoursTotal)}
          hint={`${formatHours(product.hoursMonth)} neste mês`}
        />
        <CostStat costTotal={product.costTotal} costMonth={product.costMonth} />
        <Stat label="Equipe agora" value={teamLabel(product.teamSize)} />
        <Stat label="Desde" value={sinceLabel(product.firstHourOn)} />
      </dl>

      <div className="mt-4 space-y-1.5 border-t border-border pt-3">
        <RoadmapLine icon={Flag} label="Próximo:" value={nextMilestoneLabel(product)} />
        <RoadmapLine icon={Rocket} label="Última release:" value={lastReleaseLabel(product)} />
      </div>
    </Link>
  );
}
