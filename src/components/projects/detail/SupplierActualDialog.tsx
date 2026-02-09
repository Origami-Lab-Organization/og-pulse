import { useState, useEffect, useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProjectSupplierDB } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { useUpsertSupplierActual, ProjectSupplierActualDB } from '@/hooks/useProjectSupplierActuals';

interface SupplierActualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: ProjectSupplierDB | null;
  durationMonths: number;
  existingActuals: ProjectSupplierActualDB[];
  getPlannedValueForMonth: (supplierId: string, monthNumber: number) => number;
}

export function SupplierActualDialog({
  open,
  onOpenChange,
  supplier,
  durationMonths,
  existingActuals,
  getPlannedValueForMonth,
}: SupplierActualDialogProps) {
  const [monthNumber, setMonthNumber] = useState<number>(1);
  const [value, setValue] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const upsertActual = useUpsertSupplierActual();

  const months = useMemo(
    () => Array.from({ length: durationMonths }, (_, i) => i + 1),
    [durationMonths]
  );

  // Reset form when dialog opens with a new supplier
  useEffect(() => {
    if (open && supplier) {
      // Find the first month without actual value
      const monthsWithActual = existingActuals
        .filter((a) => a.project_supplier_id === supplier.id)
        .map((a) => a.month_number);
      
      const firstEmptyMonth = months.find((m) => !monthsWithActual.includes(m)) || 1;
      setMonthNumber(firstEmptyMonth);
      
      // Pre-fill with existing value if any
      const existingForMonth = existingActuals.find(
        (a) => a.project_supplier_id === supplier.id && a.month_number === firstEmptyMonth
      );
      setValue(existingForMonth?.value || 0);
      setNotes(existingForMonth?.notes || '');
    }
  }, [open, supplier, existingActuals, durationMonths]);

  // Update value when month changes
  useEffect(() => {
    if (supplier) {
      const existingForMonth = existingActuals.find(
        (a) => a.project_supplier_id === supplier.id && a.month_number === monthNumber
      );
      setValue(existingForMonth?.value || 0);
      setNotes(existingForMonth?.notes || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthNumber]);

  const handleSubmit = () => {
    if (!supplier) return;

    upsertActual.mutate(
      {
        projectSupplierId: supplier.id,
        monthNumber,
        value,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const plannedValue = supplier ? getPlannedValueForMonth(supplier.id, monthNumber) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Lançar Custo Real
          </DialogTitle>
          <DialogDescription>
            Registre o valor efetivamente pago ao fornecedor neste mês.
          </DialogDescription>
        </DialogHeader>

        {supplier && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{supplier.name}</p>
              {supplier.description && (
                <p className="text-sm text-muted-foreground">{supplier.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthNumber">Mês do Projeto *</Label>
              <Select
                value={String(monthNumber)}
                onValueChange={(v) => setMonthNumber(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => {
                    const planned = getPlannedValueForMonth(supplier.id, m);
                    const hasActual = existingActuals.some(
                      (a) => a.project_supplier_id === supplier.id && a.month_number === m && a.value > 0
                    );
                    return (
                      <SelectItem key={m} value={String(m)}>
                        <span className="flex items-center gap-2">
                          Mês {m}
                          {planned > 0 && (
                            <span className="text-xs text-muted-foreground">
                              (Plan: {formatCurrency(planned)})
                            </span>
                          )}
                          {hasActual && (
                            <span className="text-xs text-green-600">✓</span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {plannedValue > 0 && (
              <div className="text-sm text-muted-foreground">
                Valor planejado para este mês: <strong>{formatCurrency(plannedValue)}</strong>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="value">Valor Realizado (R$) *</Label>
              <CurrencyInput
                id="value"
                value={value}
                onValueChange={setValue}
                showPrefix
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observação (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Número da NF, data de pagamento, etc."
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!supplier || upsertActual.isPending}
          >
            {upsertActual.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
