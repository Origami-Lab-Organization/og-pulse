import { Check } from 'lucide-react';
import { FORMAS_VENDIDAS, ROTULO_DA_FORMA } from '@/lib/formasDeReceita.constants';
import { alternarForma, rotuloDoModelo } from '@/lib/formasDeReceita';
import type { FormaDeReceita } from '@/types/serviceRevenueModel';
import { cn } from '@/lib/utils';

interface ModeloDeReceitaPickerProps {
  value: FormaDeReceita[];
  onChange: (formas: FormaDeReceita[]) => void;
  /** Motivo de não poder adicionar, mostrado abaixo das formas. */
  erro?: string | null;
  disabled?: boolean;
}

/**
 * Formas de um modelo de receita (US-0046): marcar mais de uma combina; Cortesia vai sozinha.
 * O resultado aparece ao vivo, no lugar de uma explicação.
 */
export function ModeloDeReceitaPicker(props: ModeloDeReceitaPickerProps) {
  const { value, onChange, erro, disabled } = props;
  return (
    <div className="grid gap-3">
      <div role="group" aria-label="Formas do modelo de receita" className="flex flex-wrap gap-2">
        {FORMAS_VENDIDAS.map((forma) => {
          const marcada = value.includes(forma);
          return (
            <button
              key={forma}
              type="button"
              role="checkbox"
              aria-checked={marcada}
              disabled={disabled}
              onClick={() => onChange(alternarForma(value, forma))}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-60',
                marcada
                  ? 'border-primary bg-success-subtle font-semibold text-primary'
                  : 'border-border bg-card hover:bg-muted/50',
              )}
            >
              {marcada && <Check className="h-3.5 w-3.5" aria-hidden />}
              {ROTULO_DA_FORMA[forma]}
            </button>
          );
        })}
      </div>
      <p className="min-h-5 text-sm" aria-live="polite">
        {value.length > 0 && (
          <>
            Modelo: <span className="font-semibold">{rotuloDoModelo(value)}</span>
          </>
        )}
      </p>
      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
