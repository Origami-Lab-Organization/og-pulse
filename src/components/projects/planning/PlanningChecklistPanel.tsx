import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHideValues, useMaskedCurrency } from '@/contexts/HideValuesContext';
import { cn } from '@/lib/utils';
import type {
  PlanningChecklist,
  PlanningComparison,
  PlanningCta,
  PlanningItem,
  PlanningItemKey,
} from '@/types/projectPlanning';

interface PlanningChecklistPanelProps {
  checklist: PlanningChecklist;
  comparison: PlanningComparison;
  cta: PlanningCta;
  activeTab: PlanningItemKey;
  onSelect: (tab: PlanningItemKey) => void;
  /** Item que acabou de ficar pronto: ganha o "Pronto ·" por alguns segundos. */
  justDone: PlanningItemKey | null;
  /** Motivo da última devolução do admin, mostrado ao GP (cenário 14). */
  returnReason: string | null;
  isBusy: boolean;
  onConclude: () => void;
  onRequestApproval: () => void;
  onApprove: () => void;
  onReturn: () => void;
}

interface ItemButtonProps {
  item: PlanningItem;
  active: boolean;
  justDone: boolean;
  onSelect: (tab: PlanningItemKey) => void;
}

function itemStatusText(item: PlanningItem) {
  if (item.done) return ' — preenchido';
  return item.required ? ' — pendente' : ' — opcional, não informado';
}

function checkClass(item: PlanningItem) {
  if (item.done) return 'border-primary bg-primary text-primary-foreground';
  return item.required ? 'border-muted-foreground/40' : 'border-dashed border-muted-foreground/40';
}

function ItemButton(props: ItemButtonProps) {
  const { item, active, justDone, onSelect } = props;
  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      aria-current={active}
      className={cn(
        'flex w-full items-start gap-3 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && 'bg-muted',
      )}
    >
      <span aria-hidden className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors', checkClass(item))}>
        {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="grid min-w-0">
        <span className="text-sm font-medium text-foreground">
          {item.label}
          <span className="sr-only">{itemStatusText(item)}</span>
        </span>
        <small className={cn('text-xs text-muted-foreground', justDone && 'font-medium text-success-emphasis')}>
          {justDone && 'Pronto · '}
          {item.summary}
        </small>
      </span>
    </button>
  );
}

const formatPct = (value: number) => `${value.toFixed(1).replace('.', ',')}%`;

interface ResultRow {
  label: string;
  budget: string | null;
  plan: string;
  worse: boolean;
  total?: boolean;
}

/** Linhas da tabela; `worse` = planejado pior que o orçado. */
function resultRows(comparison: PlanningComparison, money: (v: number) => string, pct: (v: number) => string): ResultRow[] {
  const { planned, budgeted, shortfall } = comparison;
  const b = budgeted;
  return [
    { label: 'Equipe', budget: b ? money(b.labor) : null, plan: money(planned.labor), worse: Boolean(b && planned.labor > b.labor) },
    { label: 'Custos', budget: b ? money(b.costs) : null, plan: money(planned.costs), worse: Boolean(b && planned.costs > b.costs) },
    { label: 'Resultado', budget: b ? money(b.result) : null, plan: money(planned.result), worse: shortfall > 0, total: true },
    { label: 'Margem', budget: b ? pct(b.margin) : null, plan: pct(planned.margin), worse: shortfall > 0 },
  ];
}

/** Equipe, Custos, Resultado e Margem — Orçado × Planejado; pior que o orçado em destaque. */
function ResultTable(props: { comparison: PlanningComparison }) {
  const money = useMaskedCurrency();
  const hide = useHideValues();
  const pct = (value: number) => (hide ? '•••' : formatPct(value));
  const hasBudget = Boolean(props.comparison.budgeted);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th scope="col" className="pb-1 text-left font-normal"><span className="sr-only">Linha</span></th>
          {hasBudget && <th scope="col" className="pb-1 text-right font-normal">Orçado</th>}
          <th scope="col" className="pb-1 text-right font-normal">Planejado</th>
        </tr>
      </thead>
      <tbody className="font-mono tabular-nums">
        {resultRows(props.comparison, money, pct).map((row) => (
          <tr key={row.label} className={cn(row.total && 'border-t font-semibold')}>
            <td className="py-1 font-sans text-muted-foreground">{row.label}</td>
            {hasBudget && <td className="py-1 text-right">{row.budget}</td>}
            <td className={cn('py-1 text-right', row.worse && 'font-semibold text-warning-emphasis')}>{row.plan}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const CALLOUT_TONE = {
  warning: 'bg-warning-subtle text-warning-emphasis',
  info: 'bg-info-subtle text-info-emphasis',
} as const;

function Callout(props: { tone: keyof typeof CALLOUT_TONE; children: React.ReactNode }) {
  return <div className={cn('rounded-md px-3 py-2.5 text-sm', CALLOUT_TONE[props.tone])}>{props.children}</div>;
}

interface CtaViewProps extends PlanningChecklistPanelProps {
  /** Quanto o planejado ficou abaixo do orçado, já formatado (ou mascarado). */
  gap: string;
}

function ReadOnlyCta(props: CtaViewProps) {
  const missing = props.checklist.requiredTotal - props.checklist.requiredDone;
  const status = missing === 0 ? 'Obrigatórios prontos.' : `Faltam ${missing} de ${props.checklist.requiredTotal} obrigatórios.`;
  return <p className="text-xs text-muted-foreground">{status} Quem conclui é o GP do projeto ou o admin.</p>;
}

const BlockedCta = () => <Button disabled className="w-full">Concluir planejamento</Button>;

const ConcludeCta = (props: CtaViewProps) => (
  <Button className="w-full" onClick={props.onConclude} disabled={props.isBusy}>
    Concluir planejamento
  </Button>
);

function RequestApprovalCta(props: CtaViewProps) {
  return (
    <>
      {props.returnReason && (
        <Callout tone="info">
          <b>O admin devolveu o planejamento:</b> {props.returnReason}
        </Callout>
      )}
      <Callout tone="warning">
        O resultado planejado está <b>{props.gap}</b> abaixo do orçado. Ajuste a equipe ou os custos, ou peça a aprovação do admin.
      </Callout>
      <Button className="w-full" onClick={props.onRequestApproval} disabled={props.isBusy}>
        Pedir aprovação do admin
      </Button>
    </>
  );
}

const AwaitingAdminCta = () => (
  <Callout tone="warning">
    <b>Aguardando o admin.</b> Você pode continuar ajustando: se o resultado voltar ao orçado, conclui sem aprovação.
  </Callout>
);

const AdminDecidesCta = (props: CtaViewProps) => (
  <>
    <p className="text-sm text-foreground">
      <b>O GP pediu aprovação.</b> O resultado planejado ficou {props.gap} abaixo do orçado.
    </p>
    <Button className="w-full" onClick={props.onApprove} disabled={props.isBusy}>
      Aprovar e concluir
    </Button>
    <Button variant="outline" className="w-full" onClick={props.onReturn} disabled={props.isBusy}>
      Devolver ao GP
    </Button>
  </>
);

const AdminConcludesCta = (props: CtaViewProps) => (
  <>
    <Callout tone="warning">
      O resultado planejado está <b>{props.gap}</b> abaixo do orçado. Ajuste a equipe ou os custos, ou conclua com a sua aprovação.
    </Callout>
    <Button className="w-full" onClick={props.onApprove} disabled={props.isBusy}>
      Aprovar e concluir
    </Button>
  </>
);

/** O fim do checklist: o que quem está olhando pode fazer agora (cenários 10 a 15). */
const CTA_VIEW: Record<PlanningCta, (props: CtaViewProps) => JSX.Element> = {
  read_only: ReadOnlyCta,
  blocked: BlockedCta,
  conclude: ConcludeCta,
  request_approval: RequestApprovalCta,
  awaiting_admin: AwaitingAdminCta,
  admin_decides: AdminDecidesCta,
  admin_concludes: AdminConcludesCta,
};

function CtaBlock(props: PlanningChecklistPanelProps) {
  const money = useMaskedCurrency();
  const View = CTA_VIEW[props.cta];
  return <View {...props} gap={money(props.comparison.shortfall)} />;
}

/**
 * Checklist do planejamento, aberto pelo widget do canto da tela.
 * Derivado do que está salvo nas abas — nada se marca à mão (US-0039, cenários 2, 3 e 9).
 */
export function PlanningChecklistPanel(props: PlanningChecklistPanelProps) {
  const { checklist, comparison, activeTab, onSelect, justDone } = props;
  const required = checklist.items.filter((item) => item.required);
  const optional = checklist.items.filter((item) => !item.required);
  const share = checklist.requiredTotal > 0 ? (checklist.requiredDone / checklist.requiredTotal) * 100 : 0;
  const group = (items: PlanningItem[]) =>
    items.map((item) => (
      <ItemButton key={item.key} item={item} active={activeTab === item.key} justDone={justDone === item.key} onSelect={onSelect} />
    ));

  return (
    <aside aria-label="Checklist do planejamento" className="bg-card">
      <div className="space-y-2 px-4 pb-3 pt-4">
        <span className="ol-label text-muted-foreground">Checklist do planejamento</span>
        <h2 className="text-base font-semibold text-foreground">
          {checklist.requiredDone} de {checklist.requiredTotal} obrigatórios
        </h2>
        <div
          role="progressbar"
          aria-label="Obrigatórios concluídos"
          aria-valuemin={0}
          aria-valuemax={checklist.requiredTotal}
          aria-valuenow={checklist.requiredDone}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${share}%` }} />
        </div>
      </div>
      {/* Duas colunas para caber sem rolagem: o que falta à esquerda, o resultado e a conclusão à direita. */}
      <div className="grid border-t md:grid-cols-2 md:divide-x">
        <div className="space-y-0.5 px-2 py-2">
          <p className="ol-label px-2.5 pt-1 text-[11px] text-muted-foreground">Obrigatórios</p>
          {group(required)}
          <p className="ol-label px-2.5 pt-2 text-[11px] text-muted-foreground">Opcionais · informe se houver</p>
          {group(optional)}
        </div>
        <div className="flex flex-col gap-3 border-t px-4 py-3 md:border-t-0">
          <div className="space-y-2">
            <span className="ol-label text-muted-foreground">Resultado planejado</span>
            <ResultTable comparison={comparison} />
          </div>
          <div className="mt-auto space-y-2">
            <CtaBlock {...props} />
          </div>
        </div>
      </div>
    </aside>
  );
}
