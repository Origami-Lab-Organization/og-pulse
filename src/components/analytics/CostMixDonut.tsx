import { useMemo } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { useHideValues } from '@/contexts/HideValuesContext';

const COLORS = [
  'hsl(var(--primary-deep))',
  'hsl(var(--primary-deep) / 0.72)',
  'hsl(var(--primary-deep) / 0.48)',
  'hsl(var(--primary-deep) / 0.26)',
  'hsl(var(--primary-deep) / 0.15)',
];

interface Props {
  laborCost: number;
  supplierCost: number;
  materialCost: number;
  commissionCost: number;
}

function makeDonutTooltip(hideValues: boolean) {
  return function DonutTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const entry = payload[0];
    return (
      <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: entry.payload.fill }} />
          <span className="font-medium">{entry.name}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-4">
          <span className="text-muted-foreground">
            {hideValues ? '•••' : formatPercent((entry.payload.percent ?? 0) * 100)}
          </span>
          <span className="font-mono font-semibold tabular-nums">
            {hideValues ? '•••••' : formatCurrency(entry.value)}
          </span>
        </div>
      </div>
    );
  };
}

export function CostMixDonut({ laborCost, supplierCost, materialCost, commissionCost }: Props) {
  const hideValues = useHideValues();
  const items = useMemo(() => {
    const raw = [
      { name: 'Mão de Obra', value: laborCost },
      { name: 'Fornecedores', value: supplierCost },
      { name: 'Materiais', value: materialCost },
      { name: 'Comissões', value: commissionCost },
    ];
    return raw
      .filter(d => d.value > 0)
      .map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }));
  }, [laborCost, supplierCost, materialCost, commissionCost]);

  const total = useMemo(() => items.reduce((s, i) => s + i.value, 0), [items]);

  const chartConfig = useMemo(
    () => items.reduce((acc, item) => { acc[item.name] = { label: item.name, color: item.fill }; return acc; }, {} as ChartConfig),
    [items],
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Mix de Custos</CardTitle>
        <CardDescription className="text-xs">Distribuição por natureza de custo</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sem dados no período.</p>
        ) : (
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="w-full lg:w-3/5 flex-shrink-0">
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <PieChart>
                  <Pie
                    data={items}
                    cx="50%"
                    cy="50%"
                    innerRadius="38%"
                    outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                    label={false}
                  >
                    {items.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={makeDonutTooltip(hideValues)} />
                  <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill="currentColor">
                    {hideValues ? '•••' : total >= 1_000_000
                      ? `R$${(total / 1_000_000).toFixed(1)}M`
                      : total >= 1000
                        ? `R$${Math.round(total / 1000)}k`
                        : formatCurrency(total)}
                  </text>
                  <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central" fontSize={11} fill="gray">
                    Custos
                  </text>
                </PieChart>
              </ChartContainer>
            </div>
            <div className="w-full lg:w-2/5 flex flex-col gap-2">
              {items.map((item, i) => {
                const pct = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: item.fill }} />
                    <span className="truncate flex-1">{item.name}</span>
                    <span className="text-muted-foreground tabular-nums text-xs font-medium">{hideValues ? '•••' : formatPercent(pct)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
