import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonthlyPoint } from '@/hooks/useYearlyEvolution';

interface Props {
  data: MonthlyPoint[];
  year: number;
}

const PLANNED_COLOR = 'hsl(var(--chart-4))';
const ACTUAL_COLOR = 'hsl(var(--chart-2))';
const UTILIZATION_COLOR = 'hsl(152, 45%, 32%)';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium capitalize">{label}</p>
      {payload.map((p: any) => {
        if (p.value === null || p.value === undefined) return null;
        const formatted = p.dataKey === 'utilization'
          ? `${Number(p.value).toFixed(1)}%`
          : `${Number(p.value).toFixed(0)}h`;
        return (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {formatted}
          </p>
        );
      })}
    </div>
  );
}

export function AllocationMonthlyChart({ data, year }: Props) {
  const highlighted = data.filter(d => d.isHighlighted);
  const refStart = highlighted.length > 0 ? highlighted[0].label : undefined;
  const refEnd = highlighted.length > 0 ? highlighted[highlighted.length - 1].label : undefined;

  const maxHours = Math.max(
    ...data.map(d => Math.max(d.hoursPlanned, d.hoursReal)),
    1,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Alocação: Planejado vs. Realizado — {year}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 44, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="hours"
                orientation="left"
                tickFormatter={(v) => `${v}h`}
                tick={{ fontSize: 11 }}
                domain={[0, maxHours * 1.15]}
                width={48}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                domain={[0, 120]}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {refStart && refEnd && (
                <ReferenceArea
                  yAxisId="hours"
                  x1={refStart}
                  x2={refEnd}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.06}
                  stroke="hsl(var(--primary))"
                  strokeOpacity={0.2}
                  strokeWidth={1}
                />
              )}

              <Bar yAxisId="hours" dataKey="hoursPlanned" name="Planejado" fill={PLANNED_COLOR} radius={[3, 3, 0, 0]} barSize={14}>
                {data.map((d) => (
                  <Cell key={d.monthIndex} fill={PLANNED_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.35} />
                ))}
              </Bar>

              <Bar yAxisId="hours" dataKey="hoursReal" name="Realizado" fill={ACTUAL_COLOR} radius={[3, 3, 0, 0]} barSize={14}>
                {data.map((d) => (
                  <Cell key={d.monthIndex} fill={ACTUAL_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.35} />
                ))}
              </Bar>

              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="utilization"
                name="Utilização %"
                stroke={UTILIZATION_COLOR}
                strokeWidth={2}
                dot={{ r: 3, fill: UTILIZATION_COLOR }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
