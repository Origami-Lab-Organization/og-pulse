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
import { useEmployees } from '@/hooks/useEmployees';
import { differenceInMonths, parseISO } from 'date-fns';

interface ProjectTrendChartProps {
  project: ProjectWithRelations;
}

const HOURS_PER_MONTH = 176;

export function ProjectTrendChart({ project }: ProjectTrendChartProps) {
  const { data: employees = [] } = useEmployees();

  const chartData = useMemo(() => {
    // Calculate project duration
    const startDate = parseISO(project.start_date);
    const endDate = project.end_date ? parseISO(project.end_date) : null;
    const projectDuration = endDate 
      ? differenceInMonths(endDate, startDate) + 1 
      : 12; // Default to 12 months if continuous

    // Calculate labor cost
    const laborCost = (project.members || []).reduce((acc, member) => {
      const employee = employees.find((e) => e.id === member.employee_id);
      if (!employee) return acc;
      const totalCost =
        employee.salarioMensal +
        employee.beneficios +
        employee.encargos +
        (employee.totalToolsCost || 0);
      const hourlyCost = totalCost / HOURS_PER_MONTH;
      return acc + hourlyCost * Number(member.hours_per_month || 0);
    }, 0);

    // Calculate supplier cost (monthly average)
    const supplierCost = (project.suppliers || []).reduce(
      (acc, supplier) => acc + Number(supplier.monthly_value || 0),
      0
    );

    // Calculate materials cost (one-time)
    const materialCost = (project.materials || []).reduce(
      (acc, material) => acc + Number(material.value || 0),
      0
    );

    const monthlyRecurring = laborCost + supplierCost;

    const data = [];
    let cumulativePlanned = 0;
    let cumulativeRealized = 0;

    for (let i = 1; i <= projectDuration; i++) {
      // Add material cost on first month
      const monthlyPlanned = monthlyRecurring + (i === 1 ? materialCost : 0);
      cumulativePlanned += monthlyPlanned;

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
  }, [project, employees]);

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

  if (chartData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Curva de Tendência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Dados insuficientes para gerar o gráfico
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Curva de Tendência</CardTitle>
        <CardDescription>
          Custos acumulados com projeção e comparativo com o valor do contrato
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
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
