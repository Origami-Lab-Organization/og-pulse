import { TrendingUp, Clock } from 'lucide-react';
import { AdminDashboardSection } from './AdminDashboardSection';
import { formatCurrency } from '@/lib/formatters';

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
 * Pipeline comercial — usa dados reais do módulo comercial quando houver leads
 * em negociação; caso contrário exibe estado vazio orientativo (HU-002).
 */
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
      description="Negociação em aberto e tempo de fechamento"
      loading={loading}
      empty={!hasPipeline}
      emptyMessage="Sem oportunidades com valor em negociação no período. Cadastre leads e orçamentos no CRM para acompanhar o pipeline."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Em negociação
            </p>
            <p className="text-xl font-bold mt-1">{formatCurrency(activePipeline)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pipelineLeadsWithBudgetCount} oportunidade(s)
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Time to close
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
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Por etapa
            </p>
            {pipelineByStage.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {s.name} <span className="text-xs">({s.count})</span>
                </span>
                <span className="font-medium">{formatCurrency(s.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminDashboardSection>
  );
}
