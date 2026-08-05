import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Props {
  data: { source: string; label: string; count: number; wonCount: number; conversionRate: number }[];
}

export function LeadsBySourceChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Leads por Origem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Compass className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhum lead criado no período</p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/pipeline">Ir para o Pipeline</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const enriched = data.map(d => ({
    ...d,
    valueLabel: `${d.count} (${Math.round(d.conversionRate)}% conv.)`,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Leads por Origem</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={enriched} layout="vertical" margin={{ left: 10, right: 70 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, _name, item) => {
                  const p = item?.payload as { count: number; wonCount: number; conversionRate: number };
                  return [`${value} leads · ${p.wonCount} ganhos (${Math.round(p.conversionRate)}%)`, 'Origem'];
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} fillOpacity={0.85}>
                <LabelList dataKey="valueLabel" position="right" style={{ fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
