import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { ProspectMetrics } from '@/components/prospeccao/ProspectMetrics';
import { MetricsFilterBar } from '@/components/prospeccao/metrics/MetricsFilterBar';
import { useProspects } from '@/hooks/useProspects';
import { DEFAULT_PERIOD } from '@/lib/prospecting/periods';
import type { ProspectWithCompany } from '@/types/prospect';
import type { MetricFilter, PeriodSelection } from '@/types/prospectMetrics';

/**
 * Métricas comerciais (29/09/2026): eram uma aba da Prospecção e viraram item do menu
 * Comercial — é a tela de acompanhamento, não de trabalho, e merece endereço próprio.
 * Com as Oportunidades absorvidas (ADR-0040), é também o que sobrou de /analises/comercial.
 *
 * Abrir um contato daqui leva à ficha no quadro da Prospecção (`?contato=`), que é onde
 * ele é trabalhado.
 */
export default function ProspeccaoMetricas() {
  const { data: todos = [], isLoading } = useProspects();
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<PeriodSelection>(DEFAULT_PERIOD);
  const [filtro, setFiltro] = useState<MetricFilter>({});

  const abrirContato = (prospect: ProspectWithCompany) =>
    navigate(`/comercial/prospeccao?contato=${encodeURIComponent(prospect.id)}`);

  return (
    <AppLayout
      title="Métricas"
      description="Como o comercial está andando: atividade, conversa, reunião, ganho e perda no período"
      breadcrumbs={[{ label: 'Comercial' }, { label: 'Métricas' }]}
      actions={
        <MetricsFilterBar
          selection={periodo}
          onSelectionChange={setPeriodo}
          filter={filtro}
          onFilterChange={setFiltro}
          prospects={todos}
        />
      }
    >
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <ProspectMetrics
          prospects={todos}
          onOpenProspect={abrirContato}
          selection={periodo}
          onSelectionChange={setPeriodo}
          filter={filtro}
        />
      )}
    </AppLayout>
  );
}
