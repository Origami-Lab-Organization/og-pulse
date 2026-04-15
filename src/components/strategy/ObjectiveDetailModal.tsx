import { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, TrendingUp, User } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  StrategyObjectiveWithKrs,
  StrategyKeyResult,
  StrategyCheckin,
  getKrStatus,
  getKrProgress,
} from '@/types/strategy';
import { useDeleteStrategyObjective, useDeleteStrategyKeyResult } from '@/hooks/useStrategy';
import { KeyResultFormDialog } from '@/components/strategy/KeyResultFormDialog';

interface ObjectiveDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective: StrategyObjectiveWithKrs | null;
  isAdmin: boolean;
  cycleStart?: string;
  cycleEnd?: string;
  onAddKr: () => void;
  onCheckin: (krId: string) => void;
  onEdit: () => void;
  onDeleted: () => void;
}

const statusConfig = {
  green: {
    label: 'No caminho',
    className: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    progressClass: '[&>div]:bg-emerald-500',
  },
  amber: {
    label: 'Em risco',
    className: 'border-amber-500 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    progressClass: '[&>div]:bg-amber-500',
  },
  red: {
    label: 'Crítico',
    className: 'border-red-500 text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
    progressClass: '[&>div]:bg-red-500',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthsInRange(start: string, end: string): Date[] {
  const months: Date[] = [];
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const today = new Date();
  const cutoff = endDate < today ? endDate : today;
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (current <= cutoff) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

function getLatestCheckinForMonth(
  checkins: StrategyCheckin[],
  year: number,
  month: number,
): StrategyCheckin | null {
  const inMonth = checkins.filter((c) => {
    // Use checkinDate (explicit date) falling back to createdAt for legacy records
    const dateStr = c.checkinDate ?? c.createdAt;
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return d.getFullYear() === year && d.getMonth() === month;
  });
  if (inMonth.length === 0) return null;
  return inMonth.sort((a, b) => {
    const da = new Date((a.checkinDate ?? a.createdAt) + (a.checkinDate?.length === 10 ? 'T00:00:00' : ''));
    const db2 = new Date((b.checkinDate ?? b.createdAt) + (b.checkinDate?.length === 10 ? 'T00:00:00' : ''));
    return db2.getTime() - da.getTime();
  })[0];
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

function formatValue(value: number, unit: string | null): string {
  const num = value.toLocaleString('pt-BR');
  if (!unit) return num;
  if (unit === 'R$') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (unit === '%') return `${num}%`;
  return `${num} ${unit}`;
}

// ─── KR evolution chart ───────────────────────────────────────────────────────

const confidenceColors: Record<string, string> = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
};

function KrChart({
  kr,
  cycleStart,
  cycleEnd,
}: {
  kr: StrategyKeyResult;
  cycleStart: string;
  cycleEnd: string;
}) {
  const months = getMonthsInRange(cycleStart, cycleEnd);

  const chartData = months.map((date) => {
    const checkin = getLatestCheckinForMonth(kr.checkins, date.getFullYear(), date.getMonth());
    return {
      label: formatMonthLabel(date),
      value: checkin ? checkin.currentValue : null,
      confidence: checkin ? checkin.confidence : null,
      color: checkin ? confidenceColors[getKrStatus(checkin.confidence)] : undefined,
    };
  });

  const hasData = chartData.some((d) => d.value !== null);
  if (!hasData) return null;

  const allValues = chartData.filter((d) => d.value !== null).map((d) => d.value as number);
  const minVal = Math.min(...allValues, kr.initialValue);
  const maxVal = Math.max(...allValues, kr.targetValue);
  const padding = (maxVal - minVal) * 0.15 || 5;

  return (
    <div className="mt-3 h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[Math.max(0, minVal - padding), maxVal + padding]}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v) => formatValue(v, kr.unit)}
          />
          <Tooltip
            formatter={(value: number) => [formatValue(value, kr.unit), 'Valor']}
            labelFormatter={(label) => String(label)}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine
            y={kr.targetValue}
            stroke="#6366f1"
            strokeDasharray="4 2"
            label={{ value: `Meta: ${formatValue(kr.targetValue, kr.unit)}`, fontSize: 10, fill: '#6366f1', position: 'insideTopRight' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (payload.value === null) return <g key={props.key} />;
              return (
                <circle
                  key={props.key}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={payload.color ?? '#6366f1'}
                  stroke="white"
                  strokeWidth={1.5}
                />
              );
            }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Monthly history table ─────────────────────────────────────────────────

function MonthlyHistory({
  kr,
  cycleStart,
  cycleEnd,
  onCheckin,
}: {
  kr: StrategyKeyResult;
  cycleStart: string;
  cycleEnd: string;
  onCheckin: () => void;
}) {
  const months = getMonthsInRange(cycleStart, cycleEnd);
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  if (months.length === 0) return null;

  return (
    <div className="mt-3 rounded-md border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left px-3 py-2 font-medium text-muted-foreground w-20">Mês</th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Valor</th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Confiança</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Nota</th>
            <th className="px-2 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {months.map((date) => {
            const year = date.getFullYear();
            const month = date.getMonth();
            const checkin = getLatestCheckinForMonth(kr.checkins, year, month);
            const isCurrentMonth = year === currentYear && month === currentMonth;
            const status = checkin ? getKrStatus(checkin.confidence) : null;

            return (
              <tr key={`${year}-${month}`} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 text-muted-foreground capitalize">
                  {formatMonthLabel(date)}
                  {isCurrentMonth && (
                    <span className="ml-1 text-[10px] font-semibold text-primary">(atual)</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {checkin ? formatValue(checkin.currentValue, kr.unit) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  {checkin ? (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 font-semibold',
                        status === 'green'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : status === 'amber'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          status === 'green'
                            ? 'bg-emerald-500'
                            : status === 'amber'
                              ? 'bg-amber-500'
                              : 'bg-red-500',
                        )}
                      />
                      {checkin.confidence}/10
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground max-w-[180px] truncate hidden sm:table-cell">
                  {checkin?.notes ?? '—'}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={onCheckin}
                  >
                    {checkin ? 'Atualizar' : '+ Check-in'}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── KR Detail Row ────────────────────────────────────────────────────────────

function KrDetailRow({
  kr,
  isAdmin,
  cycleStart,
  cycleEnd,
  onCheckin,
  onEdit,
  onDelete,
}: {
  kr: StrategyKeyResult;
  isAdmin: boolean;
  cycleStart?: string;
  cycleEnd?: string;
  onCheckin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = getKrStatus(kr.confidence);
  const progress = getKrProgress(kr.currentValue, kr.targetValue, kr.direction, kr.initialValue);
  const cfg = statusConfig[status];
  const hasMonthlyData = !!cycleStart && !!cycleEnd;

  return (
    <div className="py-3 border-b last:border-0">
      <div className="flex items-start gap-2 mb-2">
        {hasMonthlyData && (
          <button
            className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Recolher histórico' : 'Expandir histórico'}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{kr.title}</p>
          {kr.direction === 'lower_is_better' && (
            <span className="inline-block mt-0.5 text-[10px] text-muted-foreground">
              ↓ Quanto menor, melhor
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={onCheckin}
          >
            Check-in
          </Button>
        </div>
      </div>

      <div className={cn('flex items-center gap-3 mb-1', !hasMonthlyData && 'pl-0', hasMonthlyData && 'pl-6')}>
        <div className="flex-1">
          <Progress value={progress} className={cn('h-1.5', cfg.progressClass)} />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
          {progress}%
        </span>
        <span
          className={cn(
            'flex items-center gap-1 text-[11px] font-semibold shrink-0',
            status === 'green'
              ? 'text-emerald-600 dark:text-emerald-400'
              : status === 'amber'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400',
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          {kr.confidence}/10
        </span>
      </div>

      <div className={cn('flex items-center gap-4 text-[11px] text-muted-foreground', hasMonthlyData && 'pl-6')}>
        <span>
          Atual:{' '}
          <span className="font-medium text-foreground">
            {formatValue(kr.currentValue, kr.unit)}
          </span>
        </span>
        <span>
          Meta:{' '}
          <span className="font-medium text-foreground">
            {formatValue(kr.targetValue, kr.unit)}
          </span>
        </span>
        {kr.ownerName && (
          <span className="flex items-center gap-1 ml-auto">
            <User className="h-3 w-3" />
            {kr.ownerName}
          </span>
        )}
      </div>

      {expanded && hasMonthlyData && (
        <div className={cn('mt-1', hasMonthlyData && 'pl-6')}>
          <KrChart kr={kr} cycleStart={cycleStart!} cycleEnd={cycleEnd!} />
          <MonthlyHistory
            kr={kr}
            cycleStart={cycleStart!}
            cycleEnd={cycleEnd!}
            onCheckin={onCheckin}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function ObjectiveDetailModal({
  open,
  onOpenChange,
  objective,
  isAdmin,
  cycleStart,
  cycleEnd,
  onAddKr,
  onCheckin,
  onEdit,
  onDeleted,
}: ObjectiveDetailModalProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteKrId, setConfirmDeleteKrId] = useState<string | null>(null);
  const [editingKr, setEditingKr] = useState<StrategyKeyResult | null>(null);
  const deleteObjective = useDeleteStrategyObjective();
  const deleteKr = useDeleteStrategyKeyResult();

  if (!objective) return null;

  const objectiveStatus = getKrStatus(objective.avgConfidence);
  const cfg = statusConfig[objectiveStatus];

  function handleDelete() {
    deleteObjective.mutate(objective!.id, {
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        onOpenChange(false);
        onDeleted();
      },
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-start gap-3 pr-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <Badge
                    variant="outline"
                    className={cn('text-[11px] font-semibold', cfg.className)}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', cfg.dot)} />
                    {cfg.label}
                  </Badge>
                  {objective.avgProgress > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      {objective.avgProgress}% médio
                    </span>
                  )}
                </div>
                <DialogTitle className="text-xl leading-snug">{objective.title}</DialogTitle>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={onEdit}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>

            {(objective.description || objective.ownerName) && (
              <div className="mt-2 space-y-1">
                {objective.description && (
                  <p className="text-sm text-muted-foreground">{objective.description}</p>
                )}
                {objective.ownerName && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {objective.ownerName}
                  </p>
                )}
              </div>
            )}
          </DialogHeader>

          <Separator />

          <div className="flex-1 overflow-y-auto min-h-0 py-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">
                Key Results{' '}
                <span className="text-muted-foreground font-normal">
                  ({objective.keyResults.length})
                </span>
              </p>
              {cycleStart && cycleEnd && (
                <p className="text-[11px] text-muted-foreground">
                  Clique em <ChevronRight className="inline h-3 w-3" /> para ver histórico mensal
                </p>
              )}
            </div>

            {objective.keyResults.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum Key Result cadastrado.
              </p>
            ) : (
              <div>
                {objective.keyResults.map((kr) => (
                  <KrDetailRow
                    key={kr.id}
                    kr={kr}
                    isAdmin={isAdmin}
                    cycleStart={cycleStart}
                    cycleEnd={cycleEnd}
                    onCheckin={() => onCheckin(kr.id)}
                    onEdit={() => setEditingKr(kr)}
                    onDelete={() => setConfirmDeleteKrId(kr.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 flex-row justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={deleteObjective.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Excluir objetivo
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={onAddKr}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Adicionar Key Result
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso também excluirá todos os Key Results associados. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeleteKrId} onOpenChange={(open) => { if (!open) setConfirmDeleteKrId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Key Result?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteKr.mutate(confirmDeleteKrId!, {
                  onSuccess: () => setConfirmDeleteKrId(null),
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteKr.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingKr && (
        <KeyResultFormDialog
          open={!!editingKr}
          onOpenChange={(open) => { if (!open) setEditingKr(null); }}
          keyResult={editingKr}
        />
      )}
    </>
  );
}
