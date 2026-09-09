import { TrendingUp, Clock } from 'lucide-react';
import { AdminDashboardSection } from './AdminDashboardSection';
import { formatCurrency } from '@/lib/formatters';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

interface PipelineStage {
  name: string;
  value: number;
  count: number;
}

interface AdminPipelineCardProps {
  activePipeline: number;
  avgSalesCycleDays: number | null;
  pipelineLeadsWithBudgetCount: number;
  pipelineByStage: PipelineStage[];
  loading?: boolean;
}

/**
 * Pipeline comercial — retrato das oportunidades em aberto agora (sem recorte de data) e
 * tempo médio de fechamento dos negócios ganhos no período; sem oportunidade com valor,
 * exibe estado vazio orientativo (HU-002).
 */
interface StageRowProps {
  stage: PipelineStage;
  total: number;
}

/** Uma etapa: nome, quantas oportunidades, quanto vale e a fatia do pipeline em barra. */
function StageRow(props: StageRowProps) {
  const { stage, total } = props;
  const share = total > 0 ? Math.min(100, Math.round((stage.value / total) * 100)) : 0;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium text-foreground">{stage.name}</span>
        <span className="shrink-0 tabular-nums font-semibold text-foreground">{formatCurrency(stage.value)}</span>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`${stage.name}: ${share}% do pipeline`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={share}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {plural(stage.count, 'oportunidade', 'oportunidades')} · {share}%
        </span>
      </div>
    </li>
  );
}

export function AdminPipelineCard({
  activePipeline,
  avgSalesCycleDays,
  pipelineLeadsWithBudgetCount,
  pipelineByStage,
  loading,
}: AdminPipelineCardProps) {
  const hasPipeline = pipelineLeadsWithBudgetCount > 0 && activePipeline > 0;

  return (
    <AdminDashboardSection
      title="Pipeline Comercial"
      icon={TrendingUp}
      description="Oportunidades em aberto hoje e tempo de fechamento no período"
      loading={loading}
      empty={!hasPipeline}
      emptyMessage="Nenhuma oportunidade em aberto com valor. Cadastre oportunidades no Pipeline e informe o valor estimado ou vincule um orçamento para acompanhar."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Em negociação
            </p>
            <p className="text-xl font-bold mt-1">{formatCurrency(activePipeline)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {plural(pipelineLeadsWithBudgetCount, 'oportunidade com valor', 'oportunidades com valor')}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Tempo de fechamento
            </p>
            {avgSalesCycleDays != null ? (
              <>
                <p className="text-xl font-bold mt-1">
                  {Math.round(avgSalesCycleDays)} dias
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">ciclo médio de venda</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Sem negócios fechados no período para calcular.
              </p>
            )}
          </div>
        </div>

        {pipelineByStage.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Por etapa · quantidade e valor
            </p>
            <ul className="space-y-2.5">
              {pipelineByStage.map((s) => (
                <StageRow key={s.name} stage={s} total={activePipeline} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </AdminDashboardSection>
  );
}
