import { Fragment, useState } from 'react';
import { AlertCircle, Briefcase, Building2, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtBRL0, fmtPct } from './financeUtils';
import type {
  CostByCostCenterData,
  CostCenterCostRow,
  CostCenterDetailRow,
  CostCenterPersonRow,
} from '@/types/costCenter';
import { CostOrigin } from '@/types/costCenter';

/**
 * Custo por centro de custo no período (PUL-215, ADR-0031), em três níveis: o centro, as
 * origens dentro dele (projeto de cliente ou atividade interna) e quem apontou cada uma.
 * Separa projeto de interno porque só o primeiro tem receita do outro lado.
 *
 * Os números de todos os níveis ficam nas MESMAS colunas da tabela, e o nome recua um degrau
 * por nível — é o que deixa o custo de um projeto comparável com o total do centro acima.
 * A fatia é sempre relativa ao nível de cima: do centro no total, do projeto no centro, da
 * pessoa no projeto.
 *
 * A linha "Sem centro de custo" existe de propósito: mostra o que ainda não foi classificado
 * em vez de somar tudo e dar um número redondo que esconde a lacuna.
 */

interface Props {
  data: CostByCostCenterData | undefined;
  isLoading: boolean;
}

/** Centro + Projeto + Interno: as colunas que só fazem sentido no nível do centro. */
const NAME_SPAN = 3;
const COLUMN_COUNT = 6;
const NO_CENTER_KEY = 'sem-centro';

const hoursFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const fmtHours = (hours: number) => `${hoursFormat.format(hours)} h`;

const numberCell = 'py-1 text-right font-mono text-xs tabular-nums';
const expandButton =
  'flex items-center gap-1.5 rounded-sm text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function LoadingCard() {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <Skeleton className="h-5 w-56" />
      <div className="mt-4 space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </section>
  );
}

/**
 * O que ficou sem centro, e o que fazer em cada caso.
 *
 * Os dois casos NÃO se consertam do mesmo jeito, e dizer "classifica os lançamentos
 * seguintes" para os dois seria mentira: a hora de atividade interna guarda o centro no
 * momento do lançamento (trigger da PUL-221), então o passado dela fica como está; a hora de
 * projeto deriva o centro do serviço em tempo de leitura, então vincular o serviço a um
 * centro reclassifica o histórico inteiro na hora. É a assimetria da pergunta aberta P4 do
 * ADR-0031, e a tela fala dela em vez de esconder.
 */
function CoverageNote(props: { data: CostByCostCenterData }) {
  const { unclassified: gap, totalCost } = props.data;
  if (gap.totalHours === 0) return null;
  const pctOf = (cost: number) => (totalCost > 0 ? fmtPct((cost / totalCost) * 100) : fmtPct(0));
  return (
    <div className="mt-3 flex items-start gap-2 rounded-md border bg-warning/5 p-2.5 text-[11px] text-muted-foreground">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
      <div>
        <p className="font-medium text-foreground">
          {fmtHours(gap.totalHours)} ({pctOf(gap.totalCost)} do custo) ainda sem centro de custo.
        </p>
        <ul className="mt-1 space-y-1">
          {gap.projectHours > 0 && (
            <li>
              <strong className="font-medium">{fmtHours(gap.projectHours)} em projeto de cliente</strong> (
              {pctOf(gap.projectCost)}): o projeto está sem serviço vinculado, ou o serviço está sem centro. Definir o
              centro no serviço reclassifica também o histórico, porque a hora de projeto deriva o centro do serviço na
              leitura.
            </li>
          )}
          {gap.internalHours > 0 && (
            <li>
              <strong className="font-medium">{fmtHours(gap.internalHours)} em atividade interna</strong> (
              {pctOf(gap.internalCost)}): a atividade está sem centro no cadastro. Definir o centro vale para os
              lançamentos seguintes. Estas horas continuam sem centro, porque cada hora guarda o centro do momento em
              que foi lançada.
            </li>
          )}
        </ul>
        <p className="mt-1">Abra a linha "Sem centro de custo" acima para ver quais projetos e atividades são.</p>
      </div>
    </div>
  );
}

/** Terceiro nível: quem apontou as horas daquela origem. */
function PersonRow(props: { person: CostCenterPersonRow }) {
  const { person } = props;
  return (
    <tr className="border-b border-border/40 bg-muted/50">
      <td colSpan={NAME_SPAN} className="py-1 pl-14 pr-2">
        <span className="text-xs text-muted-foreground">{person.name}</span>
      </td>
      <td className={`${numberCell} text-muted-foreground`}>{fmtHours(person.hours)}</td>
      <td className={`${numberCell} text-foreground`}>{fmtBRL0(person.cost)}</td>
      <td className={`${numberCell} text-muted-foreground`}>{fmtPct(person.sharePct)}</td>
    </tr>
  );
}

/** Segundo nível: um projeto de cliente ou uma atividade interna do centro. */
function DetailRow(props: { detail: CostCenterDetailRow; isOpen: boolean; onToggle: () => void }) {
  const { detail, isOpen, onToggle } = props;
  const isProject = detail.origin === CostOrigin.PROJECT;
  const OriginIcon = isProject ? Briefcase : Building2;
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  return (
    <tr className="border-b border-border/40 bg-muted/30">
      <td colSpan={NAME_SPAN} className="py-1 pl-7 pr-2">
        <button type="button" onClick={onToggle} aria-expanded={isOpen} className={expandButton}>
          <Chevron className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <OriginIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs text-foreground">{detail.name}</span>
          <span className="text-[11px] text-muted-foreground">{isProject ? 'projeto' : 'interno'}</span>
        </button>
      </td>
      <td className={`${numberCell} text-muted-foreground`}>{fmtHours(detail.hours)}</td>
      <td className={`${numberCell} font-semibold text-foreground`}>{fmtBRL0(detail.cost)}</td>
      <td className={`${numberCell} text-muted-foreground`}>{fmtPct(detail.sharePct)}</td>
    </tr>
  );
}

/** Primeiro nível: o centro de custo. */
function CenterRow(props: { row: CostCenterCostRow; isOpen: boolean; onToggle: () => void }) {
  const { row, isOpen, onToggle } = props;
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5 pr-2">
        <button type="button" onClick={onToggle} aria-expanded={isOpen} className={expandButton}>
          <Chevron className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className={row.costCenterId ? 'text-foreground' : 'text-muted-foreground'}>{row.costCenterName}</span>
          {row.costCenterId && !row.isActive && <span className="text-xs text-muted-foreground">(inativo)</span>}
        </button>
      </td>
      <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">
        {row.projectCost > 0 ? fmtBRL0(row.projectCost) : '—'}
      </td>
      <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">
        {row.internalCost > 0 ? fmtBRL0(row.internalCost) : '—'}
      </td>
      <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">{fmtHours(row.totalHours)}</td>
      <td className="py-1.5 text-right font-mono font-semibold tabular-nums text-foreground">
        {fmtBRL0(row.totalCost)}
      </td>
      <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">{fmtPct(row.sharePct)}</td>
    </tr>
  );
}

/** As origens de um centro aberto, cada uma podendo abrir as pessoas. */
function DetailGroup(props: {
  centerKey: string;
  details: readonly CostCenterDetailRow[];
  isOpen: (key: string) => boolean;
  toggle: (key: string) => void;
}) {
  const { centerKey, details, isOpen, toggle } = props;
  if (details.length === 0) {
    return (
      <tr className="border-b border-border/40 bg-muted/30">
        <td colSpan={COLUMN_COUNT} className="py-1.5 pl-7 text-xs text-muted-foreground">
          Sem lançamentos detalhados no período.
        </td>
      </tr>
    );
  }
  return (
    <>
      {details.map((detail) => {
        const detailKey = `${centerKey}:${detail.origin}:${detail.id}`;
        return (
          <Fragment key={detailKey}>
            <DetailRow detail={detail} isOpen={isOpen(detailKey)} onToggle={() => toggle(detailKey)} />
            {isOpen(detailKey) && detail.people.map((person) => <PersonRow key={person.id} person={person} />)}
          </Fragment>
        );
      })}
    </>
  );
}

export function CostByCostCenterCard(props: Props) {
  const { data, isLoading } = props;
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const isOpen = (key: string) => expanded.has(key);
  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (isLoading) return <LoadingCard />;

  const hasData = !!data && data.totalCost > 0;

  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
          Custo por centro de custo
        </h2>
        {hasData && (
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {fmtBRL0(data.totalCost)} · {fmtHours(data.totalHours)}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Horas apontadas no período, valorizadas pelo custo de cada pessoa. Abra um centro para ver os projetos e as
        atividades, e um projeto para ver quem apontou. A fatia é sempre relativa ao nível de cima. Toda a empresa: não
        recebe os filtros de cliente, gerente e projeto, porque custo interno não pertence a um projeto.
      </p>

      {!hasData ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Sem horas apontadas no período, ou nenhum item do catálogo com centro de custo definido.
        </p>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <caption className="sr-only">
                Custo por centro de custo no período, com a composição de cada centro e quem apontou as horas
              </caption>
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th scope="col" className="py-2 text-left font-medium">Centro de custo</th>
                  <th scope="col" className="py-2 text-right font-medium">Projeto</th>
                  <th scope="col" className="py-2 text-right font-medium">Interno</th>
                  <th scope="col" className="py-2 text-right font-medium">Horas</th>
                  <th scope="col" className="py-2 text-right font-medium">Custo</th>
                  <th scope="col" className="py-2 text-right font-medium">Fatia</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const centerKey = row.costCenterId ?? NO_CENTER_KEY;
                  return (
                    <Fragment key={centerKey}>
                      <CenterRow row={row} isOpen={isOpen(centerKey)} onToggle={() => toggle(centerKey)} />
                      {isOpen(centerKey) && (
                        <DetailGroup
                          centerKey={centerKey}
                          details={row.details}
                          isOpen={isOpen}
                          toggle={toggle}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <CoverageNote data={data} />
        </>
      )}
    </section>
  );
}
