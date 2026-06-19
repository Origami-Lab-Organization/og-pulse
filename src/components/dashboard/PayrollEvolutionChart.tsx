import { useMemo } from 'react';
import { format, subMonths, endOfMonth, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { Wallet } from 'lucide-react';
import { DashboardSection } from './DashboardSection';
import type { Employee } from '@/hooks/useEmployees';
import { formatCurrency } from '@/lib/formatters';

interface PayrollEvolutionChartProps {
  employees: Employee[];
  loading?: boolean;
}

function buildSeries(employees: Employee[]) {
  const today = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(today, 11 - i);
    const monthEnd = endOfMonth(date);

    const total = employees
      .filter((e) => {
        if (e.status !== 'ativo') return false;
        if (!e.dataAdmissao) return false;
        return !isAfter(parseISO(e.dataAdmissao), monthEnd);
      })
      .reduce((sum, e) => sum + (e.totalMonthlyCostEstimated || 0), 0);

    return {
      month: format(date, 'MMM/yy', { locale: ptBR }),
      total,
    };
  });
}

function PayrollTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium capitalize">{label}</p>
      <p className="text-rose-600 dark:text-rose-400 font-semibold">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

export function PayrollEvolutionChart({ employees, loading }: PayrollEvolutionChartProps) {
  const series = useMemo(() => buildSeries(employees), [employees]);
  const hasData = series.some((d) => d.total > 0);

  return (
    <DashboardSection
      title="Evolução do Custo de Folha"
      icon={Wallet}
      description="Custo mensal acumulado conforme admissões · últimos 12 meses"
      loading={loading}
      empty={!hasData}
      emptyMessage="Cadastre funcionários ativos (com custo estimado) para visualizar a evolução da folha."
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={series} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            className="capitalize"
          />
          <YAxis
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip content={<PayrollTooltip />} />
          <Line
            type="monotone"
            dataKey="total"
            stroke="rgb(225 29 72)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'rgb(225 29 72)', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </DashboardSection>
  );
}
