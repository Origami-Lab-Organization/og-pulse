import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from 'recharts';
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

  const { costData, total } = useMemo(() => {
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

    const data = [
      { name: 'Mão de Obra', value: laborCost, color: 'hsl(var(--chart-1))' },
      { name: 'Fornecedores', value: supplierCost, color: 'hsl(var(--chart-2))' },
      { name: 'Materiais', value: materialCost, color: 'hsl(var(--chart-3))' },
    ].filter(item => item.value > 0);

    const totalValue = data.reduce((sum, item) => sum + item.value, 0);

    return { costData: data, total: totalValue };
  }, [project, employees]);

  const chartConfig = {
    'Mão de Obra': { color: 'hsl(var(--chart-1))' },
    'Fornecedores': { color: 'hsl(var(--chart-2))' },
    'Materiais': { color: 'hsl(var(--chart-3))' },
  };

  if (total === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Composição de Custos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] flex items-center justify-center text-muted-foreground">
            Nenhum custo cadastrado
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format total for center label
  const formatTotalShort = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Composição de Custos</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ChartContainer config={chartConfig} className="h-[160px]">
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
                strokeWidth={0}
              >
                {costData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 8}
                            className="fill-muted-foreground text-[10px]"
                          >
                            Total
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 8}
                            className="fill-foreground text-sm font-bold"
                          >
                            {formatTotalShort(total)}
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
              <Tooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {/* Custom Legend */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3">
          {costData.map((item) => {
            const percent = ((item.value / total) * 100).toFixed(0);
            return (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">{item.name}:</span>
                <span className="font-medium">{percent}%</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
