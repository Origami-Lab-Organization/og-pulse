import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CutFlowTable } from '@/components/prospeccao/metrics/CutFlowTable';
import { CycleTimesCard } from '@/components/prospeccao/metrics/CycleTimesCard';
import { EvolutionGrid } from '@/components/prospeccao/metrics/EvolutionGrid';
import { ListHealthSection } from '@/components/prospeccao/metrics/ListHealthSection';
import { MetricDrillDialog } from '@/components/prospeccao/metrics/MetricDrillDialog';
import { MetricsFilterBar } from '@/components/prospeccao/metrics/MetricsFilterBar';
import { PeriodKpis } from '@/components/prospeccao/metrics/PeriodKpis';
import { ProspectFunnel } from '@/components/prospeccao/metrics/ProspectFunnel';
import { SafraRatesGrid } from '@/components/prospeccao/metrics/SafraRatesGrid';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { useProspectMetricsData } from '@/hooks/useProspectMetricsData';
import type { ProspectCut } from '@/lib/prospecting/metrics';
import { buildMilestones } from '@/lib/prospecting/milestones';
import {
  MIN_SAMPLE,
  buildDataset,
  cutFlow,
  cycleTimes,
  listHealth,
  metricSeries,
  metricValues,
  occurrencesInRange,
  periodExits,
  safraFunnel,
  safraSeries,
} from '@/lib/prospecting/periodMetrics';
import { DEFAULT_PERIOD, formatDay, formatRange, resolvePeriod, trendBuckets } from '@/lib/prospecting/periods';
import { getLeverLabel, type ProspectWithCompany } from '@/types/prospect';
import type {
  Bucket,
  Grain,
  MetricDefinition,
  MetricFilter,
  MetricsDataset,
  Occurrence,
  PeriodSelection,
  ResolvedPeriod,
} from '@/types/prospectMetrics';

interface ProspectMetricsProps {
  prospects: ProspectWithCompany[];
  onOpenProspect: (prospect: ProspectWithCompany) => void;
}

interface Detalhe {
  title: string;
  description: string;
  items: Occurrence[];
}

/**
 * Métricas da Prospecção por período (28/09/2026) — só a parte de prospecção, de contas
 * abertas até oportunidade qualificada. Contrato fechado e valor são do Pipeline.
 *
 * A tela responde três perguntas, em ordem: estou fazendo volume (os números do período e a
 * evolução), o volume vira resultado (o quadro e a conversão da safra), e onde está travando
 * (tempo de ciclo, saúde da lista e recorte). As regras moram em `src/lib/prospecting/`.
 */
export function ProspectMetrics(props: ProspectMetricsProps) {
  const { prospects, onOpenProspect } = props;
  const [selecao, setSelecao] = useState<PeriodSelection>(DEFAULT_PERIOD);
  const [filtro, setFiltro] = useState<MetricFilter>({});
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);

  const periodo = useMemo(() => resolvePeriod(selecao), [selecao]);
  const buckets = useMemo(() => trendBuckets(periodo, selecao.grain), [periodo, selecao.grain]);
  const desde = [buckets[0].from, periodo.previous.from].sort()[0];
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
  const dataset = useMemo(() => buildDataset(fonte, marcos, filtro), [fonte, marcos, filtro]);
  const responsaveis = useMemo(() => responsaveisDe(prospects, byId), [prospects, byId]);
  const nomeDoResponsavel = (id: string) => byId.get(id)?.nome ?? 'Sem responsável';

  if (dados.isLoading) return <Skeleton className="h-96 w-full" aria-label="Carregando as métricas" />;
  if (dados.isError) return <ErroAoCarregar onRetry={dados.refetch} />;
  if (prospects.length === 0) return <SemContatos />;

  const verColuna = (bucket: Bucket) =>
    setSelecao({ preset: 'personalizado', grain: selecao.grain, custom: { from: bucket.from, to: bucket.to } });

  return (
    <div className="space-y-6">
      <MetricsFilterBar
        selection={selecao}
        onSelectionChange={setSelecao}
        period={periodo}
        filter={filtro}
        onFilterChange={setFiltro}
        owners={responsaveis}
      />

      <Painel
        dataset={dataset}
        period={periodo}
        buckets={buckets}
        grain={selecao.grain}
        onSelectBucket={verColuna}
        onOpenDetail={setDetalhe}
        ownerName={nomeDoResponsavel}
      />

      <MetricDrillDialog
        open={!!detalhe}
        onOpenChange={(aberto) => !aberto && setDetalhe(null)}
        title={detalhe?.title ?? ''}
        description={detalhe?.description ?? ''}
        items={detalhe?.items ?? []}
        onOpenProspect={onOpenProspect}
      />
    </div>
  );
}

/** Só quem tem contato na Prospecção: o diretório inteiro encheria o filtro de gente que não prospecta. */
function responsaveisDe(prospects: ProspectWithCompany[], byId: Map<string, { nome: string }>) {
  const ids = [...new Set(prospects.map((p) => p.owner_id).filter((id): id is string => !!id))];
  return ids
    .map((id) => ({ id, nome: byId.get(id)?.nome ?? 'Sem nome' }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

interface PainelProps {
  dataset: MetricsDataset;
  period: ResolvedPeriod;
  buckets: Bucket[];
  grain: Grain;
  onSelectBucket: (bucket: Bucket) => void;
  onOpenDetail: (detalhe: Detalhe) => void;
  ownerName: (id: string) => string;
}

function Painel(props: PainelProps) {
  const { dataset, period, buckets, grain, onSelectBucket, onOpenDetail, ownerName } = props;
  const [corte, setCorte] = useState<ProspectCut>('lever');

  const valores = useMemo(() => metricValues(dataset, period), [dataset, period]);
  const serie = useMemo(() => metricSeries(dataset, buckets, grain), [dataset, buckets, grain]);
  const funil = useMemo(() => safraFunnel(dataset, period), [dataset, period]);
  const safras = useMemo(() => safraSeries(dataset, trendBuckets(period, 'mes')), [dataset, period]);
  const ciclos = useMemo(() => cycleTimes(dataset, period), [dataset, period]);
  const saidas = useMemo(() => periodExits(dataset, period), [dataset, period]);
  const saude = useMemo(() => listHealth(dataset, period), [dataset, period]);
  const linhasDoCorte = useMemo(() => cutFlow(dataset, period, corte), [dataset, period, corte]);

  const abrirMetrica = (def: MetricDefinition) =>
    onOpenDetail({
      title: def.label,
      description: `${formatRange(period.elapsed)} · ${def.question}`,
      items: occurrencesInRange(def, dataset, period.elapsed),
    });
  const abrirVencidos = () =>
    onOpenDetail({
      title: 'Atividade vencida',
      description: 'Contatos do quadro com a próxima atividade antes de hoje, os mais atrasados primeiro.',
      items: saude.overdue.map((p) => ({ date: p.next_activity_on ?? '', prospect: p })),
    });
  const nomeDoGrupo = (chave: string) => NOMES_DO_CORTE[corte](chave, ownerName);

  return (
    <>
      <PeriodKpis
        values={valores}
        comparisonLabel={period.comparisonLabel}
        historyStart={dataset.historyStart}
        onOpen={abrirMetrica}
      />

      <EvolutionGrid series={serie} grain={grain} historyStart={dataset.historyStart} onSelectBucket={onSelectBucket} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-base">Para onde foram os ativados no período</CardTitle>
            <p className="text-sm text-muted-foreground">
              Contatos com 1º toque em {formatRange(period.elapsed)} e até onde chegaram até hoje. As taxas dividem por
              contato; com menos de {MIN_SAMPLE} na base, aparecem como —.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <ProspectFunnel steps={funil.steps} rates={funil.rates} />
          </CardContent>
        </Card>
        <SafraRatesGrid points={safras} />
      </div>

      <CycleTimesCard cycles={ciclos} />

      <ListHealthSection health={saude} exits={saidas} onOpenOverdue={abrirVencidos} />

      <CutFlowTable rows={linhasDoCorte} cut={corte} onCutChange={setCorte} groupName={nomeDoGrupo} />

      <p className="text-xs text-muted-foreground">
        Cada número conta um marco: a primeira vez que o contato chega à etapa ou a uma adiante — quem pula de
        Respondeu para Reunião feita conta também em Agendada. Conversa é a 1ª atividade com resposta; contas abertas
        e contatos ativados, o 1º toque.
        {dataset.historyStart &&
          ` Reuniões e qualificações têm data desde ${formatDay(dataset.historyStart)}; quem já estava nessas etapas antes conta na conversão da safra, mas em período nenhum.`}
      </p>
    </>
  );
}

const NOMES_DO_CORTE: Record<ProspectCut, (chave: string, responsavel: (id: string) => string) => string> = {
  owner: (chave, responsavel) => responsavel(chave),
  lever: (chave) => getLeverLabel(chave) ?? chave,
  ring: (chave) => chave,
  tier: (chave) => chave,
};

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
