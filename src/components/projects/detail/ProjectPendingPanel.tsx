import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PortfolioAlert } from '@/types/portfolio';

interface ProjectPendingPanelProps {
  alerts: PortfolioAlert[];
}

/**
 * Pendências do projeto na Visão Geral (US-0037), ao lado das informações financeiras: o que o
 * sino do card do portfólio contou, mais a NF com janela de emissão aberta.
 */
export function ProjectPendingPanel(props: ProjectPendingPanelProps) {
  const { alerts } = props;
  return (
    <section aria-label="Pendências e decisões" className="rounded-lg border bg-card p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Bell className="h-4 w-4" />
        Pendências e decisões{alerts.length ? ` · ${alerts.length}` : ''}
      </h3>
      {!alerts.length && <p className="text-sm text-muted-foreground">Nada pendente neste projeto.</p>}
      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li
            key={alert.text}
            className={cn(
              'rounded-md border-l-4 bg-muted/40 px-3 py-2 text-sm',
              alert.level === 'late' ? 'border-destructive' : 'border-warning',
            )}
          >
            <span className="font-semibold">{alert.level === 'late' ? 'Fora do planejado: ' : 'Pede atenção: '}</span>
            {alert.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
