import { useMemo } from 'react';
import { parse, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ArrowLeftRight } from 'lucide-react';
import { AdminDashboardSection } from './AdminDashboardSection';
import { TERMINATION_TYPE_LABELS, type TerminationType } from '@/types/termination';
import type { TurnoverResult } from '@/lib/turnoverCalculator';

interface AdminHeadcountFlowCardProps {
  data?: TurnoverResult;
  loading?: boolean;
}

function monthLabel(month: string): string {
  // 'YYYY-MM' → 'mmm/yy'
  const date = parse(month, 'yyyy-MM', new Date());
  return format(date, 'MMM/yy', { locale: ptBR });
}

interface TooltipEntry {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

interface FlowTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function FlowTooltip({ active, payload, label }: FlowTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium capitalize mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/**
 * Fluxo de pessoal no período: admissões vs. desligamentos por mês.
 * A taxa de turnover (SHRM) é exibida no KPI próprio do Dashboard — este card
 * foca no fluxo (entradas/saídas) e na composição dos desligamentos por tipo.
 */
export function AdminHeadcountFlowCard({ data, loading }: AdminHeadcountFlowCardProps) {
  const series = useMemo(
    () =>
      (data?.byMonth ?? []).map((m) => ({
        month: monthLabel(m.month),
        admissions: m.admissions,
        terminations: m.terminations,
      })),
    [data],
  );

  const topTypes = useMemo(() => {
    if (!data) return [] as { label: string; count: number }[];
    return Object.entries(data.byType)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({
        label: TERMINATION_TYPE_LABELS[type as TerminationType] ?? type,
        count,
      }));
  }, [data]);

  const isEmpty = !data || (data.admissions === 0 && data.terminations === 0);

  return (
    <AdminDashboardSection
      title="Admissões e Desligamentos"
      icon={ArrowLeftRight}
      description="Fluxo de pessoal por mês no período selecionado"
      loading={loading}
      empty={isEmpty}
      emptyMessage="Sem admissões ou desligamentos no período selecionado."
      headerAction={
        !isEmpty ? (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              +{data!.admissions} adm.
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              −{data!.terminations} desl.
            </span>
          </div>
        ) : undefined
      }
    >
      {!isEmpty && (
        <div className="flex h-full flex-col space-y-4">
          {/* Gráfico mensal — ocupa toda a altura disponível do card */}
          <div className="min-h-[220px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="capitalize"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip content={<FlowTooltip />} cursor={{ fill: 'transparent' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="admissions"
                name="Admissões"
                fill="rgb(16 185 129)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="terminations"
                name="Desligamentos"
                fill="rgb(225 29 72)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          </div>

          {/* Desligamentos por tipo */}
          {topTypes.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Desligamentos por tipo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topTypes.map((t) => (
                  <span
                    key={t.label}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-muted text-muted-foreground"
                  >
                    {t.label}
                    <span className="font-semibold text-foreground">{t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AdminDashboardSection>
  );
}
