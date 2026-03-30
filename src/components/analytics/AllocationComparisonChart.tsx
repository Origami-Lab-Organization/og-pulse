import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AllocationEmployee } from '@/hooks/useAllocationAnalytics';

interface Props {
  employees: AllocationEmployee[];
}

const PLANNED_COLOR = 'hsl(var(--chart-4))';
const ACTUAL_COLOR = 'hsl(var(--chart-2))';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toFixed(1)}h
        </p>
      ))}
    </div>
  );
}

export function AllocationComparisonChart({ employees }: Props) {
  // Show top 15 employees by actual hours
  const chartData = employees
    .slice(0, 15)
    .map((e) => ({
      name: e.employeeName.length > 18 ? e.employeeName.slice(0, 16) + '…' : e.employeeName,
      planejado: e.plannedHours,
      realizado: e.actualHours,
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativo por Colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem dados no período.
          </p>
        </CardContent>
      </Card>
    );
  }

  const barHeight = 32;
  const chartHeight = Math.max(200, chartData.length * barHeight + 60);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparativo por Colaborador</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `${v}h`}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="planejado" name="Planejado" fill={PLANNED_COLOR} barSize={12} radius={[0, 3, 3, 0]} />
              <Bar dataKey="realizado" name="Realizado" fill={ACTUAL_COLOR} barSize={12} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
