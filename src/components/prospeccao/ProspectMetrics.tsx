import { useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChannelsTab } from '@/components/prospeccao/metrics/ChannelsTab';
import { ConversionTab } from '@/components/prospeccao/metrics/ConversionTab';
import { EffortTab } from '@/components/prospeccao/metrics/EffortTab';
import { MethodSheet } from '@/components/prospeccao/metrics/MethodSheet';
import { MetricDrillDialog } from '@/components/prospeccao/metrics/MetricDrillDialog';
import { MetricsFilterBar } from '@/components/prospeccao/metrics/MetricsFilterBar';
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
import { saidasDaQualificacao } from '@/lib/prospecting/qualificacaoMetrics';
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
  /** Período e filtro moram na página; a barra que os muda fica aqui, acima das abas. */
  selection: PeriodSelection;
  onSelectionChange: (selection: PeriodSelection) => void;
  filter: MetricFilter;
  onFilterChange: (filter: MetricFilter) => void;
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
  const { prospects, onOpenProspect, selection, onSelectionChange, filter, onFilterChange } = props;
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
  const { companies, responses, activities, changes, decisoes, evidencias } = dados;
  const fonte = useMemo(
    () => ({ prospects, companies, responses, activities, changes, decisoes, evidencias }),
    [prospects, companies, responses, activities, changes, decisoes, evidencias],
  );
  const dataset = useMemo(() => buildDataset(fonte, marcos, filter), [fonte, marcos, filter]);

  const barra = (resumo: ReactNode) => (
    <MetricsFilterBar
      selection={selection}
      onSelectionChange={onSelectionChange}
      filter={filter}
      onFilterChange={onFilterChange}
      prospects={prospects}
      resumo={resumo}
    />
  );
  const semComparacao = <ResumoDoPeriodo period={periodo} comBase={null} />;

  if (dados.isLoading) return <ComBarra barra={barra(semComparacao)}><Skeleton className="h-96 w-full" aria-label="Carregando as métricas" /></ComBarra>;
  if (dados.isError) return <ComBarra barra={barra(semComparacao)}><ErroAoCarregar onRetry={dados.refetch} /></ComBarra>;
  if (prospects.length === 0) return <SemContatos />;

  return (
    <>
      <Metricas
        barra={barra}
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
  /** A barra de período e filtros, com o resumo do período que esta leitura calcula. */
  barra: (resumo: ReactNode) => ReactNode;
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
  const porTipo = useMemo(() => cutSafra(dataset, period, 'tipo_conta'), [dataset, period]);
  const saidas = useMemo(() => saidasDaQualificacao(dataset, period.elapsed), [dataset, period]);
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
    porTipo,
    saidas,
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
  const { barra, dataset, period, grain, onGrainChange, onOpenDetail, ownerName } = props;
  const [aba, setAba] = useState<MetricsTab>(ABA_PADRAO);
  const [metodoAberto, setMetodoAberto] = useState(false);
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
      <Tabs value={aba} onValueChange={(v) => setAba(v as MetricsTab)}>
        {/*
          Uma linha só (revisão de 23/11/2026): as abas à esquerda; à direita, o período, os
          filtros e "Como contamos". Em tela estreita, os controles descem para a linha de baixo.
        */}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-b">
          <TabsList className="h-auto min-w-0 justify-start gap-6 overflow-x-auto overflow-y-hidden rounded-none bg-transparent p-0">
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
          <div className="mb-2 ml-auto">{barra(<ResumoDoPeriodo period={period} comBase={comBase} />)}</div>
        </div>
        {/* "Como contamos" acima dos quadros, à direita: explica as quatro abas (revisão de 23/11/2026). */}
        <div className="mt-3 flex justify-end">
          <Button variant="link" size="sm" className="h-auto gap-1.5 px-0 text-xs text-muted-foreground hover:text-foreground" onClick={() => setMetodoAberto(true)}>
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            Como contamos
          </Button>
        </div>
        <MethodSheet open={metodoAberto} onOpenChange={setMetodoAberto} />

        <TabsContent value="geral" className="mt-2">
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
        <TabsContent value="esforco" className="mt-2">
          <EffortTab
            values={l.valores}
            series={l.serie}
            grain={grain}
            onGrainChange={onGrainChange}
            triagem={l.saude.triagem}
            historyStart={dataset.historyStart}
            onOpenMetric={abrirMetrica}
          />
        </TabsContent>
        <TabsContent value="conv" className="mt-2">
          <ConversionTab
            rates={l.taxas}
            bottleneck={l.gargalo}
            cycles={l.ciclos}
            safras={l.safras}
            losses={l.perdas}
            exits={l.saidas}
            bant={l.saude.bant}
            onOpenList={onOpenDetail}
          />
        </TabsContent>
        <TabsContent value="canais" className="mt-2">
          <ChannelsTab byLever={l.porAlavanca} byOwner={l.porResponsavel} byTipo={l.porTipo} concentration={l.concentracao} ownerName={ownerName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComBarra({ barra, children }: { barra: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      {barra}
      {children}
    </div>
  );
}

interface ResumoDoPeriodoProps {
  period: ResolvedPeriod;
  /** Nulo enquanto carrega: ainda não se sabe se o período anterior tem registro. */
  comBase: boolean | null;
}

/** "25/10 – 23/11/2026 · vs 25/09 – 24/10/2026", ao lado do seletor de período; o detalhe no title. */
function ResumoDoPeriodo(props: ResumoDoPeriodoProps) {
  const { period, comBase } = props;
  const anterior = formatRangeCompact(period.previous);
  const detalhe = comBase === false
    ? `Período anterior (${anterior}) sem registros: variações ocultas até haver base de comparação.`
    : `Comparando com ${anterior} (${period.comparisonLabel.replace(/^vs /, '')}).`;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground" title={detalhe}>
      <span className="font-mono text-foreground">{formatRangeCompact(period.elapsed)}</span>
      {comBase !== null && <span>{comBase ? `vs ${anterior}` : 'sem base de comparação'}</span>}
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
