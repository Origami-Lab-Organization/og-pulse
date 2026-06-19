import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ChevronRight } from 'lucide-react';
import { DashboardSection } from './DashboardSection';
import { cn } from '@/lib/utils';
import type { ProjectHealthRow } from '@/hooks/useProjectHealthData';
import type { HealthStatus } from '@/lib/projectHealthCalculator';

interface OperationalHealthCardProps {
  rows: ProjectHealthRow[];
  loading?: boolean;
}

const STATUS_STYLES: Record<HealthStatus, { dot: string; badge: string; label: string }> = {
  green: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    label: 'Saudável',
  },
  amber: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    label: 'Atenção',
  },
  red: {
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    label: 'Crítico',
  },
};

export function OperationalHealthCard({ rows, loading }: OperationalHealthCardProps) {
  const navigate = useNavigate();

  const { counts, alerts } = useMemo(() => {
    const counts: Record<HealthStatus, number> = { green: 0, amber: 0, red: 0 };
    for (const r of rows) counts[r.health.overall.status]++;

    // Projetos com alerta: Atenção e Crítico primeiro (crítico no topo)
    const alerts = rows
      .filter((r) => r.health.overall.status !== 'green')
      .sort((a, b) => {
        const order: Record<HealthStatus, number> = { red: 0, amber: 1, green: 2 };
        return order[a.health.overall.status] - order[b.health.overall.status];
      });

    return { counts, alerts };
  }, [rows]);

  return (
    <DashboardSection
      title="Saúde Operacional"
      icon={Activity}
      description="Situação dos projetos no período"
      loading={loading}
      empty={rows.length === 0}
      emptyMessage="Cadastre projetos para acompanhar a saúde operacional."
    >
      <div className="space-y-4">
        {/* Resumo por status */}
        <div className="grid grid-cols-3 gap-2">
          {(['green', 'amber', 'red'] as HealthStatus[]).map((status) => {
            const style = STATUS_STYLES[status];
            return (
              <div key={status} className="rounded-lg border p-2 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full', style.dot)} />
                  <span className="text-lg font-bold">{counts[status]}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {style.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Projetos que precisam de atenção — badge clicável leva ao projeto */}
        {alerts.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Precisam de atenção
            </p>
            {alerts.map((r) => {
              const style = STATUS_STYLES[r.health.overall.status];
              return (
                <button
                  key={r.projectId}
                  type="button"
                  onClick={() => navigate(`/projects/${r.projectId}`)}
                  className="flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.projectName}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.clientName}</p>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap',
                      style.badge,
                    )}
                  >
                    {r.health.overall.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todos os projetos estão saudáveis no período. 🎉
          </p>
        )}
      </div>
    </DashboardSection>
  );
}
