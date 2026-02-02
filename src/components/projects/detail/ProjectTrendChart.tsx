import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface ProjectTrendChartProps {
  project: ProjectWithRelations;
  plannedCosts: {
    laborCost: number;
    supplierCost: number;
    materialCost: number;
    monthlyRecurring: number;
    oneTimeCosts: number;
  };
  projectDuration: number;
}

export function ProjectTrendChart({ project, plannedCosts, projectDuration }: ProjectTrendChartProps) {
  const chartData = useMemo(() => {
    const data = [];
    let cumulativePlanned = 0;
    let cumulativeRealized = 0;

    for (let i = 1; i <= projectDuration; i++) {
      // Add material cost on first month
      const monthlyPlanned = plannedCosts.monthlyRecurring + (i === 1 ? plannedCosts.materialCost : 0);
      cumulativePlanned += monthlyPlanned;

      // Simulated realized (would come from actual data)
      // For now, showing 0 as we don't have actual costs yet
      
      data.push({
        name: `M${i}`,
        planejado: cumulativePlanned,
        realizado: cumulativeRealized,
        tendencia: cumulativeRealized > 0 ? cumulativeRealized * (projectDuration / i) : null,
      });
    }

    // Add budget line (contract value)
    const budgetLine = Number(project.total_value);

    return { data, budgetLine };
  }, [plannedCosts, projectDuration, project.total_value]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            entry.value !== null && (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.stroke }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="font-medium">{formatCurrency(entry.value)}</span>
              </div>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Curva de Tendência</CardTitle>
        <CardDescription>
          Custos acumulados com projeção e comparativo com o valor do contrato
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine 
                y={chartData.budgetLine} 
                stroke="hsl(var(--chart-4))" 
                strokeDasharray="5 5"
                label={{ 
                  value: 'Contrato', 
                  position: 'right',
                  fill: 'hsl(var(--chart-4))',
                  fontSize: 12
                }}
              />
              <Line 
                type="monotone" 
                dataKey="planejado" 
                name="Custo Planejado" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-1))' }}
              />
              <Line 
                type="monotone" 
                dataKey="realizado" 
                name="Custo Realizado" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2))' }}
              />
              <Line 
                type="monotone" 
                dataKey="tendencia" 
                name="Tendência" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
