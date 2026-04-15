import { useState, useMemo, useEffect } from 'react';
import type { StrategyCycle, StrategyObjectiveWithKrs } from '@/types/strategy';
import { Plus, AlertTriangle, CheckCircle2, Info, AlertCircle, Target, Calendar, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  useStrategyCycles,
  useActiveStrategyCycle,
  useStrategyObjectives,
  useStrategyInitiatives,
  useDeleteStrategyObjective,
  useDeleteStrategyCycle,
} from '@/hooks/useStrategy';
import { CycleSelectorHeader } from '@/components/strategy/CycleSelectorHeader';
import { CycleFormDialog } from '@/components/strategy/CycleFormDialog';
import { StrategyMetricsBar } from '@/components/strategy/StrategyMetricsBar';
import { ObjectiveCard } from '@/components/strategy/ObjectiveCard';
import { ObjectiveDetailModal } from '@/components/strategy/ObjectiveDetailModal';
import { ObjectiveFormDialog } from '@/components/strategy/ObjectiveFormDialog';
import { KeyResultFormDialog } from '@/components/strategy/KeyResultFormDialog';
import { CheckinFormDialog } from '@/components/strategy/CheckinFormDialog';
import { InitiativesKanban } from '@/components/strategy/InitiativesKanban';
import { StrategyKeyResult } from '@/types/strategy';
import { computeAlerts, StrategyAlert, AlertSeverity } from '@/lib/strategyAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// ─── Alert row ────────────────────────────────────────────────────────────────

const alertConfig: Record<AlertSeverity, { icon: React.ElementType; className: string; label: string }> = {
  danger: {
    icon: AlertCircle,
    className: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
    label: 'Crítico',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
    label: 'Atenção',
  },
  info: {
    icon: Info,
    className: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
    label: 'Info',
  },
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30',
    label: 'Sucesso',
  },
};

function AlertRow({ alert }: { alert: StrategyAlert }) {
  const cfg = alertConfig[alert.severity];
  const Icon = cfg.icon;
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border px-4 py-3', cfg.className)}>
      <Icon
        className={cn(
          'h-4 w-4 mt-0.5 shrink-0',
          alert.severity === 'danger' && 'text-red-600 dark:text-red-400',
          alert.severity === 'warning' && 'text-amber-600 dark:text-amber-400',
          alert.severity === 'info' && 'text-blue-600 dark:text-blue-400',
          alert.severity === 'success' && 'text-emerald-600 dark:text-emerald-400',
        )}
      />
      <p className="text-sm flex-1">{alert.message}</p>
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] font-semibold shrink-0',
          alert.severity === 'danger' && 'border-red-400 text-red-600 dark:text-red-400',
          alert.severity === 'warning' && 'border-amber-400 text-amber-600 dark:text-amber-400',
          alert.severity === 'info' && 'border-blue-400 text-blue-600 dark:text-blue-400',
          alert.severity === 'success' && 'border-emerald-400 text-emerald-600 dark:text-emerald-400',
        )}
      >
        {cfg.label}
      </Badge>
    </div>
  );
}

// ─── Cycle list row ───────────────────────────────────────────────────────────

function CycleRow({
  cycle,
  isAdmin,
  onEdit,
  onDelete,
}: {
  cycle: StrategyCycle;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const formatDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4 px-5">
        <Target className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{cycle.title}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" />
            {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'shrink-0 text-[11px] font-semibold',
            cycle.isActive
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-muted-foreground/40 text-muted-foreground',
          )}
        >
          {cycle.isActive ? 'Ativo' : 'Encerrado'}
        </Badge>
        {isAdmin && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Strategy() {
  const { employee } = useAuth();
  const isAdmin = employee?.isAdmin ?? false;
  const canManageStrategy = isAdmin || (employee?.is_gerente ?? false);

  const { data: cycles = [], isLoading: cyclesLoading } = useStrategyCycles();
  const { data: activeCycle } = useActiveStrategyCycle();

  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const effectiveCycleId = selectedCycleId || activeCycle?.id || '';

  // Sync selected cycle when active cycle loads
  useEffect(() => {
    if (!selectedCycleId && activeCycle?.id) setSelectedCycleId(activeCycle.id);
  }, [activeCycle?.id]);

  const { data: objectives = [], isLoading: objectivesLoading } = useStrategyObjectives(
    effectiveCycleId || undefined,
  );
  const { data: initiatives = [] } = useStrategyInitiatives(effectiveCycleId || undefined);

  const alerts = useMemo(
    () => computeAlerts(objectives, activeCycle ?? null),
    [objectives, activeCycle],
  );

  // Dialog state
  const [cycleFormOpen, setCycleFormOpen] = useState(false);
  const [objectiveFormOpen, setObjectiveFormOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<StrategyObjectiveWithKrs | null>(null);
  const [krFormObjectiveId, setKrFormObjectiveId] = useState<string | null>(null);
  const [checkinKr, setCheckinKr] = useState<StrategyKeyResult | null>(null);
  const [detailObjective, setDetailObjective] = useState<StrategyObjectiveWithKrs | null>(null);

  const deleteObjective = useDeleteStrategyObjective();
  const deleteCycle = useDeleteStrategyCycle();
  const [confirmDeleteObjectiveId, setConfirmDeleteObjectiveId] = useState<string | null>(null);
  const [editingCycle, setEditingCycle] = useState<StrategyCycle | null>(null);
  const [confirmDeleteCycleId, setConfirmDeleteCycleId] = useState<string | null>(null);

  const isLoading = cyclesLoading || objectivesLoading;

  const selectedCycle = cycles.find((c) => c.id === effectiveCycleId);

  // Always reflect the latest data from the query cache in the detail modal
  const liveDetailObjective = detailObjective
    ? (objectives.find((o) => o.id === detailObjective.id) ?? detailObjective)
    : null;

  return (
    <AppLayout title="Estratégia">
      <div className="space-y-6">
        {/* Cycle selector */}
        {cycles.length > 0 && (
          <CycleSelectorHeader
            cycles={cycles}
            activeCycleId={effectiveCycleId}
            onCycleChange={setSelectedCycleId}
          />
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && cycles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Target className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum ciclo estratégico cadastrado.</p>
            {isAdmin && (
              <Button onClick={() => setCycleFormOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Criar primeiro ciclo
              </Button>
            )}
          </div>
        )}

        {!isLoading && cycles.length > 0 && (
          <Tabs defaultValue="okrs" className="space-y-6">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="okrs">OKRs</TabsTrigger>
              <TabsTrigger value="initiatives">Iniciativas</TabsTrigger>
              <TabsTrigger value="alerts" className="relative">
                Alertas
                {alerts.filter((a) => a.severity === 'danger' || a.severity === 'warning').length > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {alerts.filter((a) => a.severity === 'danger' || a.severity === 'warning').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="cycles">Ciclos</TabsTrigger>
            </TabsList>

            {/* ── OKRs ────────────────────────────────────────────────────── */}
            <TabsContent value="okrs" className="space-y-6">
              <div className="flex items-center justify-between">
                <StrategyMetricsBar objectives={objectives} initiatives={initiatives} />
              </div>
              {canManageStrategy && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => { setEditingObjective(null); setObjectiveFormOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Novo objetivo
                  </Button>
                </div>
              )}
              {objectives.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum objetivo neste ciclo.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {objectives.map((obj) => (
                    <ObjectiveCard
                      key={obj.id}
                      objective={obj}
                      isAdmin={isAdmin}
                      onClick={() => setDetailObjective(obj)}
                      onAddKr={() => setKrFormObjectiveId(obj.id)}
                      onEditObjective={() => {
                        setEditingObjective(obj);
                        setObjectiveFormOpen(true);
                      }}
                      onCheckin={(krId) => {
                        const kr = obj.keyResults.find((k) => k.id === krId);
                        if (kr) setCheckinKr(kr);
                      }}
                      onDeleteObjective={() => setConfirmDeleteObjectiveId(obj.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Iniciativas ─────────────────────────────────────────────── */}
            <TabsContent value="initiatives">
              <InitiativesKanban
                initiatives={initiatives}
                objectives={objectives}
                cycleId={effectiveCycleId}
              />
            </TabsContent>

            {/* ── Alertas ─────────────────────────────────────────────────── */}
            <TabsContent value="alerts" className="space-y-3">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">Nenhum alerta ativo. Tudo certo!</p>
                </div>
              ) : (
                alerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)
              )}
            </TabsContent>

            {/* ── Ciclos ──────────────────────────────────────────────────── */}
            <TabsContent value="cycles" className="space-y-4">
              {isAdmin && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setCycleFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Novo ciclo
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                {cycles.map((cycle) => (
                  <CycleRow
                    key={cycle.id}
                    cycle={cycle}
                    isAdmin={isAdmin}
                    onEdit={() => { setEditingCycle(cycle); setCycleFormOpen(true); }}
                    onDelete={() => setConfirmDeleteCycleId(cycle.id)}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Dialogs */}
      <CycleFormDialog
        open={cycleFormOpen}
        onOpenChange={(open) => { setCycleFormOpen(open); if (!open) setEditingCycle(null); }}
        cycle={editingCycle}
      />

      {effectiveCycleId && (
        <ObjectiveFormDialog
          open={objectiveFormOpen}
          onOpenChange={(open) => {
            setObjectiveFormOpen(open);
            if (!open) setEditingObjective(null);
          }}
          cycleId={effectiveCycleId}
          objective={editingObjective}
        />
      )}

      {krFormObjectiveId && (
        <KeyResultFormDialog
          open={!!krFormObjectiveId}
          onOpenChange={(open) => { if (!open) setKrFormObjectiveId(null); }}
          objectiveId={krFormObjectiveId}
        />
      )}

      {checkinKr && (
        <CheckinFormDialog
          open={!!checkinKr}
          onOpenChange={(open) => { if (!open) setCheckinKr(null); }}
          keyResult={checkinKr}
        />
      )}

      <ObjectiveDetailModal
        open={!!detailObjective}
        onOpenChange={(open) => { if (!open) setDetailObjective(null); }}
        objective={liveDetailObjective}
        isAdmin={isAdmin}
        cycleStart={selectedCycle?.startDate}
        cycleEnd={selectedCycle?.endDate}
        onAddKr={() => {
          if (liveDetailObjective) setKrFormObjectiveId(liveDetailObjective.id);
        }}
        onCheckin={(krId) => {
          const kr = liveDetailObjective?.keyResults.find((k) => k.id === krId);
          if (kr) setCheckinKr(kr);
        }}
        onEdit={() => {
          setEditingObjective(liveDetailObjective);
          setObjectiveFormOpen(true);
        }}
        onDeleted={() => setDetailObjective(null)}
      />

      <AlertDialog
        open={!!confirmDeleteCycleId}
        onOpenChange={(open) => { if (!open) setConfirmDeleteCycleId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ciclo?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os objetivos, Key Results e iniciativas deste ciclo serão excluídos. Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteCycle.mutate(confirmDeleteCycleId!, {
                  onSuccess: () => setConfirmDeleteCycleId(null),
                });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDeleteObjectiveId}
        onOpenChange={(open) => { if (!open) setConfirmDeleteObjectiveId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso também excluirá todos os Key Results associados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteObjective.mutate(confirmDeleteObjectiveId!, {
                  onSuccess: () => setConfirmDeleteObjectiveId(null),
                });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
