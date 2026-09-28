import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatRate, type AccountCoverage } from '@/lib/prospecting/metrics';
import type { ListHealthData, PeriodLosses } from '@/types/prospectMetrics';

interface ListHealthSectionProps {
  health: ListHealthData;
  losses: PeriodLosses;
  onOpenOverdue: () => void;
}

/** O que está parado e o que se perdeu — a parte da tela que pede ação hoje. */
export function ListHealthSection(props: ListHealthSectionProps) {
  const { health, losses, onOpenOverdue } = props;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-base">Saúde da lista</CardTitle>
          <p className="text-sm text-muted-foreground">Quanto da lista virou trabalho no período, e as tarefas vencidas hoje.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Cobertura coverage={health.coverage} />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <p className="text-sm">
              <strong className="tabular-nums">{health.overdue.length}</strong>{' '}
              <span className="text-muted-foreground">
                {health.overdue.length === 1 ? 'contato com tarefa vencida' : 'contatos com tarefa vencida'}
              </span>
            </p>
            {health.overdue.length > 0 && (
              <Button variant="outline" size="sm" onClick={onOpenOverdue}>Ver contatos</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Perdas losses={losses} />
    </div>
  );
}

/**
 * Cobertura de contas — fica fora do funil porque responde outra pergunta: não "como
 * converte", e sim "a lista está sendo consumida". Uma lista parada produz um funil de
 * aparência saudável com volume minúsculo, e só este número denuncia isso.
 */
function Cobertura({ coverage }: { coverage: AccountCoverage }) {
  const percentual = coverage.taxa === null ? 0 : Math.round(coverage.taxa * 100);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-3xl font-semibold leading-none">{formatRate(coverage.taxa)}</p>
        <p className="text-sm text-muted-foreground">
          {coverage.abertas} de {coverage.naLista} {coverage.naLista === 1 ? 'conta' : 'contas'} da lista trabalhadas no período
        </p>
      </div>
      <Progress value={percentual} aria-label={`Cobertura de contas: ${formatRate(coverage.taxa)}`} />
      {coverage.nuncaAbordadas > 0 && (
        <p className="text-sm">
          <strong>{coverage.nuncaAbordadas}</strong>{' '}
          <span className="text-muted-foreground">
            {coverage.nuncaAbordadas === 1 ? 'conta nunca foi abordada.' : 'contas nunca foram abordadas.'}
          </span>
        </p>
      )}
    </div>
  );
}

interface Barra {
  key: string;
  label: string;
  count: number;
}

/** Barras simples: o comprimento compara, o número ao lado confirma. */
function Barras({ itens, rotulo }: { itens: Barra[]; rotulo: string }) {
  const maior = Math.max(1, ...itens.map((i) => i.count));
  return (
    <ul className="space-y-2" aria-label={rotulo}>
      {itens.map((i) => (
        <li key={i.key} className="grid grid-cols-[minmax(0,15rem)_1fr_2rem] items-center gap-2 text-sm">
          <span className="truncate" title={i.label}>{i.label}</span>
          <span className="h-2 rounded-full bg-muted" aria-hidden="true">
            <span className="block h-2 rounded-full bg-primary" style={{ width: `${(i.count / maior) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums">{i.count}</span>
        </li>
      ))}
    </ul>
  );
}

/** Por que perdemos, e em que etapa — a proposta recusada e o contato que sumiu pedem ações diferentes. */
function Perdas({ losses }: { losses: PeriodLosses }) {
  return (
    <Card>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base">Perdas no período</CardTitle>
        <p className="text-sm text-muted-foreground">
          {losses.total === 0
            ? 'Nenhuma perda no período.'
            : `${losses.total} ${losses.total === 1 ? 'contato perdido' : 'contatos perdidos'}: por que e em que etapa.`}
        </p>
      </CardHeader>
      {losses.total > 0 && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="ui-label">Motivo</h4>
            <Barras rotulo="Perdas por motivo" itens={losses.byReason.map((r) => ({ key: r.reason, label: r.label, count: r.count }))} />
          </div>
          <div className="space-y-2">
            <h4 className="ui-label">Onde perdemos</h4>
            <Barras rotulo="Perdas por etapa" itens={losses.byStage.map((e) => ({ key: e.stage ?? '', label: e.label, count: e.count }))} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
