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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { useMaskedCurrency, useHideValues } from '@/contexts/HideValuesContext';
import { BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { useState } from 'react';

export interface MonthlyChartItem {
  month: string;
  monthNum: number;
  planned: number;
  realized: number;
  breakdown: {
    planned: { labor: number; suppliers: number; materials: number };
    realized: { labor: number; suppliers: number; materials: number };
  };
}

export type CostCategoryTarget = 'labor' | 'others';

interface ProjectMonthlyCostChartProps {
  data: MonthlyChartItem[];
  isLoading?: boolean;
  onCategoryClick?: (target: CostCategoryTarget) => void;
}

// Escala monocromática do verde ESCURO da marca (--primary-deep, base
// green-600 do origami-ds) — do tom cheio ao mais suave. Acento único, sem
// paleta arco-íris.
const CATEGORY_COLORS = [
  'hsl(var(--primary-deep))',
  'hsl(var(--primary-deep) / 0.72)',
  'hsl(var(--primary-deep) / 0.48)',
  'hsl(var(--primary-deep) / 0.26)',
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
  const point = payload[0]?.payload as (MonthlyChartItem & { plannedTotal: number; realizedTotal: number }) | undefined;
  const b = point?.breakdown;
  const line = (title: string, total: number, labor: number, others: number) => (
    <div className="mb-1 last:mb-0">
      <p className="font-medium">{title}: {formatCurrency(total)}</p>
      <p className="text-xs text-muted-foreground">
        MO: {formatCurrency(labor)} · Outros: {formatCurrency(others)}
      </p>
    </div>
  );
  return (
    <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-2">{label}</p>
      {b && (
        <>
          {line('Planejado', point!.planned, b.planned.labor, b.planned.suppliers + b.planned.materials)}
          {line('Realizado', point!.realized, b.realized.labor, b.realized.suppliers + b.realized.materials)}
        </>
      )}
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

export function ProjectMonthlyCostChart({ data, isLoading = false, onCategoryClick }: ProjectMonthlyCostChartProps) {
  const formatCurrency = useMaskedCurrency();
  const hideValues = useHideValues();
  const [pieMode, setPieMode] = useState<'realized' | 'planned'>('realized');

  const hasData = data.some(d => d.planned > 0 || d.realized > 0);

  // Achata o breakdown para barras empilhadas: MO + Outros, por planejado e realizado.
  const stackedData = data.map((d) => ({
    ...d,
    plannedLabor: d.breakdown.planned.labor,
    plannedOthers: d.breakdown.planned.suppliers + d.breakdown.planned.materials,
    realizedLabor: d.breakdown.realized.labor,
    realizedOthers: d.breakdown.realized.suppliers + d.breakdown.realized.materials,
  }));

  // Acumula os totais por categoria para os dois modos do donut.
  const totals = data.reduce(
    (acc, d) => ({
      planned: {
        labor:     acc.planned.labor     + d.breakdown.planned.labor,
        suppliers: acc.planned.suppliers + d.breakdown.planned.suppliers,
        materials: acc.planned.materials + d.breakdown.planned.materials,
      },
      realized: {
        labor:     acc.realized.labor     + d.breakdown.realized.labor,
        suppliers: acc.realized.suppliers + d.breakdown.realized.suppliers,
        materials: acc.realized.materials + d.breakdown.realized.materials,
      },
    }),
    {
      planned: { labor: 0, suppliers: 0, materials: 0 },
      realized: { labor: 0, suppliers: 0, materials: 0 },
    }
  );

  const pieData = (
    pieMode === 'realized'
      ? [
          { name: 'Mão de Obra',  value: totals.realized.labor,     color: CATEGORY_COLORS[0] },
          { name: 'Fornecedores', value: totals.realized.suppliers, color: CATEGORY_COLORS[1] },
          { name: 'Materiais',    value: totals.realized.materials, color: CATEGORY_COLORS[2] },
        ]
      : [
          { name: 'Mão de Obra',  value: totals.planned.labor,     color: CATEGORY_COLORS[0] },
          { name: 'Fornecedores', value: totals.planned.suppliers, color: CATEGORY_COLORS[1] },
          { name: 'Materiais',    value: totals.planned.materials, color: CATEGORY_COLORS[2] },
        ]
  ).filter(item => item.value > 0);

  const pieTotal = pieData.reduce((sum, item) => sum + item.value, 0);
  const pieCenterLabel = pieMode === 'realized' ? 'Realizado' : 'Planejado';

  const categoryTarget = (name: string): CostCategoryTarget => (name === 'Mão de Obra' ? 'labor' : 'others');

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
                <BarChart data={stackedData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
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
                  <Tooltip content={(props) => <BarTooltip {...props} formatCurrency={formatCurrency} />} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                  <Legend iconType="circle" iconSize={8} />
                  {/* Planejado (tons neutros) e Realizado (verde da marca),
                      cada um empilhado por Mão de Obra + Outros custos. */}
                  <Bar stackId="planned" dataKey="plannedLabor"  name="Planejado · MO"     fill="hsl(var(--muted-foreground) / 0.55)" radius={[0, 0, 0, 0]} />
                  <Bar stackId="planned" dataKey="plannedOthers" name="Planejado · Outros"  fill="hsl(var(--muted-foreground) / 0.25)" radius={[4, 4, 0, 0]} />
                  <Bar stackId="realized" dataKey="realizedLabor"  name="Realizado · MO"     fill="hsl(var(--primary-deep))" radius={[0, 0, 0, 0]} />
                  <Bar stackId="realized" dataKey="realizedOthers" name="Realizado · Outros"  fill="hsl(var(--primary-deep) / 0.45)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pie chart — right */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <PieChartIcon className="h-4 w-4" />
            Breakdown por categoria
          </CardTitle>
          <ToggleGroup
            type="single"
            size="sm"
            value={pieMode}
            onValueChange={(v) => {
              if (v === 'realized' || v === 'planned') setPieMode(v);
            }}
            aria-label="Alternar entre custo planejado e realizado"
          >
            <ToggleGroupItem value="planned" className="h-7 px-2 text-xs">
              Planejado
            </ToggleGroupItem>
            <ToggleGroupItem value="realized" className="h-7 px-2 text-xs">
              Realizado
            </ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <PieChartIcon className="h-8 w-8 opacity-30" />
              <p className="text-sm text-center">
                {pieMode === 'realized'
                  ? 'Sem custos realizados no período'
                  : 'Sem custos planejados no período'}
              </p>
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
                      onClick={onCategoryClick ? (entry: { name?: string }) => onCategoryClick(categoryTarget(entry?.name ?? '')) : undefined}
                      className={onCategoryClick ? 'cursor-pointer' : undefined}
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
                                  {pieCenterLabel}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 8}
                                  className="fill-foreground text-sm font-bold"
                                >
                                  {hideValues ? '•••••' : formatShort(pieTotal)}
                                </tspan>
                              </text>
                            );
                          }
                          return null;
                        }}
                      />
                    </Pie>
                    <Tooltip content={(props) => <PieTooltip {...props} totalRealized={pieTotal} formatCurrency={formatCurrency} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                {pieData.map((item) => {
                  const percent = ((item.value / pieTotal) * 100).toFixed(0);
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={onCategoryClick ? () => onCategoryClick(categoryTarget(item.name)) : undefined}
                      disabled={!onCategoryClick}
                      className={cn(
                        'flex items-center justify-between rounded px-1 py-0.5 text-xs transition-colors',
                        onCategoryClick ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default',
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">
                        {hideValues ? '•••' : `${percent}%`}
                      </span>
                    </button>
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
