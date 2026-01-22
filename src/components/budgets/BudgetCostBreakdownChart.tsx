import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { BudgetWithDetails, BudgetCalculation } from '@/types/budget';
import { formatCurrency } from '@/lib/formatters';

interface BudgetCostBreakdownChartProps {
  budget: BudgetWithDetails;
  calculation: BudgetCalculation;
}

const COLORS = {
  subtotal: 'hsl(var(--primary))',
  adminExpenses: 'hsl(var(--chart-2))',
  taxes: 'hsl(var(--chart-3))',
  commission: 'hsl(var(--chart-4))',
  discount: 'hsl(var(--destructive))',
};

export function BudgetCostBreakdownChart({ budget, calculation }: BudgetCostBreakdownChartProps) {
  const chartData = useMemo(() => {
    const data = [
      { name: 'Subtotal (Horas)', value: calculation.subtotal, color: COLORS.subtotal },
      { name: 'Despesas Administrativas', value: calculation.adminExpenses, color: COLORS.adminExpenses },
      { name: 'Impostos', value: calculation.taxes, color: COLORS.taxes },
      { name: 'Comissão', value: calculation.commission, color: COLORS.commission },
    ];

    return data.filter((d) => d.value > 0);
  }, [calculation]);

  const chartConfig = useMemo(() => ({
    subtotal: { label: 'Subtotal (Horas)', color: COLORS.subtotal },
    adminExpenses: { label: 'Despesas Administrativas', color: COLORS.adminExpenses },
    taxes: { label: 'Impostos', color: COLORS.taxes },
    commission: { label: 'Comissão', color: COLORS.commission },
  }), []);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Composição do Valor</CardTitle>
          <CardDescription>Breakdown dos custos do orçamento</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          Nenhum valor para exibir
        </CardContent>
      </Card>
    );
  }

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Composição do Valor</CardTitle>
        <CardDescription>Breakdown dos custos do orçamento</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={100}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{data.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(data.value)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              formatter={(value, entry: any) => (
                <span className="text-sm text-foreground">{entry.payload.name}</span>
              )}
            />
          </PieChart>
        </ChartContainer>

        {calculation.discount > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-destructive">Desconto aplicado ({budget.discount_percent}%)</span>
              <span className="font-medium text-destructive">-{formatCurrency(calculation.discount)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
