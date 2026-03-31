import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatCurrency } from '@/lib/formatters';
import type { MonthlyPoint } from '@/hooks/useYearlyEvolution';
import type { FinancialMonthlyPoint } from '@/hooks/useFinancialEvolution';

const chartConfig = {
  hoursCapacity: { label: 'Capacidade', color: 'hsl(0, 0%, 80%)' },
  hoursPlanned: { label: 'Planejado', color: 'hsl(38, 85%, 52%)' },
  hoursReal: { label: 'Realizado', color: 'hsl(220, 70%, 50%)' },
} satisfies ChartConfig;

interface TooltipRow {
  name: string;
  fill: string;
  hours: number;
  cost: number;
}

function CustomTooltip({ active, payload, label, costMap }: any) {
  if (!active || !payload?.length) return null;
  const rows: TooltipRow[] = payload.map((item: any) => ({
    name: item.name,
    fill: item.fill,
    hours: item.value,
    cost: costMap[item.dataKey] ?? 0,
  }));
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md min-w-[200px]">
      <p className="mb-1.5 font-medium capitalize">{label}</p>
      {rows.map((row) => (
        <div key={row.name} className="py-0.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: row.fill }} />
            <span className="font-medium">{row.name}</span>
          </div>
          <div className="pl-3.5 flex flex-col gap-0.5 text-muted-foreground">
            <span>{Math.round(row.hours)}h</span>
            {row.cost > 0 && <span>{formatCurrency(row.cost)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  yearlyMonths: MonthlyPoint[];
  financialMonths: FinancialMonthlyPoint[];
  year: number;
}

export function AllocationChart({ yearlyMonths, financialMonths, year }: Props) {
  const chartData = yearlyMonths.map((m, i) => {
    const fin = financialMonths[i];
    return {
      label: m.label,
      hoursReal: m.isPast ? Math.round(m.hoursReal) : 0,
      hoursPlanned: Math.round(m.hoursPlanned),
      hoursCapacity: m.isPast ? Math.round(m.hoursCapacity) : 0,
      // costs for tooltip only
      _laborCost: m.isPast ? (fin?.laborCost ?? 0) : 0,
      _plannedLaborCost: fin?.plannedLaborCost ?? 0,
      _capacityCost: m.isPast ? m.capacityCost : 0,
    };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Alocação da Equipe — {year}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={chartData} barGap={2} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={(v) => `${v}h`}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={(props) => {
                if (!props.active || !props.payload?.length) return null;
                const d = props.payload[0]?.payload;
                const costMap: Record<string, number> = {
                  hoursCapacity: d?._capacityCost ?? 0,
                  hoursPlanned: d?._plannedLaborCost ?? 0,
                  hoursReal: d?._laborCost ?? 0,
                };
                return <CustomTooltip {...props} costMap={costMap} />;
              }}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="hoursCapacity" fill="var(--color-hoursCapacity)" radius={[3, 3, 0, 0]} name="Capacidade" />
            <Bar dataKey="hoursPlanned" fill="var(--color-hoursPlanned)" radius={[3, 3, 0, 0]} name="Planejado" />
            <Bar dataKey="hoursReal" fill="var(--color-hoursReal)" radius={[3, 3, 0, 0]} name="Realizado" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
