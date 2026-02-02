import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { BudgetWithDetails } from '@/types/budget';

interface BudgetHoursChartProps {
  budget: BudgetWithDetails;
}

const COLORS = [
  'hsl(var(--chart-1))',  // Pine Teal
  'hsl(var(--chart-2))',  // Celadon
  'hsl(var(--chart-3))',  // Amber Gold
  'hsl(var(--chart-4))',  // Magenta Bloom
  'hsl(var(--chart-5))',  // Rich Cerulean
];

export function BudgetHoursChart({ budget }: BudgetHoursChartProps) {
  const chartData = useMemo(() => {
    const data: { month: string; [key: string]: number | string }[] = [];

    for (let i = 1; i <= budget.duration_months; i++) {
      const monthData: { month: string; [key: string]: number | string } = { month: `Mês ${i}` };
      
      budget.roles.forEach((role) => {
        const monthHours = role.months.find((m) => m.month_number === i);
        const key = `${role.role_name} (${role.seniority})`;
        monthData[key] = monthHours?.hours || 0;
      });
      
      data.push(monthData);
    }

    return data;
  }, [budget]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    budget.roles.forEach((role, index) => {
      const key = `${role.role_name} (${role.seniority})`;
      config[key] = {
        label: key,
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [budget]);

  const roleKeys = budget.roles.map((r) => `${r.role_name} (${r.seniority})`);

  if (budget.roles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alocação de Horas por Mês</CardTitle>
          <CardDescription>Distribuição de horas por papel ao longo do projeto</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          Nenhum papel alocado
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alocação de Horas por Mês</CardTitle>
        <CardDescription>Distribuição de horas por papel ao longo do projeto</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {roleKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="hours"
                fill={COLORS[index % COLORS.length]}
                radius={index === roleKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
