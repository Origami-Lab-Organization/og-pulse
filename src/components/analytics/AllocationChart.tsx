import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { MonthlyPoint } from '@/hooks/useYearlyEvolution';

const chartConfig = {
  hoursCapacity: { label: 'Capacidade', color: 'hsl(0, 0%, 80%)' },
  hoursPlanned: { label: 'Planejado', color: 'hsl(38, 85%, 52%)' },
  hoursReal: { label: 'Realizado', color: 'hsl(220, 70%, 50%)' },
} satisfies ChartConfig;

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md min-w-[160px]">
      <p className="mb-1.5 font-medium capitalize">{label}</p>
      {payload.map((item: any) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: item.fill }} />
            <span className="text-muted-foreground">{item.name}</span>
          </div>
          <span className="font-mono font-medium tabular-nums">{Math.round(item.value)}h</span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  data: MonthlyPoint[];
  year: number;
}

export function AllocationChart({ data, year }: Props) {
  const chartData = data.map(m => ({
    label: m.label,
    hoursReal: m.isPast ? Math.round(m.hoursReal) : 0,
    hoursPlanned: Math.round(m.hoursPlanned),
    hoursCapacity: m.isPast ? Math.round(m.hoursCapacity) : 0,
  }));

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
            <YAxis tickFormatter={(v) => `${v}h`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
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
