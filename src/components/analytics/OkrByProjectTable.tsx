import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  CONFIDENCE_LEVEL_COLORS,
  CONFIDENCE_LEVEL_LABELS,
  OKR_STATUS_LABELS,
} from '@/types/projectOkr';
import type { OkrAnalyticsData } from '@/hooks/useOkrAnalytics';
import type { OKRStatus, KeyResultConfidenceLevel } from '@/types/projectOkr';

interface OkrByProjectTableProps {
  data: OkrAnalyticsData['byProject'];
}

function ProgressBar({ value }: { value: number }) {
  const color =
    value >= 60 ? 'bg-emerald-500' :
    value >= 30 ? 'bg-amber-500'   : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
        {Math.round(value)}%
      </span>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: KeyResultConfidenceLevel }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
      CONFIDENCE_LEVEL_COLORS[level],
    )}>
      {CONFIDENCE_LEVEL_LABELS[level]}
    </span>
  );
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  on_track:  { label: 'No Prazo',  className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  at_risk:   { label: 'Em Risco',  className: 'bg-amber-100   text-amber-800   dark:bg-amber-900/30   dark:text-amber-300'   },
  completed: { label: 'Concluído', className: 'bg-blue-100    text-blue-800    dark:bg-blue-900/30    dark:text-blue-300'    },
  pending:   { label: 'Pendente',  className: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
};

function StatusBadge({ status, isOnTrack }: { status: OKRStatus; isOnTrack: boolean }) {
  const key =
    status === 'completed' ? 'completed' :
    status === 'cancelled' ? 'cancelled' :
    status === 'pending'   ? 'pending'   :
    isOnTrack              ? 'on_track'  : 'at_risk';

  const cfg = STATUS_CONFIG[key];
  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
      cfg.className,
    )}>
      {cfg.label}
    </span>
  );
}

export function OkrByProjectTable({ data }: OkrByProjectTableProps) {
  const allOkrs = data.flatMap(p => p.okrs.map(o => ({ ...o, projectName: p.projectName })));

  if (allOkrs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">OKRs por Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum OKR cadastrado nos projetos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">OKRs por Projeto</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead>Objetivo</TableHead>
              <TableHead className="text-center">Key Results</TableHead>
              <TableHead className="min-w-[140px]">Progresso</TableHead>
              <TableHead>Confiança</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(project =>
              project.okrs.map((okr, idx) => (
                <TableRow key={okr.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {idx === 0 ? (
                      <span className="font-semibold text-foreground">{project.projectName}</span>
                    ) : (
                      <span className="invisible">{project.projectName}</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <p className="truncate text-sm">{okr.objective}</p>
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums">
                    {okr.keyResultsTotal > 0
                      ? `${okr.keyResultsCompleted}/${okr.keyResultsTotal}`
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <ProgressBar value={okr.progress} />
                  </TableCell>
                  <TableCell>
                    <ConfidenceBadge level={okr.confidence} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={okr.status} isOnTrack={okr.isOnTrack} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
