import { useState } from 'react';
import { SEM_RECORTE, formatRate } from '@/lib/prospecting/metrics';
import { MIN_SAMPLE } from '@/lib/prospecting/periodMetrics';
import { cn } from '@/lib/utils';
import { getLeverLabel } from '@/types/prospect';
import type { CutSafraRow, LeverConcentration } from '@/types/prospectMetrics';
import { plural } from './format';
import { Painel, Segmentado } from './parts';

type CorteDeCanal = 'lever' | 'owner';

interface CorteMeta {
  label: string;
  titulo: string;
  semValor: string;
  nome: (key: string, ownerName: (id: string) => string) => string;
}

const CORTE_META: Record<CorteDeCanal, CorteMeta> = {
  lever: { label: 'Alavanca', titulo: 'Por alavanca', semValor: 'Sem alavanca', nome: (key) => getLeverLabel(key) ?? key },
  owner: { label: 'Responsável', titulo: 'Por responsável', semValor: 'Sem responsável', nome: (key, dono) => dono(key) },
};

const CORTES: ReadonlyArray<{ value: CorteDeCanal; label: string }> = (Object.keys(CORTE_META) as CorteDeCanal[]).map(
  (value) => ({ value, label: CORTE_META[value].label }),
);

type Contagem = Exclude<keyof CutSafraRow, 'key' | 'ativados'>;

const COLUNAS: ReadonlyArray<{ key: Contagem; label: string }> = [
  { key: 'conversas', label: 'Conversas' },
  { key: 'agendadas', label: 'Agendadas' },
  { key: 'feitas', label: 'Feitas' },
  { key: 'qualificadas', label: 'Qualif.' },
  { key: 'ganhos', label: 'Ganhos' },
  { key: 'perdas', label: 'Perdas' },
];

interface ChannelsTabProps {
  byLever: CutSafraRow[];
  byOwner: CutSafraRow[];
  concentration: LeverConcentration | null;
  ownerName: (id: string) => string;
}

/** "De onde vem o resultado?": os ativados do período por alavanca ou por responsável. */
export function ChannelsTab(props: ChannelsTabProps) {
  const { byLever, byOwner, concentration, ownerName } = props;
  const [corte, setCorte] = useState<CorteDeCanal>('lever');
  const meta = CORTE_META[corte];
  const linhas: Record<CorteDeCanal, CutSafraRow[]> = { lever: byLever, owner: byOwner };
  const nomeDo = (key: string) => (key === SEM_RECORTE ? meta.semValor : meta.nome(key, ownerName));

  return (
    <div className="flex flex-col gap-5">
      {concentration && <AvisoDeConcentracao concentration={concentration} />}
      <Painel
        title={meta.titulo}
        description={`Marcos alcançados pelos ativados do período. Taxas em cinza têm menos de ${MIN_SAMPLE} contatos na base.`}
        actions={<Segmentado value={corte} onChange={(v) => setCorte(v)} options={CORTES} label="Recorte" />}
        className="gap-3.5"
      >
        {linhas[corte].length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum contato ativado no período com esses filtros.</p>
        ) : (
          <Tabela linhas={linhas[corte]} titulo={meta.label} nomeDo={nomeDo} />
        )}
      </Painel>
    </div>
  );
}

function AvisoDeConcentracao({ concentration: c }: { concentration: LeverConcentration }) {
  const fecho = c.smallSample
    ? ' Amostras pequenas, mas a diferença é grande o bastante para rever a divisão de esforço.'
    : ' A diferença é grande o bastante para rever a divisão de esforço.';
  return (
    <div role="note" className="flex flex-col gap-1 rounded-xl bg-warning-subtle px-4 py-3.5 text-warning-emphasis">
      <span className="text-sm font-medium">
        {c.label} concentra {formatRate(c.share)} dos ativados, mas só {formatRate(c.rate)} respondem.
      </span>
      <span className="text-sm text-pretty">
        As demais alavancas somam {plural(c.demais.ativados, 'ativado', 'ativados')} com {formatRate(c.demais.rate)} de resposta e{' '}
        {plural(c.demais.feitas, 'reunião feita', 'reuniões feitas')}.{fecho}
      </span>
    </div>
  );
}

function somaDas(linhas: CutSafraRow[]): CutSafraRow {
  const total: CutSafraRow = { key: 'total', ativados: 0, conversas: 0, agendadas: 0, feitas: 0, qualificadas: 0, ganhos: 0, perdas: 0 };
  for (const l of linhas) {
    total.ativados += l.ativados;
    for (const c of COLUNAS) total[c.key] += l[c.key];
  }
  return total;
}

/** Resposta bem abaixo da média do período — menos da metade — pede atenção; sem base, só cinza. */
function corDaResposta(linha: CutSafraRow, taxaGeral: number): string {
  if (linha.ativados < MIN_SAMPLE) return 'text-muted-foreground';
  return linha.conversas / linha.ativados < taxaGeral / 2 ? 'text-warning-emphasis' : 'text-foreground';
}

interface TabelaProps {
  linhas: CutSafraRow[];
  titulo: string;
  nomeDo: (key: string) => string;
}

function Tabela(props: TabelaProps) {
  const { linhas, titulo, nomeDo } = props;
  const total = somaDas(linhas);
  const taxaGeral = total.ativados ? total.conversas / total.ativados : 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="text-right text-xs text-muted-foreground">
            <th scope="col" className="border-b py-2 pr-2 text-left font-medium">{titulo}</th>
            <th scope="col" className="w-[22%] border-b p-2 text-left font-medium">Ativados</th>
            <th scope="col" className="border-b p-2 font-medium">Taxa de resposta</th>
            {COLUNAS.map((c) => (
              <th key={c.key} scope="col" className="border-b p-2 font-medium last:pr-0">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.key} className="border-b">
              <th scope="row" className={cn('py-3 pr-2 text-left font-normal', l.key === SEM_RECORTE && 'text-muted-foreground')}>
                {nomeDo(l.key)}
              </th>
              <td className="p-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div className="h-full bg-primary" style={{ width: `${(l.ativados / total.ativados) * 100}%` }} />
                  </div>
                  <span className="min-w-6 text-right font-mono tabular-nums">{l.ativados}</span>
                </div>
              </td>
              <td className={cn('p-2 text-right font-mono tabular-nums', corDaResposta(l, taxaGeral))}>
                {formatRate(l.conversas / l.ativados)}
              </td>
              {COLUNAS.map((c) => (
                <td key={c.key} className={cn('p-2 text-right font-mono tabular-nums last:pr-0', l[c.key] === 0 && 'text-muted-foreground')}>
                  {l[c.key]}
                </td>
              ))}
            </tr>
          ))}
          <tr className="font-semibold">
            <th scope="row" className="py-3 pr-2 text-left">Total</th>
            <td className="p-2 text-right font-mono tabular-nums">{total.ativados}</td>
            <td className="p-2 text-right font-mono tabular-nums">{formatRate(total.ativados ? taxaGeral : null)}</td>
            {COLUNAS.map((c) => (
              <td key={c.key} className="p-2 text-right font-mono tabular-nums last:pr-0">{total[c.key]}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
