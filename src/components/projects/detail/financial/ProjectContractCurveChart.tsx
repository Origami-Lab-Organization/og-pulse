import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useMaskedCurrency, useHideValues } from '@/contexts/HideValuesContext';

export interface ContractCurvePoint {
  name: string;
  /** Receita acumulada realizada (até hoje). */
  revenue: number | null;
  /** Receita acumulada projetada (de hoje ao fim). */
  revenueProj: number | null;
  /** Custo acumulado realizado (até hoje). */
  cost: number | null;
  /** Custo acumulado projetado (de hoje ao fim). */
  costProj: number | null;
}

interface ProjectContractCurveChartProps {
  data: ContractCurvePoint[];
  contractValue: number;
  todayLabel: string | null;
  insight: string;
}

const SERIES_LABELS: Record<string, string> = {
  revenue: 'Receita',
  revenueProj: 'Receita (projeção)',
  cost: 'Custo',
  costProj: 'Custo (projeção)',
};

export function ProjectContractCurveChart({
  data,
  contractValue,
  todayLabel,
  insight,
}: ProjectContractCurveChartProps) {
  const formatCurrency = useMaskedCurrency();
  const hideValues = useHideValues();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const seen = new Set<string>();
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="mb-2 font-medium">{label}</p>
        {payload.map((entry: any, i: number) => {
          const key = entry.dataKey.replace('Proj', '');
          if (entry.value == null || seen.has(key)) return null;
          seen.add(key);
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.stroke }}
              />
              <span className="text-muted-foreground">{SERIES_LABELS[key]}:</span>
              <span className="font-mono font-medium tabular-nums">
                {formatCurrency(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="ui-label text-muted-foreground">
          Curva do contrato · receita × custo acumulados
        </p>
        <div className="flex flex-wrap gap-3.5 text-[10.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-primary" />
            Receita
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-muted-foreground" />
            Custo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-2.5 bg-border" />
            Contrato
          </span>
          <span>⋯ projeção</span>
        </div>
      </div>

      <div className="mt-3 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis
              tickFormatter={(v) => (hideValues ? '•••' : `R$ ${(v / 1000).toFixed(0)}k`)}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={54}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={contractValue}
              stroke="hsl(var(--border))"
              strokeWidth={1.5}
              label={{
                value: `contrato ${hideValues ? '•••' : formatCurrency(contractValue)}`,
                position: 'insideTopLeft',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 10,
              }}
            />
            {todayLabel && (
              <ReferenceLine
                x={todayLabel}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                label={{
                  value: 'hoje',
                  position: 'insideBottomRight',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 10,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="revenueProj"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="costProj"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 rounded-lg bg-primary/10 px-3.5 py-2.5 text-[11.5px] font-semibold text-primary-deep">
        {insight}
      </div>
    </div>
  );
}
