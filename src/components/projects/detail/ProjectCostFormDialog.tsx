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
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/lib/projectCosts";
import {
  useAddProjectCost,
  useUpdateProjectCost,
} from "@/hooks/useProjectCostItems";
import type {
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
  paidDate: string;
  notes: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyState = (category: ProjectCostCategory): FormState => ({
  category,
  description: "",
  plannedAmount: 0,
  actualAmount: null,
  costDate: todayISO(),
  paidDate: todayISO(),
  notes: "",
});

export function ProjectCostFormDialog({
  open,
  onOpenChange,
  projectId,
  category,
  cost,
}: ProjectCostFormDialogProps) {
  const isEdit = !!cost;
  const [form, setForm] = useState<FormState>(() => emptyState(category));
  const [isPaid, setIsPaid] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addCost = useAddProjectCost();
  const updateCost = useUpdateProjectCost();
  const isSaving = addCost.isPending || updateCost.isPending;

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (cost) {
      const paid = cost.status === "paid";
      setIsPaid(paid);
      setForm({
        category: cost.category,
        description: cost.description,
        plannedAmount: Number(cost.planned_amount),
        actualAmount: cost.actual_amount != null ? Number(cost.actual_amount) : null,
        costDate: cost.cost_date ?? todayISO(),
        paidDate: cost.cost_date ?? todayISO(),
        notes: cost.notes ?? "",
      });
    } else {
      setIsPaid(false);
      setForm(emptyState(category));
    }
  }, [open, cost, category]);

  const patch = (changes: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...changes }));

  const handlePaidToggle = (checked: boolean) => {
    setIsPaid(checked);
    if (checked) {
      const date = form.costDate || todayISO();
      patch({ paidDate: date, costDate: date, actualAmount: form.plannedAmount });
    } else {
      patch({ actualAmount: null });
    }
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!form.description.trim()) newErrors.description = "Descrição é obrigatória";
    if (!form.plannedAmount || form.plannedAmount <= 0) newErrors.plannedAmount = "Valor planejado é obrigatório";
    if (!form.costDate) newErrors.costDate = "Data é obrigatória";
    if (isPaid && (!form.actualAmount || form.actualAmount <= 0)) newErrors.actualAmount = "Valor realizado é obrigatório";
    if (isPaid && !form.paidDate) newErrors.paidDate = "Data de pagamento é obrigatória";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const payload = {
      category: form.category,
      description: form.description,
      costDate: isPaid ? form.paidDate : form.costDate,
      plannedAmount: form.plannedAmount,
      actualAmount: isPaid ? form.actualAmount : null,
      currency: "BRL" as const,
      exchangeRate: 1,
      notes: form.notes,
      status: isPaid ? ("paid" as const) : ("planned" as const),
    };

    const onSuccess = () => onOpenChange(false);
    if (isEdit && cost) {
      updateCost.mutate({ id: cost.id, projectId, ...payload }, { onSuccess });
    } else {
      addCost.mutate({ projectId, ...payload }, { onSuccess });
    }
  };

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
              onValueChange={(v) => patch({ category: v as ProjectCostCategory })}
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
              <Label htmlFor="cost-planned">Valor planejado *</Label>
              <CurrencyInput
                id="cost-planned"
                value={form.plannedAmount}
                onValueChange={(v) => patch({ plannedAmount: v })}
              />
              {errors.plannedAmount && (
                <p className="text-xs text-destructive">{errors.plannedAmount}</p>
              )}
            </div>

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
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="cost-paid"
              checked={isPaid}
              onCheckedChange={(v) => handlePaidToggle(!!v)}
            />
            <Label htmlFor="cost-paid" className="cursor-pointer font-normal">
              Pago
            </Label>
          </div>

          {isPaid && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost-actual">Valor realizado *</Label>
                <CurrencyInput
                  id="cost-actual"
                  value={form.actualAmount ?? 0}
                  onValueChange={(v) => patch({ actualAmount: v > 0 ? v : null })}
                />
                {errors.actualAmount && (
                  <p className="text-xs text-destructive">{errors.actualAmount}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost-paid-date">Pago em *</Label>
                <Input
                  id="cost-paid-date"
                  type="date"
                  value={form.paidDate}
                  onChange={(e) => patch({ paidDate: e.target.value, costDate: e.target.value })}
                  max={todayISO()}
                  aria-invalid={!!errors.paidDate}
                />
                {errors.paidDate && (
                  <p className="text-xs text-destructive">{errors.paidDate}</p>
                )}
              </div>
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
