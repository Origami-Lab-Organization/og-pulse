import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChannelsTab } from '@/components/prospeccao/metrics/ChannelsTab';
import { ConversionTab } from '@/components/prospeccao/metrics/ConversionTab';
import { EffortTab } from '@/components/prospeccao/metrics/EffortTab';
import { MetricDrillDialog } from '@/components/prospeccao/metrics/MetricDrillDialog';
import { OverviewTab } from '@/components/prospeccao/metrics/OverviewTab';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { useProspectMetricsData } from '@/hooks/useProspectMetricsData';
import { usePendingProspectTasks } from '@/hooks/useProspectTasks';
import { buildMilestones } from '@/lib/prospecting/milestones';
import {
  activityRhythm,
  bottleneckOf,
  leverConcentration,
  meetingsAwaitingQualification,
  periodReadings,
  stageRates,
} from '@/lib/prospecting/metricsReadings';
import {
  buildDataset,
  cutSafra,
  cycleTimes,
  listHealth,
  metricSeries,
  metricValues,
  occurrencesInRange,
  periodLosses,
  safraCounts,
  safraSeries,
  salesSummary,
} from '@/lib/prospecting/periodMetrics';
import { formatRange, formatRangeCompact, resolvePeriod, trendBuckets } from '@/lib/prospecting/periods';
import type { ProspectWithCompany } from '@/types/prospect';
import type {
  Bucket,
  Grain,
  MetricDefinition,
  MetricFilter,
  MetricsDataset,
  MetricsDrill,
  MetricsTab,
  PeriodSelection,
  ResolvedPeriod,
} from '@/types/prospectMetrics';

interface ProspectMetricsProps {
  prospects: ProspectWithCompany[];
  onOpenProspect: (prospect: ProspectWithCompany) => void;
  /** Período e filtro moram na página: os controles ficam na linha das abas Pipeline/Métricas. */
  selection: PeriodSelection;
  onSelectionChange: (selection: PeriodSelection) => void;
  filter: MetricFilter;
}

const ABAS: ReadonlyArray<{ value: MetricsTab; label: string }> = [
  { value: 'geral', label: 'Visão geral' },
  { value: 'esforco', label: 'Esforço' },
  { value: 'conv', label: 'Conversão' },
  { value: 'canais', label: 'Canais' },
];

const ABA_PADRAO: MetricsTab = 'geral';

/**
 * Métricas da Prospecção (29/09/2026), em quatro leituras: a visão geral responde "como
 * estamos" e aponta o que pede atenção; Esforço, Conversão e Canais aprofundam cada
 * pergunta — estou fazendo volume, o volume vira resultado, de onde vem o resultado. As
 * regras moram em `src/lib/prospecting/`; aqui só se escolhe o que mostrar.
 */
export function ProspectMetrics(props: ProspectMetricsProps) {
  const { prospects, onOpenProspect, selection, onSelectionChange, filter } = props;
  const [detalhe, setDetalhe] = useState<MetricsDrill | null>(null);

  const periodo = useMemo(() => resolvePeriod(selection), [selection]);
  const colunas = useMemo(() => trendBuckets(periodo, selection.grain), [periodo, selection.grain]);
  // Os minigráficos e a leitura de ritmo são sempre por semana, qualquer que seja o agrupamento da evolução.
  const semanas = useMemo(() => trendBuckets(periodo, 'semana'), [periodo]);
  const desde = [colunas[0].from, semanas[0].from, periodo.previous.from].sort()[0];
  const dados = useProspectMetricsData(desde);
  const { byId } = useEmployeeDirectoryMap();

  const marcos = useMemo(
    () => buildMilestones(prospects, dados.responses, dados.changes),
    [prospects, dados.responses, dados.changes],
  );
  const { companies, responses, activities, changes } = dados;
  const fonte = useMemo(
    () => ({ prospects, companies, responses, activities, changes }),
    [prospects, companies, responses, activities, changes],
  );
  const dataset = useMemo(() => buildDataset(fonte, marcos, filter), [fonte, marcos, filter]);

  if (dados.isLoading) return <Skeleton className="h-96 w-full" aria-label="Carregando as métricas" />;
  if (dados.isError) return <ErroAoCarregar onRetry={dados.refetch} />;
  if (prospects.length === 0) return <SemContatos />;

  return (
    <>
      <Metricas
        dataset={dataset}
        period={periodo}
        buckets={colunas}
        weeks={semanas}
        grain={selection.grain}
        onGrainChange={(grain) => onSelectionChange({ ...selection, grain })}
        onOpenDetail={setDetalhe}
        ownerName={(id) => byId.get(id)?.nome ?? 'Sem nome'}
      />
      <MetricDrillDialog
        open={!!detalhe}
        onOpenChange={(aberto) => !aberto && setDetalhe(null)}
        title={detalhe?.title ?? ''}
        description={detalhe?.description ?? ''}
        items={detalhe?.items ?? []}
        onOpenProspect={onOpenProspect}
      />
    </>
  );
}

interface MetricasProps {
  dataset: MetricsDataset;
  period: ResolvedPeriod;
  buckets: Bucket[];
  weeks: Bucket[];
  grain: Grain;
  onGrainChange: (grain: Grain) => void;
  onOpenDetail: (detalhe: MetricsDrill) => void;
  ownerName: (id: string) => string;
}

/** Tudo que as quatro sub-abas mostram, calculado uma vez: trocar de aba não recalcula nada. */
function useLeituras(props: MetricasProps) {
  const { dataset, period, buckets, weeks, grain } = props;
  const { porContato: proximaTarefa } = usePendingProspectTasks();
  const valores = useMemo(() => metricValues(dataset, period), [dataset, period]);
  const serie = useMemo(() => metricSeries(dataset, buckets, grain), [dataset, buckets, grain]);
  const semanal = useMemo(() => metricSeries(dataset, weeks, 'semana'), [dataset, weeks]);
  const safra = useMemo(() => safraCounts(dataset, period), [dataset, period]);
  const porAlavanca = useMemo(() => cutSafra(dataset, period, 'lever'), [dataset, period]);
  const porResponsavel = useMemo(() => cutSafra(dataset, period, 'owner'), [dataset, period]);
  const taxas = useMemo(() => stageRates(safra), [safra]);
  const vendas = useMemo(() => salesSummary(dataset, period), [dataset, period]);
  const saude = useMemo(() => listHealth(dataset, period, proximaTarefa), [dataset, period, proximaTarefa]);
  const aguardando = useMemo(() => meetingsAwaitingQualification(dataset), [dataset]);
  const ciclos = useMemo(() => cycleTimes(dataset, period), [dataset, period]);
  const safras = useMemo(() => safraSeries(dataset, trendBuckets(period, 'mes')), [dataset, period]);
  const perdas = useMemo(() => periodLosses(dataset, period), [dataset, period]);
  const gargalo = bottleneckOf(taxas);
  const concentracao = leverConcentration(porAlavanca);
  const leituras = periodReadings({ rates: taxas, bottleneck: gargalo, concentration: concentracao, rhythm: activityRhythm(semanal) });
  return {
    valores,
    serie,
    semanal,
    safra,
    taxas,
    gargalo,
    porAlavanca,
    porResponsavel,
    concentracao,
    leituras,
    vendas,
    saude,
    aguardando,
    ciclos,
    safras,
    perdas,
  };
}

function Metricas(props: MetricasProps) {
  const { dataset, period, grain, onGrainChange, onOpenDetail, ownerName } = props;
  const [aba, setAba] = useState<MetricsTab>(ABA_PADRAO);
  const l = useLeituras(props);
  // Sem nenhum registro no período anterior, toda variação seria "+N": escondê-las é mais honesto.
  const comBase = l.valores.some((v) => !!v.previous);

  const abrirMetrica = (def: MetricDefinition) =>
    onOpenDetail({
      title: def.label,
      description: `${formatRange(period.elapsed)} · ${def.question}`,
      items: occurrencesInRange(def, dataset, period.elapsed),
    });

  return (
    <div className="flex flex-col gap-5">
      <LinhaDoPeriodo period={period} comBase={comBase} />
      <Tabs value={aba} onValueChange={(v) => setAba(v as MetricsTab)}>
        <TabsList className="h-auto w-full justify-start gap-6 overflow-x-auto overflow-y-hidden rounded-none border-b bg-transparent p-0">
          {ABAS.map((a) => (
            <TabsTrigger
              key={a.value}
              value={a.value}
              className="-mb-px rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-sm hover:text-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {a.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="geral" className="mt-5">
          <OverviewTab
            values={l.valores}
            weekly={l.semanal}
            safra={l.safra}
            rates={l.taxas}
            bottleneck={l.gargalo}
            sales={l.vendas}
            readings={l.leituras}
            health={l.saude}
            awaiting={l.aguardando}
            showDelta={comBase}
            onGoTab={setAba}
            onOpenMetric={abrirMetrica}
            onOpenList={onOpenDetail}
          />
        </TabsContent>
        <TabsContent value="esforco" className="mt-5">
          <EffortTab
            values={l.valores}
            series={l.serie}
            grain={grain}
            onGrainChange={onGrainChange}
            coverage={l.saude.coverage}
            historyStart={dataset.historyStart}
            onOpenMetric={abrirMetrica}
          />
        </TabsContent>
        <TabsContent value="conv" className="mt-5">
          <ConversionTab rates={l.taxas} bottleneck={l.gargalo} cycles={l.ciclos} safras={l.safras} losses={l.perdas} />
        </TabsContent>
        <TabsContent value="canais" className="mt-5">
          <ChannelsTab byLever={l.porAlavanca} byOwner={l.porResponsavel} concentration={l.concentracao} ownerName={ownerName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LinhaDoPeriodo({ period, comBase }: { period: ResolvedPeriod; comBase: boolean }) {
  const anterior = formatRangeCompact(period.previous);
  return (
    <p className="-mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
      <span className="font-mono text-foreground">{formatRangeCompact(period.elapsed)}</span>
      <span aria-hidden="true">·</span>
      <span>
        {comBase
          ? `Comparando com ${anterior} (${period.comparisonLabel.replace(/^vs /, '')}).`
          : `Período anterior (${anterior}) sem registros — variações ocultas até haver base de comparação.`}
      </span>
    </p>
  );
}

function ErroAoCarregar({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
        <p className="text-sm">Não foi possível carregar as métricas.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Tentar de novo</Button>
      </CardContent>
    </Card>
  );
}

function SemContatos() {
  return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        Cadastre contatos na Prospecção para acompanhar as métricas.
      </CardContent>
    </Card>
  );
}
