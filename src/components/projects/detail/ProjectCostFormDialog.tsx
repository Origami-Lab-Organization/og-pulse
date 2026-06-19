import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABEL,
  COST_CURRENCIES,
  isForeignCurrency,
  projectCostFormSchema,
  toBRL,
} from "@/lib/projectCosts";
import {
  useAddProjectCost,
  useUpdateProjectCost,
} from "@/hooks/useProjectCostItems";
import type {
  CostCurrency,
  ProjectCostCategory,
  ProjectCostDB,
} from "@/types/project";

interface ProjectCostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  category: ProjectCostCategory;
  cost?: ProjectCostDB | null;
}

interface FormState {
  category: ProjectCostCategory;
  description: string;
  plannedAmount: number;
  actualAmount: number | null;
  costDate: string;
  currency: CostCurrency;
  exchangeRate: number;
  notes: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyState = (category: ProjectCostCategory): FormState => ({
  category,
  description: "",
  plannedAmount: 0,
  actualAmount: null,
  costDate: todayISO(),
  currency: "BRL",
  exchangeRate: 1,
  notes: "",
});

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ProjectCostFormDialog({
  open,
  onOpenChange,
  projectId,
  category,
  cost,
}: ProjectCostFormDialogProps) {
  const isEdit = !!cost;
  const [form, setForm] = useState<FormState>(() => emptyState(category));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addCost = useAddProjectCost();
  const updateCost = useUpdateProjectCost();
  const isSaving = addCost.isPending || updateCost.isPending;

  // (Re)inicializa o formulário ao abrir / trocar de custo.
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      cost
        ? {
            category: cost.category,
            description: cost.description,
            plannedAmount: Number(cost.planned_amount),
            actualAmount:
              cost.actual_amount != null ? Number(cost.actual_amount) : null,
            costDate: cost.cost_date,
            currency: cost.original_currency,
            exchangeRate: Number(cost.exchange_rate) || 1,
            notes: cost.notes ?? "",
          }
        : emptyState(category),
    );
  }, [open, cost, category]);

  const foreign = isForeignCurrency(form.currency);

  const convertedPreview = useMemo(() => {
    if (!foreign || !form.exchangeRate) return null;
    return toBRL(form.plannedAmount, form.exchangeRate);
  }, [foreign, form.plannedAmount, form.exchangeRate]);

  const patch = (changes: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...changes }));

  const handleCurrencyChange = (currency: CostCurrency) =>
    patch({
      currency,
      exchangeRate: currency === "BRL" ? 1 : form.exchangeRate,
    });

  const handleSubmit = () => {
    const result = projectCostFormSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const payload = {
      category: form.category,
      description: form.description,
      costDate: form.costDate,
      plannedAmount: form.plannedAmount,
      actualAmount: form.actualAmount,
      currency: form.currency,
      exchangeRate: form.currency === "BRL" ? 1 : form.exchangeRate,
      notes: form.notes,
    };

    const onSuccess = () => onOpenChange(false);
    if (isEdit && cost) {
      updateCost.mutate({ id: cost.id, projectId, ...payload }, { onSuccess });
    } else {
      addCost.mutate({ projectId, ...payload }, { onSuccess });
    }
  };

  const amountLabel = foreign
    ? `Valor planejado (${form.currency})`
    : "Valor planejado";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar custo" : "Adicionar custo"} ·{" "}
            {COST_CATEGORY_LABEL[form.category]}
          </DialogTitle>
          <DialogDescription>Registre um custo do projeto.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cost-category">Tipo de custo *</Label>
            <Select
              value={form.category}
              onValueChange={(v) =>
                patch({ category: v as ProjectCostCategory })
              }
            >
              <SelectTrigger id="cost-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COST_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost-description">Descrição *</Label>
            <Input
              id="cost-description"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Ex.: Licença Adobe"
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost-planned">{amountLabel} *</Label>
              <CurrencyInput
                id="cost-planned"
                value={form.plannedAmount}
                onValueChange={(v) => patch({ plannedAmount: v })}
                showPrefix={!foreign}
              />
              {errors.plannedAmount && (
                <p className="text-xs text-destructive">
                  {errors.plannedAmount}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost-actual">
                Valor realizado {foreign ? `(${form.currency})` : ""}
              </Label>
              <CurrencyInput
                id="cost-actual"
                value={form.actualAmount ?? 0}
                onValueChange={(v) => patch({ actualAmount: v > 0 ? v : null })}
                showPrefix={!foreign}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost-date">Data *</Label>
              <Input
                id="cost-date"
                type="date"
                value={form.costDate}
                onChange={(e) => patch({ costDate: e.target.value })}
                aria-invalid={!!errors.costDate}
              />
              {errors.costDate && (
                <p className="text-xs text-destructive">{errors.costDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost-currency">Moeda</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => handleCurrencyChange(v as CostCurrency)}
              >
                <SelectTrigger id="cost-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COST_CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {foreign && (
            <div className="space-y-2">
              <Label htmlFor="cost-rate">
                Taxa de câmbio (BRL/{form.currency}) *
              </Label>
              <Input
                id="cost-rate"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.0001"
                value={form.exchangeRate || ""}
                onChange={(e) =>
                  patch({ exchangeRate: parseFloat(e.target.value) || 0 })
                }
                placeholder="Ex.: 5,20"
                aria-invalid={!!errors.exchangeRate}
              />
              {errors.exchangeRate && (
                <p className="text-xs text-destructive">
                  {errors.exchangeRate}
                </p>
              )}
              {convertedPreview != null && (
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  ≈ {brl(convertedPreview)}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cost-notes">Observações</Label>
            <Textarea
              id="cost-notes"
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={2}
              placeholder="Opcional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
