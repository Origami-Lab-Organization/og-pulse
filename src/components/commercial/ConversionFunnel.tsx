import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface FunnelItem {
  stage: string;
  label: string;
  count: number;
  color: string;
}

interface Props {
  data: FunnelItem[];
}

export function ConversionFunnel({ data }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 40 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} />
              <Tooltip formatter={(value: number) => [value, 'Leads']} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} background={false}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
                <LabelList dataKey="count" position="right" style={{ fontSize: 12, fontWeight: 600, fill: 'hsl(var(--foreground))' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
