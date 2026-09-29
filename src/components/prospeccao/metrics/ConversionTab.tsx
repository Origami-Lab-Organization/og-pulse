import { formatRate } from '@/lib/prospecting/metrics';
import { MIN_SAMPLE } from '@/lib/prospecting/periodMetrics';
import { cn } from '@/lib/utils';
import type { CycleTime, PeriodLosses, SafraPoint, SafraRateKey, StageRate } from '@/types/prospectMetrics';
import { corDaTaxa, formatNumber, plural } from './format';
import { Painel } from './parts';

interface ConversionTabProps {
  rates: StageRate[];
  bottleneck: SafraRateKey | null;
  cycles: CycleTime[];
  /** Uma por mês de ativação, dos 12 meses até o período. */
  safras: SafraPoint[];
  losses: PeriodLosses;
}

/** "O volume vira resultado?": cada passagem, quanto tempo ela leva, as safras e o que se perdeu. */
export function ConversionTab(props: ConversionTabProps) {
  const { rates, bottleneck, cycles, safras, losses } = props;
  return (
    <div className="flex flex-col gap-5">
      <TaxasPorEtapa rates={rates} bottleneck={bottleneck} />
      <TempoDeCiclo cycles={cycles} />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Safras safras={safras} />
        <Perdas losses={losses} />
      </div>
    </div>
  );
}

function TaxasPorEtapa({ rates, bottleneck }: { rates: StageRate[]; bottleneck: SafraRateKey | null }) {
  return (
    <Painel
      title="Taxas por etapa"
      description={`Dos ativados no período, até hoje. Cada taxa divide contatos, nunca contas. Com menos de ${MIN_SAMPLE} na base, a taxa fica marcada como amostra pequena.`}
      className="gap-2"
    >
      <ul className="flex flex-col">
        {rates.map((r) => (
          <li
            key={r.key}
            className="grid grid-cols-[minmax(0,1fr)_3.5rem_6.5rem] items-center gap-3 border-t py-2.5 sm:grid-cols-[minmax(150px,200px)_minmax(0,1fr)_64px_120px] sm:gap-4"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{r.label}</span>
              <span className="text-[11px] text-muted-foreground">{r.formula}</span>
            </div>
            <div className="hidden h-2 overflow-hidden rounded bg-muted sm:block" aria-hidden="true">
              <div
                className={cn('h-full', r.small ? 'bg-muted-foreground/40' : 'bg-primary')}
                style={{ width: r.rate ? `${r.rate * 100}%` : '0%' }}
              />
            </div>
            <span className={cn('text-right font-mono text-base font-medium tabular-nums', corDaTaxa(r, r.key === bottleneck))}>
              {formatRate(r.rate)}
              {r.key === bottleneck && <span className="sr-only"> (gargalo)</span>}
            </span>
            <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">{fracaoDa(r)}</span>
          </li>
        ))}
      </ul>
    </Painel>
  );
}

const fracaoDa = (r: StageRate) => (r.base ? `${r.parte} de ${r.base}${r.small ? ' · amostra pequena' : ''}` : 'sem base');

const UNIDADE_NO_SINGULAR: Record<CycleTime['unit'], string> = { dias: 'dia', toques: 'toque' };

function valorDoCiclo(c: CycleTime): string {
  if (c.median === null) return '—';
  return `${formatNumber(c.median)} ${c.median === 1 ? UNIDADE_NO_SINGULAR[c.unit] : c.unit}`;
}

function subDoCiclo(c: CycleTime): string {
  if (c.sample === 0) return `sem casos (0 de ${MIN_SAMPLE})`;
  if (c.median === null) return `amostra pequena (${c.sample} de ${MIN_SAMPLE})`;
  return plural(c.sample, 'contato', 'contatos');
}

function TempoDeCiclo({ cycles }: { cycles: CycleTime[] }) {
  return (
    <Painel
      title="Tempo de ciclo"
      description="Mediana de quem passou por cada etapa no período — um contato que demorou 60 dias não puxa o número do time."
    >
      <div className="flex flex-wrap gap-px overflow-hidden rounded-lg border bg-border">
        {cycles.map((c) => (
          <div
            key={c.key}
            className={cn('flex flex-[1_1_160px] flex-col gap-1.5 px-4 py-3.5', c.median === null ? 'bg-muted/40' : 'bg-card')}
          >
            <span className="text-xs text-muted-foreground">{c.label}</span>
            <span className={cn('font-mono text-[22px] font-medium tabular-nums', c.median === null && 'text-muted-foreground')}>
              {valorDoCiclo(c)}
            </span>
            <span className="text-[11px] text-muted-foreground">{subDoCiclo(c)}</span>
          </div>
        ))}
      </div>
    </Painel>
  );
}

const COLUNAS_DA_SAFRA: ReadonlyArray<{ key: SafraRateKey; label: string; title: string }> = [
  { key: 'resposta', label: 'Resposta', title: 'Taxa de resposta' },
  { key: 'agendamento', label: 'Agend.', title: 'Taxa de agendamento' },
  { key: 'comparecimento', label: 'Compar.', title: 'Taxa de comparecimento' },
  { key: 'qualificacao', label: 'Qualif.', title: 'Taxa de qualificação' },
  { key: 'fechamento', label: 'Fech.', title: 'Taxa de fechamento' },
];

function notaDasSafras(comAtivacao: SafraPoint[]): string {
  if (comAtivacao.length === 0) return 'Nenhuma ativação nos 12 meses até o período escolhido.';
  if (comAtivacao.length === 1) {
    return `Só a safra de ${comAtivacao[0].bucket.label} tem ativações — a comparação entre safras começa com a próxima.`;
  }
  return `Com menos de ${MIN_SAMPLE} contatos na base, a taxa da safra fica como —.`;
}

/** Safra mensal: o grupo ativado em cada mês e até onde chegou. Meses sem ativação ficam de fora. */
function Safras({ safras }: { safras: SafraPoint[] }) {
  const comAtivacao = safras.filter((s) => s.ativados > 0);
  return (
    <Painel
      title="Safras por mês de ativação"
      description="Contatos agrupados pelo mês do 1º toque. Safras recentes ainda estão amadurecendo."
      className="gap-3.5"
    >
      {comAtivacao.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] border-collapse text-sm">
            <thead>
              <tr className="text-right text-xs text-muted-foreground">
                <th scope="col" className="border-b py-2 pr-2 text-left font-medium">Safra</th>
                <th scope="col" className="border-b p-2 font-medium">Ativados</th>
                {COLUNAS_DA_SAFRA.map((c) => (
                  <th key={c.key} scope="col" title={c.title} className="border-b p-2 font-medium last:pr-0">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-right font-mono tabular-nums">
              {comAtivacao.map((s) => (
                <tr key={s.bucket.key} className="border-b last:border-b-0">
                  <th scope="row" className="py-2.5 pr-2 text-left font-sans font-normal">
                    {s.bucket.label}
                    {s.maturing && <span className="ml-1.5 text-[11px] text-muted-foreground">amadurecendo</span>}
                  </th>
                  <td className="p-2">{s.ativados}</td>
                  {COLUNAS_DA_SAFRA.map((c) => (
                    <td key={c.key} className={cn('p-2 last:pr-0', s[c.key] === null && 'text-muted-foreground')}>
                      {formatRate(s[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{notaDasSafras(comAtivacao)}</p>
    </Painel>
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
    <ul className="flex flex-col gap-2" aria-label={rotulo}>
      {itens.map((i) => (
        <li key={i.key} className="grid grid-cols-[minmax(0,12rem)_1fr_2rem] items-center gap-2 text-sm">
          <span className="truncate" title={i.label}>{i.label}</span>
          <span className="h-2 rounded-full bg-muted" aria-hidden="true">
            <span className="block h-2 rounded-full bg-primary" style={{ width: `${(i.count / maior) * 100}%` }} />
          </span>
          <span className="text-right font-mono tabular-nums">{i.count}</span>
        </li>
      ))}
    </ul>
  );
}

/** Por que perdemos, e em que etapa — a proposta recusada e o contato que sumiu pedem ações diferentes. */
function Perdas({ losses }: { losses: PeriodLosses }) {
  if (losses.total === 0) {
    return (
      <Painel
        title="Perdas e motivos"
        description="Nenhuma perda registrada no período. Quando houver, os motivos aparecem aqui, ordenados por frequência."
        className="gap-2"
      />
    );
  }
  return (
    <Painel
      title="Perdas e motivos"
      description={`${plural(losses.total, 'contato perdido', 'contatos perdidos')} no período: por que e em que etapa.`}
    >
      <div className="flex flex-col gap-2">
        <h3 className="ui-label">Motivo</h3>
        <Barras rotulo="Perdas por motivo" itens={losses.byReason.map((r) => ({ key: r.reason, label: r.label, count: r.count }))} />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="ui-label">Onde perdemos</h3>
        <Barras rotulo="Perdas por etapa" itens={losses.byStage.map((e) => ({ key: e.stage ?? '', label: e.label, count: e.count }))} />
      </div>
    </Painel>
  );
}
