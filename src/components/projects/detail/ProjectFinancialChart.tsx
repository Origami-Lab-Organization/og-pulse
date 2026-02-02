import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ProjectFinancialChartProps {
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

export function ProjectFinancialChart({ project, plannedCosts, projectDuration }: ProjectFinancialChartProps) {
  const chartData = useMemo(() => {
    const data = [];
    const materialCostPerMonth = plannedCosts.materialCost / projectDuration;

    for (let i = 1; i <= projectDuration; i++) {
      data.push({
        name: `Mês ${i}`,
        planejado: plannedCosts.monthlyRecurring + (i === 1 ? plannedCosts.materialCost : 0),
        realizado: 0, // Would come from project_costs_actual table
        laborCost: plannedCosts.laborCost,
        supplierCost: plannedCosts.supplierCost,
        materialCost: i === 1 ? plannedCosts.materialCost : 0,
      });
    }

    return data;
  }, [plannedCosts, projectDuration]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planejado vs Realizado</CardTitle>
        <CardDescription>
          Comparativo mensal de custos planejados e realizados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              <Bar 
                dataKey="planejado" 
                name="Planejado" 
                fill="hsl(var(--chart-1))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="realizado" 
                name="Realizado" 
                fill="hsl(var(--chart-2))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
