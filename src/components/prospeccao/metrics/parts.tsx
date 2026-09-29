import type { ReactNode } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

interface PainelProps {
  title?: string;
  description?: ReactNode;
  /** Controle à direita do título: agrupamento, recorte. */
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** O bloco padrão das métricas: título, uma frase do que ele responde, e o conteúdo. */
export function Painel(props: PainelProps) {
  const { title, description, actions, className, children } = props;
  return (
    <section className={cn('flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 sm:px-6', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground text-pretty">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

interface SegmentadoProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  label: string;
}

/** Duas ou três opções lado a lado, uma sempre marcada. */
export function Segmentado<T extends string>(props: SegmentadoProps<T>) {
  const { value, onChange, options, label } = props;
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className="gap-0.5 rounded-lg bg-muted p-[3px]"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-auto rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Marca de gargalo: cor e texto, para não depender só da cor. */
export function GargaloBadge() {
  return (
    <span className="rounded bg-warning-subtle px-1.5 py-0.5 text-[11px] font-medium text-warning-emphasis">Gargalo</span>
  );
}
