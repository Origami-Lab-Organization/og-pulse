import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OkrAnalyticsData } from '@/hooks/useOkrAnalytics';

interface ConfidenceDistributionChartProps {
  data: OkrAnalyticsData['byProject'];
}

const CONF_SEGMENTS = [
  { key: 'Muito Alto', color: '#15803d' },
  { key: 'Alto',       color: '#22c55e' },
  { key: 'Médio',      color: '#eab308' },
  { key: 'Baixo',      color: '#f97316' },
  { key: 'Muito Baixo', color: '#ef4444' },
] as const;

type SegmentKey = typeof CONF_SEGMENTS[number]['key'];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
      <p className="mb-1.5 font-medium">{label}</p>
      {payload.filter(e => e.value > 0).map(entry => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: entry.fill }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value.toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

export function ConfidenceDistributionChart({ data }: ConfidenceDistributionChartProps) {
  // Only projects that have at least one KR with a confidence level
  const projectsWithKrs = data.filter(p =>
    p.okrs.some(o => o.keyResultsTotal > 0)
  );

  if (projectsWithKrs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição de Confiança por Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum key result com nível de confiança cadastrado.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Build chart data — flatten KR confidences per project and calculate %
  const CONF_MAP: Record<string, SegmentKey> = {
    very_high: 'Muito Alto',
    high:      'Alto',
    medium:    'Médio',
    low:       'Baixo',
    very_low:  'Muito Baixo',
  };

  const chartData = projectsWithKrs.map(project => {
    const counts: Record<SegmentKey, number> = {
      'Muito Alto': 0, 'Alto': 0, 'Médio': 0, 'Baixo': 0, 'Muito Baixo': 0,
    };
    let total = 0;

    for (const okr of project.okrs) {
      // Each OKR exposes only its dominant confidence + keyResultsTotal
      // We need raw KR data — since hook aggregates, approximate with dominant * total
      // (We rely on the hook returning confidence as dominant per OKR)
      const label = CONF_MAP[okr.confidence];
      if (label) {
        counts[label] += okr.keyResultsTotal || 1;
        total += okr.keyResultsTotal || 1;
      }
    }

    const row: Record<string, string | number> = { name: project.projectName };
    for (const seg of CONF_SEGMENTS) {
      row[seg.key] = total > 0 ? (counts[seg.key] / total) * 100 : 0;
    }
    return row;
  });

  const chartHeight = Math.max(200, projectsWithKrs.length * 50 + 60);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição de Confiança por Projeto</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            {CONF_SEGMENTS.map((seg, i) => (
              <Bar
                key={seg.key}
                dataKey={seg.key}
                stackId="a"
                fill={seg.color}
                radius={i === CONF_SEGMENTS.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
