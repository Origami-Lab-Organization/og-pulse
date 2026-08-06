import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/formatters';

interface Props {
  data: { month: string; wonMonth: number; lostMonth: number; wonAccumulated: number }[];
}

export function RevenueAccumulatedChart({ data }: Props) {
  const maxBar = Math.max(...data.map(d => Math.max(d.wonMonth, d.lostMonth)), 1);
  const maxAcc = Math.max(...data.map(d => d.wonAccumulated), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Volume de Projetos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="bar"
                orientation="left"
                tickFormatter={(v) => v > 0 ? `${(v / 1000).toFixed(0)}k` : '0'}
                tick={{ fontSize: 11 }}
                domain={[0, maxBar * 1.1]}
              />
              <YAxis
                yAxisId="line"
                orientation="right"
                tickFormatter={(v) => v > 0 ? `${(v / 1000).toFixed(0)}k` : '0'}
                tick={{ fontSize: 11 }}
                domain={[0, maxAcc * 1.1]}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar yAxisId="bar" dataKey="wonMonth" name="Fechado - Ganho" fill="hsl(152, 55%, 45%)" radius={[3, 3, 0, 0]} barSize={16} />
              <Bar yAxisId="bar" dataKey="lostMonth" name="Perdido" fill="hsl(0, 72%, 51%)" radius={[3, 3, 0, 0]} barSize={16} />
              <Line yAxisId="line" type="monotone" dataKey="wonAccumulated" name="Acumulado Ganho" stroke="hsl(152, 40%, 30%)" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
