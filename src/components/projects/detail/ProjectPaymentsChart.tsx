import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface ProjectPaymentsChartProps {
  project: ProjectWithRelations;
}

export function ProjectPaymentsChart({ project }: ProjectPaymentsChartProps) {
  const paymentData = useMemo(() => {
    const installments = project.installments || [];
    
    const received = installments
      .filter((i) => i.status === 'received')
      .reduce((sum, i) => sum + Number(i.value), 0);
    
    const overdue = installments
      .filter((i) => i.status === 'overdue')
      .reduce((sum, i) => sum + Number(i.value), 0);
    
    const pending = installments
      .filter((i) => i.status === 'pending' || i.status === 'invoiced')
      .reduce((sum, i) => sum + Number(i.value), 0);

    return [
      { name: 'Recebido', value: received, color: 'hsl(var(--chart-2))' },
      { name: 'Pendente', value: pending, color: 'hsl(var(--chart-3))' },
      { name: 'Atrasado', value: overdue, color: 'hsl(var(--chart-5))' },
    ].filter(item => item.value > 0);
  }, [project.installments]);

  const chartConfig = {
    'Recebido': { color: 'hsl(var(--chart-2))' },
    'Pendente': { color: 'hsl(var(--chart-3))' },
    'Atrasado': { color: 'hsl(var(--chart-5))' },
  };

  if (paymentData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recebimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Nenhuma parcela cadastrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Recebimentos</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={paymentData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis
                type="number"
                tickFormatter={(value) => formatCurrency(value)}
                fontSize={10}
              />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {paymentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="flex justify-between mt-4 text-xs">
          {paymentData.map((item) => (
            <div key={item.name} className="text-center">
              <div
                className="w-3 h-3 rounded-full mx-auto mb-1"
                style={{ backgroundColor: item.color }}
              />
              <p className="text-muted-foreground">{item.name}</p>
              <p className="font-medium">{formatCurrency(item.value)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
