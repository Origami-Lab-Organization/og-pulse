import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AllocationMember {
  memberId: string;
  employeeName: string;
  role: string;
  months: { month: string; planned: number; actual: number }[];
}

interface MyProjectAllocationTabProps {
  allocation: AllocationMember[];
  currentEmployeeName: string;
}

function formatMonthShort(monthStr: string): string {
  const date = parseISO(`${monthStr}-01`);
  return format(date, 'MMM/yy', { locale: ptBR });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

function firstName2(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).join(' ');
}

function barColor(actual: number, planned: number): string {
  if (planned === 0) return 'bg-muted';
  const pct = (actual / planned) * 100;
  if (pct > 110) return 'bg-destructive';
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 1) return 'bg-amber-500';
  return 'bg-muted';
}

function ProgressBar({ actual, planned }: { actual: number; planned: number }) {
  const pct = planned > 0 ? Math.min(110, (actual / planned) * 100) : 0;
  return (
    <div className="h-[3px] w-full rounded-full bg-muted overflow-hidden mt-1">
      <div
        className={cn('h-full rounded-full transition-all', barColor(actual, planned))}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function MyProjectAllocationTab({
  allocation,
  currentEmployeeName,
}: MyProjectAllocationTabProps) {
  // ── Derived data ─────────────────────────────────────────────────────────
  const allMonths = useMemo(
    () =>
      Array.from(new Set(allocation.flatMap((a) => a.months.map((m) => m.month)))).sort(),
    [allocation]
  );

  const currentMonth = format(new Date(), 'yyyy-MM');

  // Per-member totals
  const memberTotals = useMemo(
    () =>
      allocation.map((member) => ({
        memberId: member.memberId,
        totalPlanned: member.months.reduce((s, m) => s + m.planned, 0),
        totalActual: member.months.reduce((s, m) => s + m.actual, 0),
      })),
    [allocation]
  );

  // Grand totals
  const grandPlanned = useMemo(
    () => memberTotals.reduce((s, m) => s + m.totalPlanned, 0),
    [memberTotals]
  );
  const grandActual = useMemo(
    () => memberTotals.reduce((s, m) => s + m.totalActual, 0),
    [memberTotals]
  );
  const grandPercent = grandPlanned > 0 ? Math.round((grandActual / grandPlanned) * 100) : 0;
  const grandDiff = grandActual - grandPlanned;

  // Per-month project totals (footer)
  const monthFooter = useMemo(
    () =>
      allMonths.map((month) => {
        const planned = allocation.reduce(
          (s, a) => s + (a.months.find((m) => m.month === month)?.planned ?? 0),
          0
        );
        const actual = allocation.reduce(
          (s, a) => s + (a.months.find((m) => m.month === month)?.actual ?? 0),
          0
        );
        return { month, planned, actual };
      }),
    [allocation, allMonths]
  );

  // Max hours for comparative bar chart
  const maxHours = useMemo(
    () => Math.max(...memberTotals.flatMap((m) => [m.totalPlanned, m.totalActual]), 1),
    [memberTotals]
  );

  if (allocation.length === 0 || allMonths.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium text-foreground">Nenhuma alocação planejada</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            O planejamento de horas por membro ainda não foi definido para este projeto.
            As horas executadas via timesheet aparecerão aqui quando houver lançamentos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Total Planejado
            </p>
            <p className="text-2xl font-bold">{grandPlanned}h</p>
            <p className="text-xs text-muted-foreground mt-1">
              {allocation.length} membro{allocation.length !== 1 ? 's' : ''} ·{' '}
              {allMonths.length} {allMonths.length === 1 ? 'mês' : 'meses'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Total Executado
            </p>
            <p className="text-2xl font-bold">{grandActual}h</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  grandPercent > 110 ? 'bg-destructive' : grandPercent >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                )}
                style={{ width: `${Math.min(110, grandPercent)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Execução
            </p>
            <p className="text-2xl font-bold">{grandPercent}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {grandDiff > 0 ? (
                <span className="text-amber-600">{grandDiff}h acima do planejado</span>
              ) : grandDiff < 0 ? (
                `${Math.abs(grandDiff)}h restantes`
              ) : (
                'Exatamente conforme planejado'
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Allocation table ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Horas por Membro e Mês</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Wrap in a scrollable div — Table's own overflow-auto would break sticky */}
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <TableHeader>
                <TableRow>
                  {/* Sticky member column */}
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[180px] border-r">
                    Membro
                  </TableHead>
                  {allMonths.map((month) => (
                    <TableHead
                      key={month}
                      className={cn(
                        'text-center min-w-[90px] whitespace-nowrap',
                        month === currentMonth && 'bg-primary/5'
                      )}
                    >
                      {formatMonthShort(month)}
                      {month === currentMonth && (
                        <span className="block text-[9px] text-primary font-medium leading-tight">
                          atual
                        </span>
                      )}
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[100px] border-l font-semibold">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {allocation.map((member, idx) => {
                  const isCurrentUser = member.employeeName === currentEmployeeName;
                  const mt = memberTotals[idx];
                  const memberPercent =
                    mt.totalPlanned > 0
                      ? Math.round((mt.totalActual / mt.totalPlanned) * 100)
                      : 0;

                  return (
                    <TableRow
                      key={member.memberId}
                      className={cn(isCurrentUser && 'bg-primary/5 dark:bg-primary/10')}
                    >
                      {/* Sticky member cell */}
                      <TableCell className="sticky left-0 z-10 border-r py-2 px-3 bg-inherit">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback
                              className={cn(
                                'text-[10px]',
                                isCurrentUser
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {getInitials(member.employeeName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium leading-none truncate">
                                {firstName2(member.employeeName)}
                              </span>
                              {isCurrentUser && (
                                <Badge className="text-[9px] px-1 py-0 bg-primary text-primary-foreground shrink-0 leading-tight">
                                  Você
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              {member.role}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Month cells */}
                      {allMonths.map((month) => {
                        const row = member.months.find((m) => m.month === month);
                        const planned = row?.planned ?? 0;
                        const actual = row?.actual ?? 0;
                        const isEmpty = planned === 0 && actual === 0;
                        const isFutureMonth = month > currentMonth;

                        return (
                          <TableCell
                            key={month}
                            className={cn(
                              'text-center py-2 px-2',
                              month === currentMonth && 'bg-primary/5'
                            )}
                          >
                            {isEmpty ? (
                              <span className="text-muted-foreground/30">—</span>
                            ) : (
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-baseline gap-0.5">
                                  <span className="font-semibold text-xs text-foreground">{actual}</span>
                                  <span className="text-muted-foreground/50 text-[10px]">/</span>
                                  <span className="text-[10px] text-muted-foreground">{planned}h</span>
                                </div>
                                {actual > 0 ? (
                                  <ProgressBar actual={actual} planned={planned} />
                                ) : isFutureMonth ? (
                                  <span className="text-[10px] text-muted-foreground/40">planejado</span>
                                ) : (
                                  <div className="h-[3px] w-full rounded-full bg-muted mt-0.5" />
                                )}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}

                      {/* Total cell */}
                      <TableCell className="text-center py-2 px-3 border-l">
                        <span className="font-semibold text-xs">{mt.totalActual}</span>
                        <span className="text-muted-foreground text-[10px]">/{mt.totalPlanned}h</span>
                        {mt.totalPlanned > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {memberPercent}%
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>

              <TableFooter>
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell className="sticky left-0 z-10 bg-muted/50 border-r py-2 px-3 text-xs font-bold">
                    Total do Projeto
                  </TableCell>
                  {monthFooter.map(({ month, planned, actual }) => {
                    const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
                    return (
                      <TableCell
                        key={month}
                        className={cn('text-center py-2 px-2', month === currentMonth && 'bg-primary/10')}
                      >
                        <span className="font-bold text-xs">{actual}</span>
                        <span className="text-muted-foreground text-[10px] font-normal">/{planned}h</span>
                        {planned > 0 && (
                          <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                            {pct}%
                          </p>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center py-2 px-3 border-l">
                    <span className="font-bold text-xs">{grandActual}</span>
                    <span className="text-muted-foreground text-[10px] font-normal">/{grandPlanned}h</span>
                    {grandPlanned > 0 && (
                      <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                        {grandPercent}%
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Legend — 5b ── */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-emerald-500" />
          ≥ 90% (no prazo)
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-amber-500" />
          40–89% (em progresso)
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-destructive" />
          &gt; 110% (acima do planejado)
        </span>
      </div>

      {/* ── Comparative bar chart ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Comparativo por Membro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {allocation.map((member, idx) => {
            const mt = memberTotals[idx];
            const isCurrentUser = member.employeeName === currentEmployeeName;
            const plannedPct = maxHours > 0 ? (mt.totalPlanned / maxHours) * 100 : 0;
            const actualPct = maxHours > 0 ? (mt.totalActual / maxHours) * 100 : 0;
            const isOver = mt.totalActual > mt.totalPlanned;

            return (
              <div key={member.memberId} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={cn(
                        'text-sm truncate',
                        isCurrentUser ? 'text-primary font-medium' : 'text-foreground'
                      )}
                    >
                      {firstName2(member.employeeName)}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline truncate">
                      · {member.role}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {mt.totalActual}h / {mt.totalPlanned}h
                  </span>
                </div>

                {/* Planned bar */}
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">Planejado</p>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/30 transition-all"
                      style={{ width: `${plannedPct}%` }}
                    />
                  </div>
                </div>

                {/* Actual bar */}
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground">Executado</p>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        isOver ? 'bg-destructive' : 'bg-primary'
                      )}
                      style={{ width: `${actualPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
