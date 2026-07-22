import { useState } from 'react';
import { ChevronUp, ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type CellMode = 'edit' | 'locked' | 'holiday' | 'future';

interface GridTimeCellProps {
  mode: CellMode;
  /** Valor REAL da célula (pode ser decimal legado); null = vazia. */
  value: number | null;
  /** Sugestão inteira (placeholder) quando vazia e planejada. */
  hint?: number;
  /** Total do dia acima da jornada → borda âmbar. */
  over: boolean;
  isFocused: boolean;
  disabledOffline: boolean;
  label: string;
  holidayName?: string;
  onChange: (value: string) => void;
  onStep: (delta: number) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: (el: HTMLInputElement | null) => void;
}

function fmt(value: number): string {
  // Inteiro mostra sem casas; decimal legado preserva a exibição (ex.: 2.5).
  return String(value);
}

export function GridTimeCell({
  mode,
  value,
  hint,
  over,
  isFocused,
  disabledOffline,
  label,
  holidayName,
  onChange,
  onStep,
  onFocus,
  onBlur,
  onKeyDown,
  inputRef,
}: GridTimeCellProps) {
  const [hovered, setHovered] = useState(false);

  if (mode === 'holiday') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex h-10 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-sm text-muted-foreground"
              aria-label={`Feriado: ${holidayName ?? ''}`}
              tabIndex={-1}
            >
              --
            </div>
          </TooltipTrigger>
          {holidayName && (
            <TooltipContent>
              <p>{holidayName}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (mode === 'future') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex h-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground"
              aria-label={`${label}: dia futuro, lançamento não permitido`}
              aria-disabled="true"
              tabIndex={-1}
            >
              —
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Não é possível lançar horas em dias futuros</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (mode === 'locked') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex h-10 items-center justify-center gap-1 rounded-lg border border-border bg-muted/50 text-sm font-semibold tabular-nums"
              aria-label={`${label}: ${value ?? 0}h — enviado, somente admin pode editar`}
              aria-readonly="true"
              tabIndex={-1}
            >
              {value === null ? '0' : fmt(value)}
              <Lock className="h-3 w-3 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Semana enviada — valores travados</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // mode === 'edit'
  const filled = value !== null;
  const showHint = !filled && hint !== undefined && hint > 0;
  const showEnterTip = isFocused && showHint;
  const showSteppers = (hovered || isFocused) && !disabledOffline;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showEnterTip && (
        <div className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-foreground shadow-[var(--shadow-1)]">
          Enter aceita {hint}h
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        data-focus-ring
        data-tour-suggested-cell={showHint ? 'true' : undefined}
        aria-label={label}
        disabled={disabledOffline}
        value={filled ? fmt(value as number) : ''}
        placeholder={showHint ? String(hint) : ''}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          onChange(digits);
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={cn(
          'h-10 w-full rounded-lg border text-center text-sm font-semibold tabular-nums transition-colors',
          'focus:outline-none focus:border-[hsl(var(--ring))]',
          'disabled:cursor-not-allowed disabled:opacity-60',
          !filled &&
            showHint &&
            'border-dashed border-[hsl(var(--success)/0.45)] placeholder:font-normal placeholder:italic placeholder:text-[hsl(var(--success-emphasis)/0.6)]',
          !filled && !showHint && 'border-border bg-background',
          filled && 'border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success-subtle))] text-foreground',
          over && 'border-[hsl(var(--warning))] focus:border-[hsl(var(--warning))]'
        )}
      />
      {showSteppers && (
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col">
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault();
              onStep(1);
            }}
            aria-label="Aumentar 1 hora"
            className="flex h-3.5 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronUp className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault();
              onStep(-1);
            }}
            aria-label="Diminuir 1 hora"
            className="flex h-3.5 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}
