import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/formatters';

interface Props {
  data: { name: string; value: number; count: number }[];
  totalPipeline: number;
}

const COLORS = [
  'hsl(var(--muted-foreground))',
  'hsl(210, 70%, 50%)',
  'hsl(38, 92%, 50%)',
  'hsl(25, 85%, 55%)',
];

export function PipelineDonutChart({ data, totalPipeline }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pipeline por Etapa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, entry: any) => [
                  `${formatCurrency(value)} (${entry.payload.count} leads)`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-bold text-foreground">{formatCurrency(totalPipeline)}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {data.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
