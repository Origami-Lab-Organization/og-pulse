import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FATURAMENTO_BASES, type FaturamentoBase } from '@/types/prospect';

interface FaturamentoAnualFieldProps {
  id: string;
  valor: number;
  base: FaturamentoBase;
  onValorChange: (valor: number) => void;
  onBaseChange: (base: FaturamentoBase) => void;
  disabled?: boolean;
  /** Altura do campo, para casar com os vizinhos do formulário. */
  className?: string;
}

/**
 * Faturamento anual da empresa e de onde ele vem (01/10/2026). O seletor fica colado ao
 * valor de propósito: o número não existe sem a base, e a dica diz o que cada uma significa.
 */
export function FaturamentoAnualField(props: FaturamentoAnualFieldProps) {
  const { id, valor, base, onValorChange, onBaseChange, disabled, className } = props;
  const dica = FATURAMENTO_BASES.find((b) => b.value === base)?.hint;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <CurrencyInput id={id} value={valor} onValueChange={onValorChange} showPrefix disabled={disabled} className={className} />
        </div>
        <Select value={base} onValueChange={(v) => onBaseChange(v as FaturamentoBase)} disabled={disabled}>
          <SelectTrigger aria-label="Base do faturamento" className={cn('w-[128px] shrink-0', className)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FATURAMENTO_BASES.map((b) => (
              <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {dica && <p className="text-xs text-muted-foreground">{dica}.</p>}
    </div>
  );
}
