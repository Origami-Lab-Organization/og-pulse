import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { X, Plus, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { BudgetMaterialInput } from '@/types/budget';
import { cn } from '@/lib/utils';

interface BudgetMaterialsEditorProps {
  materials: BudgetMaterialInput[];
  onMaterialsChange: (materials: BudgetMaterialInput[]) => void;
  isRecurring?: boolean;
  durationMonths?: number;
}

export const BudgetMaterialsEditor = forwardRef<HTMLDivElement, BudgetMaterialsEditorProps>(
  function BudgetMaterialsEditor(
    { materials, onMaterialsChange, isRecurring = false, durationMonths = 1 },
    ref
  ) {
    const handleAddMaterial = () => {
      onMaterialsChange([
        ...materials,
        { tempId: crypto.randomUUID(), description: '', value: 0 },
      ]);
    };

    const handleRemoveMaterial = (tempId: string) => {
      onMaterialsChange(materials.filter((m) => m.tempId !== tempId));
    };

    const handleUpdate = (
      tempId: string,
      field: 'description' | 'value',
      value: string | number
    ) => {
      onMaterialsChange(materials.map((m) => (m.tempId === tempId ? { ...m, [field]: value } : m)));
    };

    const totalMaterials = materials.reduce((sum, m) => sum + (m.value || 0), 0);
    const monthlyRateio = durationMonths > 0 ? totalMaterials / durationMonths : 0;

    return (
      <div ref={ref} className="space-y-2">
        <p className="text-sm font-medium">
          {isRecurring ? 'Custos de implantação (pontual)' : 'Materiais'}
        </p>

        {isRecurring && (
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Custos pontuais de implantação. O valor será rateado ao longo dos{' '}
              <strong>{durationMonths} meses</strong> do contrato na precificação.
            </span>
          </div>
        )}

        {materials.map((material) => (
          <div key={material.tempId} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Input
                placeholder={isRecurring ? 'Descrição do custo...' : 'Descrição do material...'}
                value={material.description}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                onChange={(e) => handleUpdate(material.tempId, 'description', e.target.value)}
                className="flex-1 text-sm font-medium h-8"
              />
              <button
                type="button"
                onClick={() => handleRemoveMaterial(material.tempId)}
                className="mt-1 text-destructive hover:text-destructive/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-0.5">
              <CurrencyInput
                value={material.value}
                onValueChange={(v) => handleUpdate(material.tempId, 'value', v)}
                className="h-8 text-sm font-semibold w-36"
              />
              {isRecurring && durationMonths > 1 && (
                <p className="text-xs text-muted-foreground pl-1">
                  {formatCurrency((material.value || 0) / durationMonths)}/mês rateado
                </p>
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddMaterial}
          className={cn(
            'w-full rounded-lg py-2.5 text-sm font-medium text-primary transition-colors',
            'border-[1.5px] border-dashed border-primary/40 hover:border-primary hover:bg-primary/5',
          )}
        >
          <Plus className="inline h-4 w-4 mr-1.5" />
          {isRecurring ? 'Adicionar custo de implantação' : 'Adicionar material'}
        </button>

        {materials.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t text-sm">
            <span className="text-muted-foreground">
              {isRecurring ? 'Total implantação' : 'Total materiais'}
            </span>
            <div className="text-right">
              <span className="font-semibold">{formatCurrency(totalMaterials)}</span>
              {isRecurring && durationMonths > 1 && (
                <span className="block text-xs text-muted-foreground">
                  Rateio: {formatCurrency(totalMaterials)} ÷ {durationMonths} = {formatCurrency(monthlyRateio)}/mês
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);
