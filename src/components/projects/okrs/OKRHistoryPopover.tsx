import { TrendingUp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useKeyResultHistory } from '@/hooks/useProjectOKRs';
import { ProjectKeyResult, CONFIDENCE_LEVEL_LABELS, KeyResultConfidenceLevel } from '@/types/projectOkr';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OKRHistoryPopoverProps {
  okrId: string;
  keyResults: ProjectKeyResult[];
}

const KR_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function OKRHistoryPopover({ okrId, keyResults }: OKRHistoryPopoverProps) {
  const krIds = keyResults.map((kr) => kr.id);
  const { data: history = [] } = useKeyResultHistory(okrId, krIds);

  if (history.length === 0) return null;

  // Group by changed_at timestamp, build chart data
  const dateMap = new Map<string, Record<string, number | string>>();

  history.forEach((h) => {
    const dateKey = format(new Date(h.changed_at), 'dd/MM HH:mm');
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { date: dateKey });
    }
    const entry = dateMap.get(dateKey)!;
    const kr = keyResults.find((k) => k.id === h.key_result_id);
    const label = kr ? kr.description.slice(0, 20) : h.key_result_id.slice(0, 8);

    if (kr?.target_value && kr.target_value > 0 && h.current_value != null) {
      entry[label] = Math.round((h.current_value / kr.target_value) * 100);
    } else {
      entry[label] = h.current_value ?? 0;
    }

    if (h.confidence_level) {
      entry[`${label}_conf`] = CONFIDENCE_LEVEL_LABELS[h.confidence_level as KeyResultConfidenceLevel] || h.confidence_level;
    }
  });

  const chartData = Array.from(dateMap.values());
  const krLabels = keyResults.map((kr) => kr.description.slice(0, 20));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <TrendingUp className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4" align="end">
        <h4 className="text-sm font-semibold mb-3">Evolução dos Key Results</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value: number, name: string) => {
                  const confKey = `${name}_conf`;
                  const conf = chartData.find((d) => d[confKey])?.[confKey];
                  return [`${value}%${conf ? ` (${conf})` : ''}`, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {krLabels.map((label, i) => (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={KR_COLORS[i % KR_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </PopoverContent>
    </Popover>
  );
}
