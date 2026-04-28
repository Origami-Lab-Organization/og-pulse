import { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, TrendingUp, TrendingDown, Minus, User } from 'lucide-react';
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
  KrDirection,
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
  cycleIsActive: boolean;
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

function checkinDate(c: StrategyCheckin): Date {
  const s = c.checkinDate ?? c.createdAt;
  return new Date(s.length === 10 ? s + 'T00:00:00' : s);
}

function sortedCheckins(checkins: StrategyCheckin[], order: 'asc' | 'desc' = 'asc'): StrategyCheckin[] {
  return [...checkins].sort((a, b) => {
    const diff = checkinDate(a).getTime() - checkinDate(b).getTime();
    return order === 'asc' ? diff : -diff;
  });
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

function getCheckinDelta(
  current: StrategyCheckin,
  previous: StrategyCheckin | undefined,
  unit: string | null,
  direction: KrDirection,
): { text: string; isGood: boolean; isZero: boolean } | null {
  if (!previous) return null;
  const delta = current.currentValue - previous.currentValue;
  if (delta === 0) return { text: '0', isGood: false, isZero: true };
  const sign = delta > 0 ? '+' : '';
  const isGood = direction === 'lower_is_better' ? delta < 0 : delta > 0;
  return { text: `${sign}${formatValue(delta, unit)}`, isGood, isZero: false };
}

// ─── KR evolution chart (individual check-ins) ───────────────────────────────

const confidenceColors: Record<string, string> = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
};

function KrChart({ kr }: { kr: StrategyKeyResult }) {
  const ordered = sortedCheckins(kr.checkins, 'asc');
  if (ordered.length === 0) return null;

  const chartData = ordered.map((c) => {
    const d = checkinDate(c);
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return {
      label,
      fullDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      value: c.currentValue,
      confidence: c.confidence,
      notes: c.notes,
      color: confidenceColors[getKrStatus(c.confidence)],
    };
  });

  const allValues = chartData.map((d) => d.value);
  const minVal = Math.min(...allValues, kr.initialValue);
  const maxVal = Math.max(...allValues, kr.targetValue);
  const padding = (maxVal - minVal) * 0.15 || 5;

  return (
    <div className="mt-3 h-44">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis
            domain={[Math.max(0, minVal - padding), maxVal + padding]}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v) => formatValue(v, kr.unit)}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              const status = getKrStatus(d.confidence);
              return (
                <div className="rounded-md border bg-popover p-2 text-[11px] shadow-md space-y-0.5">
                  <p className="font-semibold">{d.fullDate}</p>
                  <p>Valor: <span className="font-medium">{formatValue(d.value, kr.unit)}</span></p>
                  <p className={cn(
                    'font-medium',
                    status === 'green' ? 'text-emerald-600' : status === 'amber' ? 'text-amber-600' : 'text-red-600',
                  )}>
                    Confiança: {d.confidence}/10
                  </p>
                  {d.notes && <p className="text-muted-foreground max-w-[180px] line-clamp-2">{d.notes}</p>}
                </div>
              );
            }}
          />
          <ReferenceLine
            y={kr.targetValue}
            stroke="#6366f1"
            strokeDasharray="4 2"
            label={{ value: `Meta: ${formatValue(kr.targetValue, kr.unit)}`, fontSize: 10, fill: '#6366f1', position: 'insideTopRight' }}
          />
          {kr.initialValue !== kr.targetValue && (
            <ReferenceLine
              y={kr.initialValue}
              stroke="#94a3b8"
              strokeDasharray="2 2"
              label={{ value: `Início: ${formatValue(kr.initialValue, kr.unit)}`, fontSize: 10, fill: '#94a3b8', position: 'insideBottomRight' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
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
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Checkin history table ─────────────────────────────────────────────────

function CheckinHistory({ kr }: { kr: StrategyKeyResult }) {
  const desc = sortedCheckins(kr.checkins, 'desc');
  // chronological order for delta calculation (older → newer)
  const asc = sortedCheckins(kr.checkins, 'asc');

  if (desc.length === 0) {
    return (
      <p className="mt-3 text-center text-xs text-muted-foreground py-3">
        Nenhum check-in registrado ainda. Use o botão <span className="font-medium">Check-in</span> para registrar o primeiro.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-md border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left px-3 py-2 font-medium text-muted-foreground w-24">Data</th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Valor</th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Δ variação</th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Confiança</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Nota</th>
          </tr>
        </thead>
        <tbody>
          {desc.map((c) => {
            const ascIdx = asc.findIndex((x) => x.id === c.id);
            const prev = asc[ascIdx - 1];
            const delta = getCheckinDelta(c, prev, kr.unit, kr.direction);
            const status = getKrStatus(c.confidence);
            const dateStr = checkinDate(c).toLocaleDateString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            });

            return (
              <tr key={c.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{dateStr}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {formatValue(c.currentValue, kr.unit)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {delta === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : delta.isZero ? (
                    <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                      <Minus className="h-3 w-3" /> {delta.text}
                    </span>
                  ) : (
                    <span className={cn(
                      'inline-flex items-center gap-0.5 font-medium',
                      delta.isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                    )}>
                      {delta.isGood
                        ? <TrendingUp className="h-3 w-3" />
                        : <TrendingDown className="h-3 w-3" />}
                      {delta.text}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={cn(
                    'inline-flex items-center gap-1 font-semibold',
                    status === 'green'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : status === 'amber'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400',
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', {
                      'bg-emerald-500': status === 'green',
                      'bg-amber-500': status === 'amber',
                      'bg-red-500': status === 'red',
                    })} />
                    {c.confidence}/10
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate hidden sm:table-cell"
                    title={c.notes ?? undefined}>
                  {c.notes ?? '—'}
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
  cycleIsActive,
  cycleStart,
  cycleEnd,
  onCheckin,
  onEdit,
  onDelete,
}: {
  kr: StrategyKeyResult;
  isAdmin: boolean;
  cycleIsActive: boolean;
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

  return (
    <div className="py-3 border-b last:border-0">
      <div className="flex items-start gap-2 mb-2">
        <button
          className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Recolher histórico' : 'Expandir histórico'}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{kr.title}</p>
          {kr.direction === 'lower_is_better' && (
            <span className="inline-block mt-0.5 text-[10px] text-muted-foreground">
              ↓ Quanto menor, melhor
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && cycleIsActive && (
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
          {cycleIsActive && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={onCheckin}
            >
              Check-in
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-1 pl-6">
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

      <div className="flex items-center gap-4 text-[11px] text-muted-foreground pl-6">
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
      </div>

      {expanded && (
        <div className="mt-1 pl-6">
          <KrChart kr={kr} />
          <CheckinHistory kr={kr} />
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
  cycleIsActive,
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
              {isAdmin && cycleIsActive && (
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
              <p className="text-[11px] text-muted-foreground">
                Clique em <ChevronRight className="inline h-3 w-3" /> para ver histórico de check-ins
              </p>
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
                    cycleIsActive={cycleIsActive}
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
              {isAdmin && cycleIsActive && (
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
              {isAdmin && cycleIsActive && (
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
