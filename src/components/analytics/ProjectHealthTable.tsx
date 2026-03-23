import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ProjectHealthRow } from '@/hooks/useProjectHealthData';
import type { HealthStatus } from '@/lib/projectHealthCalculator';

interface ProjectHealthTableProps {
  data: ProjectHealthRow[];
}

const STATUS_DOT: Record<HealthStatus, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red:   'bg-red-500',
};

const STATUS_TEXT: Record<HealthStatus, string> = {
  green: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red:   'text-red-600   dark:text-red-400',
};

function HealthDot({ status, label }: { status: HealthStatus; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', STATUS_DOT[status])} />
      <span className={cn('text-sm font-medium', STATUS_TEXT[status])}>{label}</span>
    </div>
  );
}

function OkrBar({ progress, hasOkrs }: { progress: number; hasOkrs: boolean }) {
  if (!hasOkrs) return <span className="text-muted-foreground text-sm">—</span>;

  const color =
    progress >= 60 ? 'bg-emerald-500' :
    progress >= 30 ? 'bg-amber-500'   : 'bg-red-500';

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full', color)}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
        {Math.round(progress)}%
      </span>
    </div>
  );
}

function MarginCell({ margin, marginTarget, isNonRevenue }: {
  margin: number;
  marginTarget: number | null;
  isNonRevenue: boolean;
}) {
  if (isNonRevenue) {
    return <span className="text-muted-foreground text-sm">N/A</span>;
  }
  const target = marginTarget ?? 30;
  const color =
    margin >= target        ? 'text-emerald-600 dark:text-emerald-400' :
    margin >= target * 0.5  ? 'text-amber-600   dark:text-amber-400'   :
                              'text-red-600      dark:text-red-400';
  return <span className={cn('text-sm font-medium tabular-nums', color)}>{formatPercent(margin)}</span>;
}

function UtilizationCell({ value }: { value: number }) {
  const color =
    value >= 80 && value <= 100 ? 'text-emerald-600 dark:text-emerald-400' :
    (value >= 60 && value < 80) || (value > 100 && value <= 120)
                                ? 'text-amber-600 dark:text-amber-400'    :
                                  'text-red-600    dark:text-red-400';
  return <span className={cn('text-sm font-medium tabular-nums', color)}>{formatPercent(value)}</span>;
}

function StakeholdersCell({ promoterCount, detractorCount, total }: {
  promoterCount: number;
  detractorCount: number;
  total: number;
}) {
  if (total === 0) return <span className="text-muted-foreground text-sm">—</span>;
  if (detractorCount > 0) {
    return (
      <span className="text-sm text-red-600 dark:text-red-400">
        {detractorCount} {detractorCount === 1 ? 'detrator' : 'detratores'}
      </span>
    );
  }
  return (
    <span className="text-sm text-emerald-600 dark:text-emerald-400">
      {promoterCount} {promoterCount === 1 ? 'promotor' : 'promotores'}
    </span>
  );
}

export function ProjectHealthTable({ data }: ProjectHealthTableProps) {
  const navigate = useNavigate();

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saúde dos Projetos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum projeto encontrado no período.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Saúde dos Projetos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Gerente</TableHead>
              <TableHead>Saúde Geral</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right">Margem</TableHead>
              <TableHead className="text-right">Utilização</TableHead>
              <TableHead>Stakeholders</TableHead>
              <TableHead className="min-w-[120px]">OKRs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={row.projectId}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/projects/${row.projectId}`)}
              >
                <TableCell className="font-semibold">{row.projectName}</TableCell>
                <TableCell className="text-muted-foreground">{row.clientName}</TableCell>
                <TableCell className="text-muted-foreground">{row.managerName}</TableCell>
                <TableCell>
                  <HealthDot
                    status={row.health.overall.status}
                    label={row.health.overall.label}
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.billingType === 'no_revenue'
                    ? <span className="text-muted-foreground text-sm">N/A</span>
                    : formatCurrency(row.revenueReceived)}
                </TableCell>
                <TableCell className="text-right">
                  <MarginCell
                    margin={row.margin}
                    marginTarget={row.marginTarget}
                    isNonRevenue={row.billingType === 'no_revenue'}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <UtilizationCell value={row.avgUtilization} />
                </TableCell>
                <TableCell>
                  <StakeholdersCell
                    promoterCount={row.promoterCount}
                    detractorCount={row.detractorCount}
                    total={row.totalStakeholders}
                  />
                </TableCell>
                <TableCell>
                  <OkrBar progress={row.okrProgress} hasOkrs={row.hasOkrs} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
