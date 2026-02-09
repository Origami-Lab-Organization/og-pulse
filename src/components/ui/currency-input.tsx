import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Formats a numeric value (in cents) to Brazilian currency display: "1.234,56"
 */
function formatDisplay(cents: number): string {
  if (cents === 0) return '';
  const amount = cents / 100;
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parses a display string back to a number (reais).
 */
function parseDisplay(display: string): number {
  if (!display) return 0;
  const cleaned = display.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

interface CurrencyInputProps {
  /** Numeric value in reais (e.g. 1234.56) */
  value: number;
  /** Called with the new numeric value in reais */
  onValueChange: (value: number) => void;
  /** Show "R$" prefix (default: false) */
  showPrefix?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Additional className for the input */
  className?: string;
  /** Compact mode for table cells - smaller, centered */
  compact?: boolean;
  /** HTML id */
  id?: string;
  /** Disabled state */
  disabled?: boolean;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, showPrefix = false, placeholder = '0,00', className, compact = false, id, disabled }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');

    // Sync display from external value
    React.useEffect(() => {
      const cents = Math.round(value * 100);
      setDisplayValue(formatDisplay(cents));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      
      // Only allow digits
      const digits = raw.replace(/\D/g, '');
      
      if (!digits) {
        setDisplayValue('');
        onValueChange(0);
        return;
      }

      const cents = parseInt(digits, 10);
      const formatted = formatDisplay(cents);
      setDisplayValue(formatted);
      onValueChange(cents / 100);
    };

    if (showPrefix) {
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            R$
          </span>
          <Input
            ref={ref}
            id={id}
            type="text"
            inputMode="numeric"
            placeholder={placeholder}
            value={displayValue}
            onChange={handleChange}
            disabled={disabled}
            className={cn('pl-10', compact && 'h-8 text-center', className)}
          />
        </div>
      );
    }

    return (
      <Input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        className={cn(compact && 'h-8 text-center', className)}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput, parseDisplay as parseCurrencyDisplay };
