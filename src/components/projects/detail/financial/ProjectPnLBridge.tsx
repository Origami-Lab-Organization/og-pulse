import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { PnLMode, PnLValues } from '@/types/projectPnL';

interface ProjectPnLBridgeProps {
  /** Contrato, comissão planejada e custos planejados. */
  projected: PnLValues;
  /** Receita recebida, comissão paga e custos realizados (US-0033). */
  realized: PnLValues;
  /** Valor do contrato: base das barras nas duas versões, para compará-las. */
  contract: number;
}

interface BridgeRowProps {
  label: string;
  amount: number;
  /** Largura da barra em % (proporcional ao contrato). */
  widthPercent: number;
  barClassName: string;
  signed?: boolean;
  emphasis?: boolean;
  /** Resultado negativo: sinal e destaque negativo. */
  negative?: boolean;
  format: (v: number) => string;
}

function BridgeRow({
  label,
  amount,
  widthPercent,
  barClassName,
  signed,
  emphasis,
  negative,
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
            ? cn('font-bold', negative ? 'text-destructive' : 'text-primary-deep')
            : signed
              ? 'font-semibold text-muted-foreground'
              : 'font-semibold text-foreground',
        )}
      >
        {signed || negative ? '−' : ''}
        {format(Math.abs(amount))}
      </span>
    </div>
  );
}

const MODE_TEXT: Record<PnLMode, { title: string; revenue: string; commission: string; footer: string }> = {
  projected: {
    title: 'projetado',
    revenue: 'Contrato',
    commission: 'Comissão',
    footer: 'valores do plano · realizado até hoje no gráfico ao lado',
  },
  realized: {
    title: 'realizado',
    revenue: 'Recebido',
    commission: 'Comissão paga',
    footer: 'parcelas recebidas, comissão paga e custos lançados até hoje',
  },
};

/** P&L do projeto com seletor Projetado / Realizado (US-0033), no padrão da rosca de Despesas. */
export function ProjectPnLBridge({ projected, realized, contract }: ProjectPnLBridgeProps) {
  const formatCurrency = useMaskedCurrency();
  const [mode, setMode] = useState<PnLMode>('projected');
  const values = mode === 'projected' ? projected : realized;
  const text = MODE_TEXT[mode];
  const result = values.revenue - values.commission - values.labor - values.other;
  const base = contract > 0 ? contract : 1;
  const pct = (v: number) => (Math.abs(v) / base) * 100;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="ui-label text-muted-foreground">P&amp;L do projeto · {text.title}</p>
        <ToggleGroup
          type="single"
          size="sm"
          value={mode}
          onValueChange={(v) => {
            if (v === 'projected' || v === 'realized') setMode(v);
          }}
          aria-label="Alternar o P&L entre projetado e realizado"
        >
          <ToggleGroupItem value="projected" className="h-7 px-2 text-xs">
            Projetado
          </ToggleGroupItem>
          <ToggleGroupItem value="realized" className="h-7 px-2 text-xs">
            Realizado
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        <BridgeRow
          label={text.revenue}
          amount={values.revenue}
          widthPercent={pct(values.revenue)}
          barClassName="bg-[hsl(var(--brand-slate))]"
          format={formatCurrency}
        />
        <BridgeRow
          label={text.commission}
          amount={values.commission}
          widthPercent={pct(values.commission)}
          barClassName="bg-muted-foreground"
          signed
          format={formatCurrency}
        />
        <BridgeRow
          label="Mão de obra"
          amount={values.labor}
          widthPercent={pct(values.labor)}
          barClassName="bg-muted-foreground"
          signed
          format={formatCurrency}
        />
        <BridgeRow
          label="Outras despesas"
          amount={values.other}
          widthPercent={pct(values.other)}
          barClassName="bg-border"
          signed
          format={formatCurrency}
        />
        <BridgeRow
          label="Resultado"
          amount={result}
          widthPercent={pct(result)}
          barClassName={result < 0 ? 'bg-destructive' : 'bg-primary'}
          emphasis
          negative={result < 0}
          format={formatCurrency}
        />
      </div>
      <p className="mt-3.5 text-[11px] text-muted-foreground">{text.footer}</p>
    </div>
  );
}
