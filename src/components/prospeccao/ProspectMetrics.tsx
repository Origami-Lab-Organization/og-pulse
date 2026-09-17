import { useMemo, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProspectMetricsActivities } from '@/hooks/useProspectActivities';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import {
  calculateAccountCoverage,
  calculateProspectingFunnel,
  formatRate,
  funnelByCut,
  type AccountCoverage,
  type FunnelStep,
  type ProspectCut,
} from '@/lib/prospecting/metrics';
import { cn } from '@/lib/utils';
import { getLeverLabel, toISODate, type ProspectWithCompany } from '@/types/prospect';

const PERIODOS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

const CORTES: Array<{ value: ProspectCut; label: string }> = [
  { value: 'lever', label: 'Alavanca' },
  { value: 'ring', label: 'Anel' },
  { value: 'tier', label: 'Tier' },
  { value: 'owner', label: 'Responsável' },
];

interface ProspectMetricsProps {
  prospects: ProspectWithCompany[];
}

/**
 * O funil de prospecção fria — só a parte de prospecção, de contas abertas até
 * oportunidade qualificada.
 *
 * Contrato fechado e valor de pipeline não entram: são do comercial, e trazer receita
 * para cá desfaria a separação entre os dois pipelines.
 */
export function ProspectMetrics({ prospects }: ProspectMetricsProps) {
  const [dias, setDias] = useState('30');
  const [corte, setCorte] = useState<ProspectCut>('lever');

  const desde = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(dias));
    return toISODate(d);
  }, [dias]);

  const { data: atividades = [], isLoading } = useProspectMetricsActivities(desde);
  const { byId } = useEmployeeDirectoryMap();

  const funil = useMemo(
    () => calculateProspectingFunnel(prospects, atividades),
    [prospects, atividades],
  );
  const cobertura = useMemo(
    () => calculateAccountCoverage(prospects, atividades),
    [prospects, atividades],
  );
  const grupos = useMemo(
    () => funnelByCut(prospects, atividades, corte),
    [prospects, atividades, corte],
  );

  if (isLoading) {
    return <Skeleton className="h-96 w-full" aria-label="Carregando o funil" />;
  }

  const nomeDoGrupo = (chave: string) => {
    if (corte === 'owner') return byId.get(chave)?.nome ?? 'Sem responsável';
    if (corte === 'lever') return getLeverLabel(chave) ?? chave;
    return chave;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={dias} onValueChange={setDias}>
          <SelectTrigger className="w-44" aria-label="Período"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <CoberturaDeContas cobertura={cobertura} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">O funil de prospecção fria</CardTitle>
          <p className="text-sm text-muted-foreground">
            De contas abertas até oportunidade qualificada. Fechamento e valor são do Pipeline.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <Funil steps={funil.steps} rates={funil.rates} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">Por recorte</CardTitle>
          <Select value={corte} onValueChange={(v) => setCorte(v as ProspectCut)}>
            <SelectTrigger className="w-40" aria-label="Recorte"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CORTES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{CORTES.find((c) => c.value === corte)?.label}</TableHead>
                <TableHead className="text-right">Contatos</TableHead>
                <TableHead className="text-right">Conversas</TableHead>
                <TableHead className="text-right">Agendadas</TableHead>
                <TableHead className="text-right">Feitas</TableHead>
                <TableHead className="text-right">Qualificadas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma atividade no período.
                  </TableCell>
                </TableRow>
              )}
              {grupos.map((linha) => (
                <TableRow key={linha.key}>
                  <TableCell>{nomeDoGrupo(linha.key)}</TableCell>
                  <TableCell className="text-right">{linha.contatos}</TableCell>
                  <TableCell className="text-right">{linha.conversas}</TableCell>
                  <TableCell className="text-right">{linha.agendadas}</TableCell>
                  <TableCell className="text-right">{linha.feitas}</TableCell>
                  <TableCell className="text-right font-medium">{linha.qualificadas}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Contas e contatos contam quem teve atividade no período. As três últimas etapas leem a
        etapa ATUAL do contato — o módulo não guarda histórico de mudança de etapa, então um
        contato que avançou antes do período conta aqui se foi tocado dentro dele. O funil é
        acumulado: quem está em Qualificada também conta em Agendadas e Feitas.
      </p>
    </div>
  );
}

/**
 * Cobertura de contas — fica fora do funil porque responde outra pergunta: não "como
 * converte", e sim "a lista está sendo consumida". Uma lista parada produz um funil de
 * aparência saudável com volume minúsculo, e só este número denuncia isso.
 */
function CoberturaDeContas({ cobertura }: { cobertura: AccountCoverage }) {
  const percentual = cobertura.taxa === null ? 0 : Math.round(cobertura.taxa * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Cobertura de contas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Quanto da lista a abordar virou conta aberta no período.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-3xl font-semibold leading-none">{formatRate(cobertura.taxa)}</p>
          <p className="text-sm text-muted-foreground">
            {cobertura.abertas} de {cobertura.naLista}{' '}
            {cobertura.naLista === 1 ? 'conta' : 'contas'} da lista
          </p>
        </div>

        <Progress
          value={percentual}
          aria-label={`Cobertura de contas: ${formatRate(cobertura.taxa)}`}
        />

        {cobertura.nuncaAbordadas > 0 && (
          <p className="text-sm">
            <strong>{cobertura.nuncaAbordadas}</strong>{' '}
            <span className="text-muted-foreground">
              {cobertura.nuncaAbordadas === 1
                ? 'conta nunca foi abordada'
                : 'contas nunca foram abordadas'}{' '}
              — nenhum contato delas tem atividade registrada, em nenhum período.
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * O funil desenhado: cada etapa mais estreita que a anterior, e entre elas a taxa de
 * conversão. A largura decrescente é o que faz a perda ser vista antes de ser lida.
 */
function Funil({
  steps,
  rates,
}: {
  steps: FunnelStep[];
  rates: Array<{ value: string; label: string }>;
}) {
  return (
    <ol className="space-y-0">
      {steps.map((step, indice) => (
        <li key={step.key}>
          <div className="flex items-center gap-4">
            <div className="flex flex-1 justify-center">
              <div
                title={step.question}
                style={{ width: `${100 - indice * 8}%` }}
                className={cn(
                  'rounded-lg border px-4 py-3 text-center',
                  indice === steps.length - 1
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'bg-card',
                )}
              >
                <p className="text-2xl font-semibold leading-none">{step.value}</p>
                <p
                  className={cn(
                    'mt-1 text-xs',
                    indice === steps.length - 1
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>
              </div>
            </div>
            <div className="hidden w-44 shrink-0 sm:block" aria-hidden="true" />
          </div>

          {indice < rates.length && (
            <div className="flex items-center gap-4">
              <div className="flex flex-1 items-center justify-center gap-2 py-2">
                <ArrowDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-xs sm:hidden">
                  <strong className="text-primary">{rates[indice].value}</strong>{' '}
                  <span className="text-muted-foreground">{rates[indice].label}</span>
                </span>
              </div>
              <p className="hidden w-44 shrink-0 text-sm sm:block">
                <strong className="text-primary">{rates[indice].value}</strong>{' '}
                <span className="text-muted-foreground">{rates[indice].label}</span>
              </p>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
