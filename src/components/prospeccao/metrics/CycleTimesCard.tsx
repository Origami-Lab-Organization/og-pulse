import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { MIN_SAMPLE } from '@/lib/prospecting/periodMetrics';
import type { CycleTime } from '@/types/prospectMetrics';

interface CycleTimesCardProps {
  cycles: CycleTime[];
}

/** Velocidade: quanto tempo cada passagem leva, para quem passou por ela no período. */
export function CycleTimesCard(props: CycleTimesCardProps) {
  const { cycles } = props;
  return (
    <Card>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base">Tempo de ciclo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Mediana de quem passou por cada etapa no período: toques até a 1ª resposta, e dias do 1º toque à 1ª resposta,
          da 1ª resposta à reunião agendada, da reunião feita à qualificação e do 1º toque ao ganho. Um contato que
          demorou 60 dias não puxa o número do time.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cycles.map((c) => (
          <MetricCard
            key={c.key}
            label={c.label}
            wrapLabel
            value={c.median === null ? '—' : `${c.median.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${c.unit}`}
            subline={c.median === null ? `amostra pequena (${c.sample}/${MIN_SAMPLE})` : `${c.sample} contato(s)`}
          />
        ))}
      </CardContent>
    </Card>
  );
}
