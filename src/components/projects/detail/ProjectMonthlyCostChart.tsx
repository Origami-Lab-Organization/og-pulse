import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMaskedCurrency, useHideValues } from '@/contexts/HideValuesContext';
import { BarChart2, PieChart as PieChartIcon } from 'lucide-react';

export interface MonthlyChartItem {
  month: string;
  monthNum: number;
  planned: number;
  realized: number;
  breakdown: {
    planned: { labor: number; suppliers: number; materials: number };
    realized: { labor: number; suppliers: number; materials: number; reimbursements: number };
  };
}

interface ProjectMonthlyCostChartProps {
  data: MonthlyChartItem[];
  isLoading?: boolean;
}

const CATEGORY_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

function formatShort(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `R$ ${(value / 1_000).toFixed(1)}k`;
  return `R$ ${value.toFixed(0)}`;
}

// Tooltips fora do componente pai para manter referência estável e não
// resetar as animações de entrada do Recharts a cada re-render
function BarTooltip({
  active, payload, label, formatCurrency,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatCurrency: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({
  active, payload, totalRealized, formatCurrency,
}: {
  active?: boolean;
  payload?: any[];
  totalRealized: number;
  formatCurrency: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const percent = totalRealized > 0 ? ((item.value / totalRealized) * 100).toFixed(1) : '0';
  return (
    <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{item.name}</p>
      <p>{formatCurrency(item.value)}</p>
      <p className="text-muted-foreground">{percent}% do total</p>
    </div>
  );
}

export function ProjectMonthlyCostChart({ data, isLoading = false }: ProjectMonthlyCostChartProps) {
  const formatCurrency = useMaskedCurrency();
  const hideValues = useHideValues();

  const hasData = data.some(d => d.planned > 0 || d.realized > 0);

  // Accumulated totals for the pie chart
  const totals = data.reduce(
    (acc, d) => ({
      labor:          acc.labor          + d.breakdown.realized.labor,
      suppliers:      acc.suppliers      + d.breakdown.realized.suppliers,
      materials:      acc.materials      + d.breakdown.realized.materials,
      reimbursements: acc.reimbursements + d.breakdown.realized.reimbursements,
    }),
    { labor: 0, suppliers: 0, materials: 0, reimbursements: 0 }
  );

  const pieData = [
    { name: 'Mão de Obra',  value: totals.labor,          color: CATEGORY_COLORS[0] },
    { name: 'Fornecedores', value: totals.suppliers,      color: CATEGORY_COLORS[1] },
    { name: 'Materiais',    value: totals.materials,      color: CATEGORY_COLORS[2] },
    { name: 'Reembolsos',   value: totals.reimbursements, color: CATEGORY_COLORS[3] },
  ].filter(item => item.value > 0);

  const totalRealized = pieData.reduce((sum, item) => sum + item.value, 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6"><Skeleton className="h-[280px] w-full" /></CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6"><Skeleton className="h-[280px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Bar chart — left */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart2 className="h-4 w-4" />
            Planejado vs realizado por mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <BarChart2 className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhum dado de custo para o período</p>
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      hideValues ? '•••' : `R$ ${(v / 1000).toFixed(0)}k`
                    }
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    width={65}
                  />
                  <Tooltip content={(props) => <BarTooltip {...props} formatCurrency={formatCurrency} />} />
                  <Legend />
                  <Bar dataKey="planned"  name="Planejado" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realized" name="Realizado"  fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pie chart — right */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <PieChartIcon className="h-4 w-4" />
            Breakdown por categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <PieChartIcon className="h-8 w-8 opacity-30" />
              <p className="text-sm text-center">Sem custos realizados no período</p>
            </div>
          ) : (
            <>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) - 8}
                                  className="fill-muted-foreground text-[10px]"
                                >
                                  Realizado
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 8}
                                  className="fill-foreground text-sm font-bold"
                                >
                                  {hideValues ? '•••••' : formatShort(totalRealized)}
                                </tspan>
                              </text>
                            );
                          }
                          return null;
                        }}
                      />
                    </Pie>
                    <Tooltip content={(props) => <PieTooltip {...props} totalRealized={totalRealized} formatCurrency={formatCurrency} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                {pieData.map((item) => {
                  const percent = ((item.value / totalRealized) * 100).toFixed(0);
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">
                        {hideValues ? '•••' : `${percent}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
