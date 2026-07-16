import { cn } from '@/lib/utils';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';

interface ProjectPnLBridgeProps {
  contract: number;
  commission: number;
  labor: number;
  other: number;
}

interface BridgeRowProps {
  label: string;
  amount: number;
  /** Largura da barra em % (proporcional ao contrato). */
  widthPercent: number;
  barClassName: string;
  signed?: boolean;
  emphasis?: boolean;
  format: (v: number) => string;
}

function BridgeRow({
  label,
  amount,
  widthPercent,
  barClassName,
  signed,
  emphasis,
  format,
}: BridgeRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5',
        emphasis && 'border-t border-[hsl(var(--muted))] pt-2.5',
      )}
    >
      <span
        className={cn(
          'w-24 flex-none text-xs',
          emphasis ? 'font-bold text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      <div className="flex flex-1 items-center">
        <div
          className={cn('h-[18px] rounded', barClassName)}
          style={{ width: `${Math.max(2, Math.min(100, widthPercent))}%` }}
        />
      </div>
      <span
        className={cn(
          'w-[86px] flex-none text-right font-mono text-[12.5px] tabular-nums',
          emphasis
            ? 'font-bold text-primary-deep'
            : signed
              ? 'font-semibold text-muted-foreground'
              : 'font-semibold text-foreground',
        )}
      >
        {signed ? '−' : ''}
        {format(amount)}
      </span>
    </div>
  );
}

export function ProjectPnLBridge({
  contract,
  commission,
  labor,
  other,
}: ProjectPnLBridgeProps) {
  const formatCurrency = useMaskedCurrency();
  const result = contract - commission - labor - other;
  const base = contract > 0 ? contract : 1;
  const pct = (v: number) => (v / base) * 100;

  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="ui-label text-muted-foreground">P&amp;L do projeto · projetado</p>
      <div className="mt-4 flex flex-col gap-2.5">
        <BridgeRow
          label="Contrato"
          amount={contract}
          widthPercent={100}
          barClassName="bg-[hsl(var(--brand-slate))]"
          format={formatCurrency}
        />
        <BridgeRow
          label="Comissão"
          amount={commission}
          widthPercent={pct(commission)}
          barClassName="bg-muted-foreground"
          signed
          format={formatCurrency}
        />
        <BridgeRow
          label="Mão de obra"
          amount={labor}
          widthPercent={pct(labor)}
          barClassName="bg-muted-foreground"
          signed
          format={formatCurrency}
        />
        <BridgeRow
          label="Outras despesas"
          amount={other}
          widthPercent={pct(other)}
          barClassName="bg-border"
          signed
          format={formatCurrency}
        />
        <BridgeRow
          label="Resultado"
          amount={result}
          widthPercent={pct(result)}
          barClassName="bg-primary"
          emphasis
          format={formatCurrency}
        />
      </div>
      <p className="mt-3.5 text-[11px] text-muted-foreground">
        valores do plano · realizado até hoje no gráfico ao lado
      </p>
    </div>
  );
}
