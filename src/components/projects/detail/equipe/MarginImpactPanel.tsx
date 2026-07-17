import { ArrowRight, Info, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useMaskedCurrency, useMaskedPercent } from '@/contexts/HideValuesContext';
import { AllocationMarginImpact, MarginVerdict } from '@/types/equipe.types';

interface MarginImpactPanelProps {
  impact: AllocationMarginImpact | null | undefined;
  isLoading: boolean;
  /** A RPC de simulação falhou (ex.: função ausente no banco ou sem permissão). */
  isError?: boolean;
  /** Nome do candidato, para a nota de vaga orçada. */
  employeeName?: string;
  /** Papel selecionado é orçado e as horas compostas ≤ horas orçadas. */
  showBudgetedRoleNote?: boolean;
  /** Nenhuma hora composta ainda. */
  isEmpty: boolean;
}

const VERDICT_META: Record<
  Exclude<MarginVerdict, null>,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  fits: {
    label: 'Cabe no plano',
    dot: 'bg-primary-deep',
    text: 'text-primary-deep',
    bg: 'bg-primary-deep/10',
    border: 'border-primary-deep/30',
  },
  tightens: {
    label: 'Aperta a margem',
    dot: 'bg-warning',
    text: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
  },
  breaks: {
    label: 'Fura o plano',
    dot: 'bg-destructive',
    text: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
  },
};

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-4 py-2">
        <p className="ol-label text-muted-foreground">Impacto na margem</p>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          estimativa sobre o plano
        </span>
      </div>
      {children}
    </section>
  );
}

export function MarginImpactPanel({
  impact,
  isLoading,
  isError,
  employeeName,
  showBudgetedRoleNote,
  isEmpty,
}: MarginImpactPanelProps) {
  const formatCurrency = useMaskedCurrency();
  const formatPercent = useMaskedPercent();

  if (isEmpty) {
    return (
      <PanelShell>
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Defina as horas para ver o impacto no custo e na margem.
        </div>
      </PanelShell>
    );
  }

  if (isError) {
    return (
      <PanelShell>
        <div className="flex items-start gap-2 px-4 py-4">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-xs text-muted-foreground">
            Não foi possível calcular o impacto na margem agora. Tente ajustar as horas novamente.
          </p>
        </div>
      </PanelShell>
    );
  }

  if (isLoading || !impact) {
    return (
      <PanelShell>
        <div className="space-y-2 px-4 py-4">
          <div className="h-8 animate-pulse rounded-md bg-muted" />
          <div className="h-6 w-2/3 animate-pulse rounded-md bg-muted" />
          <div className="h-6 w-1/2 animate-pulse rounded-md bg-muted" />
        </div>
      </PanelShell>
    );
  }

  const custoBlock = (
    <div className="px-4 py-3">
      <p className="text-xs text-muted-foreground">Custo estimado da alocação</p>
      <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
        {formatCurrency(impact.custoEstimado)}
      </p>
      {impact.horasTotal > 0 && (
        <p className="text-xs text-muted-foreground">
          {Math.round(impact.horasTotal)}h × {formatCurrency(impact.custoHoraMedio)}/h médio
        </p>
      )}
    </div>
  );

  // Projeto interno (non_revenue): só custo.
  if (impact.isNonRevenue) {
    return (
      <PanelShell>
        {custoBlock}
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Projeto sem receita — impacto exibido apenas em custo.
        </p>
      </PanelShell>
    );
  }

  const verdictMeta = impact.verdict ? VERDICT_META[impact.verdict] : null;

  return (
    <PanelShell>
      {custoBlock}

      {/* Margem antes → depois */}
      <div className="border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">Margem planejada</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-base font-semibold tabular-nums text-muted-foreground">
            {formatPercent(impact.margemAtual ?? 0, 1)}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span
            className={cn(
              'font-mono text-base font-semibold tabular-nums',
              verdictMeta ? verdictMeta.text : 'text-foreground',
            )}
          >
            {formatPercent(impact.margemSimulada ?? 0, 1)}
          </span>
          <span className="text-xs text-muted-foreground">com esta alocação</span>
        </div>
      </div>

      {/* Veredito vs baseline */}
      {impact.hasBaseline && verdictMeta ? (
        <div className={cn('flex items-start gap-2 border-t px-4 py-3', verdictMeta.bg)}>
          <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', verdictMeta.dot)} aria-hidden />
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold', verdictMeta.text)}>{verdictMeta.label}</p>
            <p className="text-xs text-muted-foreground">
              Baseline do projeto: {formatPercent(impact.margemBaseline ?? 0, 1)} · tolerância: ±
              {Math.round(impact.tolPp)}pp
              {impact.deltaPp != null && (
                <>
                  {' · '}
                  <span className="inline-flex items-center gap-0.5">
                    {impact.deltaPp < 0 && <TrendingDown className="h-3 w-3" aria-hidden />}
                    {impact.deltaPp > 0 ? '+' : ''}
                    {formatPercent(impact.deltaPp, 1)} vs. baseline
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 border-t px-4 py-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-xs text-muted-foreground">
            Projeto sem baseline de margem — veredito indisponível.
          </p>
        </div>
      )}

      {/* Nota de vaga orçada */}
      {showBudgetedRoleNote && (
        <p className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          As horas deste papel já estavam no plano — o impacto reflete o custo real de{' '}
          {employeeName || 'quem for atribuído'} sobre o custo planejado corrente.
        </p>
      )}
    </PanelShell>
  );
}
