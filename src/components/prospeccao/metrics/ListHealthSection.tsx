import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatRate, type AccountCoverage } from '@/lib/prospecting/metrics';
import type { ListHealthData, PeriodExits } from '@/types/prospectMetrics';

interface ListHealthSectionProps {
  health: ListHealthData;
  exits: PeriodExits;
  onOpenOverdue: () => void;
}

/** O que está parado e o que se perdeu — a parte da tela que pede ação hoje. */
export function ListHealthSection(props: ListHealthSectionProps) {
  const { health, exits, onOpenOverdue } = props;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-base">Saúde da lista</CardTitle>
          <p className="text-sm text-muted-foreground">Quanto da lista virou trabalho no período, e o que está vencido hoje.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Cobertura coverage={health.coverage} />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <p className="text-sm">
              <strong className="tabular-nums">{health.overdue.length}</strong>{' '}
              <span className="text-muted-foreground">
                {health.overdue.length === 1 ? 'contato com atividade vencida hoje' : 'contatos com atividade vencida hoje'}
              </span>
            </p>
            {health.overdue.length > 0 && (
              <Button variant="outline" size="sm" onClick={onOpenOverdue}>Ver contatos</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Saidas exits={exits} />
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

/** Motivo de descarte em barras simples: o comprimento compara, o número ao lado confirma. */
function Saidas({ exits }: { exits: PeriodExits }) {
  const maior = Math.max(1, ...exits.discards.map((d) => d.count));
  return (
    <Card>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base">Saídas do quadro no período</CardTitle>
        <p className="text-sm text-muted-foreground">Por que os contatos deixaram de ser trabalhados.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border px-3 py-2">
            <dt className="ui-label">Sem resposta</dt>
            <dd className="font-mono text-2xl font-semibold tabular-nums">{exits.semResposta}</dd>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <dt className="ui-label">Descartados</dt>
            <dd className="font-mono text-2xl font-semibold tabular-nums">{exits.discardTotal}</dd>
          </div>
        </dl>
        {exits.discards.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum descarte no período.</p>
        ) : (
          <ul className="space-y-2" aria-label="Descartes por motivo">
            {exits.discards.map((d) => (
              <li key={d.reason} className="grid grid-cols-[minmax(0,10rem)_1fr_2rem] items-center gap-2 text-sm">
                <span className="truncate" title={d.label}>{d.label}</span>
                <span className="h-2 rounded-full bg-muted" aria-hidden="true">
                  <span className="block h-2 rounded-full bg-primary" style={{ width: `${(d.count / maior) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
