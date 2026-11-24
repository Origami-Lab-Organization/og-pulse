import { useState } from 'react';
import { CheckCircle2, CircleDashed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useHideValues, useMaskedCurrency } from '@/contexts/HideValuesContext';
import type { PlanningChecklist, PlanningComparison, PlanningItem, PlanningItemKey } from '@/types/projectPlanning';

interface FinishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklist: PlanningChecklist;
  comparison: PlanningComparison;
  /** O admin está aprovando abaixo do orçado (cenário 14). */
  asApproval: boolean;
  isPending: boolean;
  onGoToTab: (tab: PlanningItemKey) => void;
  onConfirm: () => void;
}

const COSTS: PlanningItemKey = 'costs';
const formatPct = (value: number) => `${value.toFixed(1).replace('.', ',')}%`;

function emptyText(item: PlanningItem, budgetedCosts: string | null) {
  if (item.key !== COSTS) return 'nenhum informado.';
  if (budgetedCosts) return `nenhum informado. O orçamento previa ${budgetedCosts}; sem eles, o planejado considera só a equipe.`;
  return 'nenhum informado. O planejado considera só a equipe.';
}

function ItemLine(props: { item: PlanningItem; budgetedCosts: string | null }) {
  const { item } = props;
  const Icon = item.done ? CheckCircle2 : CircleDashed;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon aria-hidden className={item.done ? 'mt-0.5 h-4 w-4 shrink-0 text-success-emphasis' : 'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground'} />
      <span>
        <b className="font-semibold">{item.label}</b> · {item.done ? item.summary : emptyText(item, props.budgetedCosts)}
      </span>
    </li>
  );
}

function confirmLabel(hasEmptyOptional: boolean, asApproval: boolean) {
  if (hasEmptyOptional) return 'Confirmar e concluir';
  return asApproval ? 'Aprovar e concluir' : 'Concluir planejamento';
}

/** Custos que o orçamento previa, formatados; `null` quando não previa nada. */
function budgetedCostsText(comparison: PlanningComparison, money: (value: number) => string) {
  const costs = comparison.budgeted?.costs ?? 0;
  return costs > 0 ? money(costs) : null;
}

function EmptyOptionalNote({ items }: { items: PlanningItem[] }) {
  if (!items.length) return null;
  const subject = items.length === 1 ? 'O item opcional acima ficou vazio' : 'Os itens opcionais acima ficaram vazios';
  const names = items.map((item) => item.label.toLowerCase()).join(' nem ');
  return (
    <p className="text-xs text-muted-foreground">
      {subject}. Confirme que o projeto não tem {names}, ou volte para informar.
    </p>
  );
}

function FinishFooter(props: FinishDialogProps & { firstEmpty: PlanningItem | undefined }) {
  const { firstEmpty, isPending } = props;
  const back = firstEmpty
    ? { label: `Informar ${firstEmpty.label.toLowerCase()}`, onClick: () => props.onGoToTab(firstEmpty.key) }
    : { label: 'Voltar', onClick: () => props.onOpenChange(false) };
  return (
    <DialogFooter>
      <Button variant="outline" onClick={back.onClick} disabled={isPending}>
        {back.label}
      </Button>
      <Button onClick={props.onConfirm} disabled={isPending}>
        {isPending ? 'Concluindo…' : confirmLabel(Boolean(firstEmpty), props.asApproval)}
      </Button>
    </DialogFooter>
  );
}

/**
 * Confirmação de concluir o planejamento (cenário 11): resultado e margem planejados, cada item
 * com o resumo, e os opcionais vazios com o atalho para informá-los. Não pede data.
 */
export function PlanningFinishDialog(props: FinishDialogProps) {
  const { checklist, comparison } = props;
  const money = useMaskedCurrency();
  const hide = useHideValues();
  const emptyOptional = checklist.items.filter((item) => !item.required && !item.done);
  const budgetedCosts = budgetedCostsText(comparison, money);
  const margin = hide ? '•••' : formatPct(comparison.planned.margin);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Concluir o planejamento?</DialogTitle>
          <DialogDescription>
            O projeto vai para <b>Entrega de Valor</b> com resultado planejado de <b>{money(comparison.planned.result)}</b> (margem{' '}
            {margin}){props.asApproval && ', abaixo do orçado, com a sua aprovação'}.
          </DialogDescription>
        </DialogHeader>
        <ul className="grid gap-1.5">
          {checklist.items.map((item) => (
            <ItemLine key={item.key} item={item} budgetedCosts={budgetedCosts} />
          ))}
        </ul>
        <EmptyOptionalNote items={emptyOptional} />
        <p className="text-xs text-muted-foreground">
          A equipe passa a lançar horas e é avisada no sistema. Mudanças no planejamento daqui em diante ficam registradas como
          replanejamento.
        </p>
        <FinishFooter {...props} firstEmpty={emptyOptional[0]} />
      </DialogContent>
    </Dialog>
  );
}

interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: (reason: string) => void;
}

/** Devolver ao GP exige o motivo (cenário 14). */
export function PlanningReturnDialog(props: ReturnDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    if (!reason.trim()) {
      setError('Escreva o motivo: é o que o GP vai ler para ajustar o planejamento.');
      return;
    }
    setError(null);
    props.onConfirm(reason.trim());
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Devolver ao GP</DialogTitle>
          <DialogDescription>O GP é avisado no sino e vê o motivo no checklist do planejamento.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="planning-return-reason">Motivo</Label>
          <Textarea
            id="planning-return-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: A equipe de dezembro está acima do orçado; reveja as horas da consultoria."
            aria-invalid={Boolean(error)}
            rows={4}
          />
          {error && (
            <p role="alert" className="text-xs font-medium text-destructive-emphasis">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={props.isPending}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={props.isPending}>
            Devolver ao GP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
