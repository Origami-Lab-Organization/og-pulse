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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { COST_CATEGORIES } from '@/lib/projectCosts';
import { bucketOthers } from '@/lib/projectMonthlyCosts';
import type { ProjectCostMonth } from '@/types/projectCostSummary';

export type CostCategoryTarget = 'labor' | 'others';

interface ProjectMonthlyCostChartProps {
  /** Meses de calendário do custo do projeto (`useProjectCostSummary().months`). */
  months: ProjectCostMonth[];
  isLoading?: boolean;
  onCategoryClick?: (target: CostCategoryTarget) => void;
}

interface ChartPoint {
  month: string;
  outOfPeriod: boolean;
  planned: number;
  realized: number;
  plannedLabor: number;
  plannedOthers: number;
  realizedLabor: number;
  realizedOthers: number;
}

// Escala monocromática do verde ESCURO da marca (--primary-deep, base
// green-600 do origami-ds) — do tom cheio ao mais suave. Acento único, sem
// paleta arco-íris. Mão de Obra no tom cheio; as categorias do ledger seguem.
const CATEGORY_ALPHAS = [1, 0.72, 0.56, 0.42, 0.3, 0.22, 0.16, 0.11];
const categoryColor = (index: number) =>
  `hsl(var(--primary-deep) / ${CATEGORY_ALPHAS[Math.min(index, CATEGORY_ALPHAS.length - 1)]})`;

const LABOR_KEY = 'labor';

function toChartPoint(month: ProjectCostMonth): ChartPoint {
  const plannedOthers = bucketOthers(month.planned);
  const realizedOthers = bucketOthers(month.realized);
  return {
    month: format(month.date, 'MMM yyyy', { locale: ptBR }),
    outOfPeriod: month.outOfPeriod,
    planned: month.planned.labor + plannedOthers,
    realized: month.realized.labor + realizedOthers,
    plannedLabor: month.planned.labor,
    plannedOthers,
    realizedLabor: month.realized.labor,
    realizedOthers,
  };
}

/** Fatias da rosca: Mão de Obra e cada categoria do ledger com valor, no modo escolhido. */
function buildPieData(months: ProjectCostMonth[], mode: 'realized' | 'planned') {
  const slices = [
    { categoryKey: LABOR_KEY, name: 'Mão de Obra', value: months.reduce((sum, m) => sum + m[mode].labor, 0) },
    ...COST_CATEGORIES.map((category) => ({
      categoryKey: category.value as string,
      name: category.label,
      value: months.reduce((sum, m) => sum + (m[mode].byCategory[category.value] ?? 0), 0),
    })),
  ];
  return slices
    .filter((slice) => slice.value > 0)
    .map((slice, index) => ({ ...slice, color: categoryColor(index) }));
}

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
  const point = payload[0]?.payload as ChartPoint | undefined;
  if (!point) return null;
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
      <p className="font-medium">{label}</p>
      {point.outOfPeriod && (
        <p className="text-xs text-muted-foreground">Fora do período do projeto</p>
      )}
      <div className="mt-2">
        {line('Planejado', point.planned, point.plannedLabor, point.plannedOthers)}
        {line('Realizado', point.realized, point.realizedLabor, point.realizedOthers)}
      </div>
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

export function ProjectMonthlyCostChart({ months, isLoading = false, onCategoryClick }: ProjectMonthlyCostChartProps) {
  const formatCurrency = useMaskedCurrency();
  const hideValues = useHideValues();
  const [pieMode, setPieMode] = useState<'realized' | 'planned'>('realized');

  const stackedData = months.map(toChartPoint);
  const hasData = stackedData.some((d) => d.planned > 0 || d.realized > 0);

  const pieData = buildPieData(months, pieMode);
  const pieTotal = pieData.reduce((sum, item) => sum + item.value, 0);
  const pieCenterLabel = pieMode === 'realized' ? 'Realizado' : 'Planejado';

  const categoryTarget = (key: string): CostCategoryTarget => (key === LABOR_KEY ? 'labor' : 'others');

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
                      onClick={onCategoryClick ? (entry: { categoryKey?: string }) => onCategoryClick(categoryTarget(entry?.categoryKey ?? '')) : undefined}
                      className={onCategoryClick ? 'cursor-pointer' : undefined}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.categoryKey} fill={entry.color} />
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
                      key={item.categoryKey}
                      type="button"
                      onClick={onCategoryClick ? () => onCategoryClick(categoryTarget(item.categoryKey)) : undefined}
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
