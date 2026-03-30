import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import type { AdminActivitiesEvolutionData } from '@/hooks/useAdminActivitiesEvolution';

interface Props {
  data: AdminActivitiesEvolutionData;
}

const FALLBACK_COLORS = [
  'hsl(220, 70%, 50%)',
  'hsl(152, 55%, 40%)',
  'hsl(38, 85%, 52%)',
  'hsl(0, 70%, 58%)',
  'hsl(280, 55%, 55%)',
  'hsl(195, 70%, 45%)',
  'hsl(30, 80%, 50%)',
  'hsl(340, 65%, 50%)',
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium capitalize">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
      <p className="mt-1 border-t pt-1 font-medium">Total: {formatCurrency(total)}</p>
    </div>
  );
}

export function AdminActivitiesChart({ data }: Props) {
  const { months, activityTypes, year } = data;

  if (activityTypes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Custos Administrativos — {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum tipo de atividade cadastrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Custos Administrativos — {year}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                tick={{ fontSize: 11 }}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {activityTypes.map((type, idx) => {
                const color = FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
                const isLast = idx === activityTypes.length - 1;
                return (
                  <Bar
                    key={type.id}
                    dataKey={type.id}
                    name={type.name}
                    stackId="admin"
                    fill={color}
                    radius={isLast ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
