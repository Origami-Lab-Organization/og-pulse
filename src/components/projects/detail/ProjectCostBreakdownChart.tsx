import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { useEmployees } from '@/hooks/useEmployees';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface ProjectCostBreakdownChartProps {
  project: ProjectWithRelations;
}

const HOURS_PER_MONTH = 176;

export function ProjectCostBreakdownChart({ project }: ProjectCostBreakdownChartProps) {
  const { data: employees = [] } = useEmployees();

  const costData = useMemo(() => {
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

    // Calculate supplier cost (monthly * duration)
    const supplierCost = (project.suppliers || []).reduce((acc, supplier) => {
      const months = supplier.end_month 
        ? supplier.end_month - supplier.start_month + 1 
        : 12;
      return acc + Number(supplier.monthly_value || 0) * months;
    }, 0);

    // Calculate materials cost
    const materialCost = (project.materials || []).reduce(
      (acc, material) => acc + Number(material.value || 0),
      0
    );

    return [
      { name: 'Mão de Obra', value: laborCost },
      { name: 'Fornecedores', value: supplierCost },
      { name: 'Materiais', value: materialCost },
    ].filter(item => item.value > 0);
  }, [project, employees]);

  const total = costData.reduce((sum, item) => sum + item.value, 0);

  const chartConfig = {
    'Mão de Obra': { color: 'hsl(var(--chart-1))' },
    'Fornecedores': { color: 'hsl(var(--chart-4))' },
    'Materiais': { color: 'hsl(var(--chart-3))' },
  };

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-3))',
  ];

  if (total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Composição de Custos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Nenhum custo cadastrado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Composição de Custos</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={costData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {costData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="text-center mt-2">
          <p className="text-xs text-muted-foreground">Total Planejado</p>
          <p className="text-lg font-semibold">{formatCurrency(total)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
