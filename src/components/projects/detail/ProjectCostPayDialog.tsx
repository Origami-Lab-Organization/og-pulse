import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useUpdateProjectCost } from "@/hooks/useProjectCostItems";
import type { ProjectCostDB } from "@/types/project";
import { truncateToCents } from "@/lib/formatters";

const todayISO = () => new Date().toISOString().slice(0, 10);

interface ProjectCostPayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  cost: ProjectCostDB | null;
}

const brl = (value: number) =>
  truncateToCents(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ProjectCostPayDialog({
  open,
  onOpenChange,
  projectId,
  cost,
}: ProjectCostPayDialogProps) {
  const updateCost = useUpdateProjectCost();
  const [actualAmount, setActualAmount] = useState<number>(0);
  const [paidDate, setPaidDate] = useState<string>(todayISO());

  useEffect(() => {
    if (!open || !cost) return;
    setActualAmount(Number(cost.planned_amount));
    setPaidDate(cost.cost_date ?? todayISO());
  }, [open, cost]);

  const plannedBrl = cost ? Number(cost.planned_amount_brl) : 0;
  const isForeign = cost?.original_currency !== "BRL";
  const rate = cost ? Number(cost.exchange_rate) || 1 : 1;
  const actualBrl = isForeign ? actualAmount * rate : actualAmount;

  const handleConfirm = () => {
    if (!cost) return;
    updateCost.mutate(
      {
        id: cost.id,
        projectId,
        actualAmount,
        costDate: paidDate,
        currency: cost.original_currency,
        exchangeRate: rate,
        status: 'paid',
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription className="truncate">
            {cost?.description}
          </DialogDescription>
        </DialogHeader>

        {/* Anel de foco dos campos no verde escuro da aba (sobrescreve o
            --ring global apenas aqui, sem retokenizar). Cobre focus (Select
            Radix) e focus-visible (Input/Textarea). */}
        <div className="space-y-4 [&_*:focus]:ring-primary-deep [&_*:focus-visible]:ring-primary-deep">
          <div className="rounded-md bg-muted px-4 py-3 text-sm">
            <span className="text-muted-foreground">Valor planejado: </span>
            <span className="font-medium tabular-nums">{brl(plannedBrl)}</span>
            {isForeign && (
              <span className="text-muted-foreground">
                {" "}({cost?.original_currency} · câmbio {rate})
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-actual">
              Valor realizado{isForeign ? ` (${cost?.original_currency})` : ""} *
            </Label>
            <CurrencyInput
              id="pay-actual"
              value={actualAmount}
              onValueChange={setActualAmount}
              showPrefix={!isForeign}
            />
            {isForeign && actualAmount > 0 && (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                ≈ {brl(actualBrl)}
              </p>
            )}
            <button
              type="button"
              className="text-xs text-primary-deep underline-offset-2 hover:underline"
              onClick={() => setActualAmount(Number(cost?.planned_amount ?? 0))}
            >
              Usar valor planejado ({brl(plannedBrl)})
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-date">Pago em *</Label>
            <Input
              id="pay-date"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              max={todayISO()}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateCost.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={updateCost.isPending || actualAmount <= 0 || !paidDate}
            className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
          >
            {updateCost.isPending ? "Salvando..." : "Confirmar pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
