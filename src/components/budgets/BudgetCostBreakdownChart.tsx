import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Legend } from 'recharts';
import { BudgetWithDetails, BudgetCalculation } from '@/types/budget';
import { formatCurrency } from '@/lib/formatters';

interface BudgetCostBreakdownChartProps {
  budget: BudgetWithDetails;
  calculation: BudgetCalculation;
}

const COLORS = {
  laborCost: 'hsl(var(--chart-1))',     // Pine Teal
  suppliers: 'hsl(var(--chart-2))',     // Celadon
  materials: 'hsl(var(--chart-3))',     // Amber Gold
  adminExpenses: 'hsl(var(--chart-4))', // Magenta Bloom
  taxes: 'hsl(var(--chart-5))',         // Rich Cerulean
  commission: 'hsl(160 47% 30%)',       // Variação Pine Teal
  netMargin: 'hsl(145 55% 55%)',        // Variação Celadon
  discount: 'hsl(var(--destructive))',  // Vermelho para desconto
};

export function BudgetCostBreakdownChart({ budget, calculation }: BudgetCostBreakdownChartProps) {
  const chartData = useMemo(() => {
    const data = [
      { name: 'Mão de Obra', value: calculation.laborCost, color: COLORS.laborCost },
      { name: 'Fornecedores', value: calculation.suppliersTotal, color: COLORS.suppliers },
      { name: 'Materiais', value: calculation.materialsTotal, color: COLORS.materials },
      { name: 'Despesas Adm.', value: calculation.adminExpenses, color: COLORS.adminExpenses },
      { name: 'Impostos', value: calculation.taxes, color: COLORS.taxes },
      { name: 'Comissão', value: calculation.commission, color: COLORS.commission },
      { name: 'Margem Líquida', value: calculation.netMargin, color: COLORS.netMargin },
    ];

    return data.filter((d) => d.value > 0);
  }, [calculation]);

  const chartConfig = useMemo(() => ({
    laborCost: { label: 'Mão de Obra', color: COLORS.laborCost },
    suppliers: { label: 'Fornecedores', color: COLORS.suppliers },
    materials: { label: 'Materiais', color: COLORS.materials },
    adminExpenses: { label: 'Despesas Administrativas', color: COLORS.adminExpenses },
    taxes: { label: 'Impostos', color: COLORS.taxes },
    commission: { label: 'Comissão', color: COLORS.commission },
    netMargin: { label: 'Margem Líquida', color: COLORS.netMargin },
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

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
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
              <span className="text-sm text-destructive">Desconto aplicado</span>
              <span className="font-medium text-destructive">-{formatCurrency(calculation.discount)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
