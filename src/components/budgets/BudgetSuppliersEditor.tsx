import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { X, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { BudgetSupplierInput } from '@/types/budget';
import { useSuppliers } from '@/hooks/useSuppliers';
import { cn } from '@/lib/utils';

interface BudgetSuppliersEditorProps {
  suppliers: BudgetSupplierInput[];
  durationMonths: number;
  onSuppliersChange: (suppliers: BudgetSupplierInput[]) => void;
  isRecurring?: boolean;
}

interface SupplierNameInputProps {
  value: string;
  onChange: (value: string) => void;
}

function SupplierNameInput({ value, onChange }: SupplierNameInputProps) {
  const { data: catalogSuppliers = [] } = useSuppliers();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filtered = catalogSuppliers.filter((s) =>
    s.companyName.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    onChange(v);
    setOpen(v.length > 0 && filtered.length > 0);
  };

  const handleSelect = (name: string) => {
    setInputValue(name);
    onChange(name);
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = catalogSuppliers.filter((s) =>
    s.companyName.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="Nome do fornecedor..."
        value={inputValue}
        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
        onChange={handleInputChange}
        onFocus={() => {
          if (inputValue.length > 0 && suggestions.length > 0) setOpen(true);
        }}
        className="text-sm font-medium h-8"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md max-h-48 overflow-auto text-sm">
          {suggestions.map((s) => (
            <li
              key={s.id}
              className="px-3 py-2 cursor-pointer hover:bg-accent"
              onMouseDown={() => handleSelect(s.companyName)}
            >
              {s.companyName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BudgetSuppliersEditor({
  suppliers,
  durationMonths,
  onSuppliersChange,
  isRecurring = false,
}: BudgetSuppliersEditorProps) {
  const handleAddSupplier = () => {
    onSuppliersChange([
      ...suppliers,
      { tempId: crypto.randomUUID(), name: '', description: '', monthlyValue: 0 },
    ]);
  };

  const handleRemoveSupplier = (tempId: string) => {
    onSuppliersChange(suppliers.filter((s) => s.tempId !== tempId));
  };

  const handleUpdate = (
    tempId: string,
    field: 'name' | 'description' | 'monthlyValue',
    value: string | number
  ) => {
    onSuppliersChange(suppliers.map((s) => (s.tempId === tempId ? { ...s, [field]: value } : s)));
  };

  const totalMonthly = suppliers.reduce((sum, s) => sum + (s.monthlyValue || 0), 0);
  const totalContract = totalMonthly * durationMonths;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Fornecedores</p>

      {suppliers.map((supplier) => (
        <div key={supplier.tempId} className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <SupplierNameInput
                value={supplier.name}
                onChange={(v) => handleUpdate(supplier.tempId, 'name', v)}
              />
            </div>
            <button
              type="button"
              onClick={() => handleRemoveSupplier(supplier.tempId)}
              className="mt-1 text-destructive hover:text-destructive/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Input
            placeholder="Descrição do serviço..."
            value={supplier.description}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            onChange={(e) => handleUpdate(supplier.tempId, 'description', e.target.value)}
            className="text-xs text-muted-foreground h-7"
          />

          <div className="flex items-baseline gap-2">
            <CurrencyInput
              value={supplier.monthlyValue}
              onValueChange={(v) => handleUpdate(supplier.tempId, 'monthlyValue', v)}
              className="h-8 text-sm font-semibold w-36"
            />
            <span className="text-xs text-muted-foreground">/mês</span>
            {!isRecurring && (
              <span className="text-xs text-muted-foreground ml-auto">
                Total: {formatCurrency((supplier.monthlyValue || 0) * durationMonths)}
              </span>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddSupplier}
        className={cn(
          'w-full rounded-lg py-2.5 text-sm font-medium text-primary transition-colors',
          'border-[1.5px] border-dashed border-primary/40 hover:border-primary hover:bg-primary/5',
        )}
      >
        <Plus className="inline h-4 w-4 mr-1.5" />
        Adicionar fornecedor
      </button>

      {suppliers.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t text-sm">
          <span className="text-muted-foreground">
            {isRecurring ? 'Total fornecedores/mês' : 'Total fornecedores'}
          </span>
          <div className="text-right">
            <span className="font-semibold">{formatCurrency(totalMonthly)}/mês</span>
            {!isRecurring && (
              <span className="block text-xs text-muted-foreground">
                {formatCurrency(totalContract)} total
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
