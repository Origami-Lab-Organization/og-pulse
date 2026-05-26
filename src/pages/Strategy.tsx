import { useState, useEffect } from 'react';
import type { StrategyCycle, StrategyObjectiveWithKrs, Guardrail } from '@/types/strategy';
import { Plus, Target, Calendar, Pencil, Trash2, Download, XCircle, RefreshCw, ShieldAlert } from 'lucide-react';
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
  useUpdateStrategyCycle,
  useGuardrails,
  useDeleteGuardrail,
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
import { GuardrailFormDialog } from '@/components/strategy/GuardrailFormDialog';
import { GuardrailUpdateDialog } from '@/components/strategy/GuardrailUpdateDialog';
import { StrategyKeyResult } from '@/types/strategy';
import { exportStrategyToMarkdown } from '@/lib/exportStrategy';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';



// ─── Cycle list row ───────────────────────────────────────────────────────────

function CycleRow({
  cycle,
  isAdmin,
  onEdit,
  onDelete,
  onClose,
}: {
  cycle: StrategyCycle;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose?: () => void;
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
            {cycle.isActive && onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                title="Encerrar ciclo"
                onClick={onClose}
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            )}
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

// ─── Guardrail card ───────────────────────────────────────────────────────────

const statusConfig = {
  ok:       { label: 'OK',       className: 'border-emerald-500 text-emerald-600 dark:text-emerald-400' },
  violated: { label: 'Violado',  className: 'border-red-500 text-red-600 dark:text-red-400' },
  unknown:  { label: 'Sem valor',className: 'border-muted-foreground/40 text-muted-foreground' },
};

function GuardrailCard({
  guardrail,
  isAdmin,
  cycleIsActive,
  onEdit,
  onUpdate,
  onDelete,
}: {
  guardrail: Guardrail;
  isAdmin: boolean;
  cycleIsActive: boolean;
  onEdit: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const cfg = statusConfig[guardrail.status];

  const formatVal = (v: number | null) => {
    if (v === null) return '—';
    const num = v.toLocaleString('pt-BR');
    if (!guardrail.unit) return num;
    if (guardrail.unit === 'R$') return `R$ ${num}`;
    return `${num}${guardrail.unit}`;
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4 px-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <Badge variant="outline" className={cn('text-[11px] font-semibold shrink-0', cfg.className)}>
              {cfg.label}
            </Badge>
            <span className="text-xs text-muted-foreground shrink-0">
              Atual: <span className="font-medium text-foreground">{formatVal(guardrail.currentValue)}</span>
              {' '}
              <span className="text-muted-foreground">
                Limite: {guardrail.operator} {formatVal(guardrail.threshold)}
              </span>
            </span>
          </div>
          <p className="font-semibold truncate">{guardrail.title}</p>
          {guardrail.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{guardrail.description}</p>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-0.5 shrink-0">
            {cycleIsActive && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Atualizar valor"
                  onClick={onUpdate}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Editar"
                  onClick={onEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              title="Excluir"
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
  const canManageOkrs = isAdmin;
  const canManageInitiatives = isAdmin || (employee?.is_gerente ?? false);

  const { data: cycles = [], isLoading: cyclesLoading } = useStrategyCycles();
  const { data: activeCycle } = useActiveStrategyCycle();

  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const effectiveCycleId = selectedCycleId || activeCycle?.id || '';

  // Sync selected cycle when active cycle loads
  useEffect(() => {
    if (!selectedCycleId && activeCycle?.id) setSelectedCycleId(activeCycle.id);
  }, [activeCycle?.id, selectedCycleId]);

  const { data: objectives = [], isLoading: objectivesLoading } = useStrategyObjectives(
    effectiveCycleId || undefined,
  );
  const { data: initiatives = [] } = useStrategyInitiatives(effectiveCycleId || undefined);
  const { data: guardrails = [] } = useGuardrails(effectiveCycleId || undefined);

  // Dialog state
  const [cycleFormOpen, setCycleFormOpen] = useState(false);
  const [objectiveFormOpen, setObjectiveFormOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<StrategyObjectiveWithKrs | null>(null);
  const [krFormObjectiveId, setKrFormObjectiveId] = useState<string | null>(null);
  const [checkinKr, setCheckinKr] = useState<StrategyKeyResult | null>(null);
  const [detailObjective, setDetailObjective] = useState<StrategyObjectiveWithKrs | null>(null);

  const deleteObjective = useDeleteStrategyObjective();
  const deleteCycle = useDeleteStrategyCycle();
  const updateCycle = useUpdateStrategyCycle();
  const deleteGuardrail = useDeleteGuardrail();
  const [confirmDeleteObjectiveId, setConfirmDeleteObjectiveId] = useState<string | null>(null);
  const [editingCycle, setEditingCycle] = useState<StrategyCycle | null>(null);
  const [confirmDeleteCycleId, setConfirmDeleteCycleId] = useState<string | null>(null);
  const [confirmCloseCycleId, setConfirmCloseCycleId] = useState<string | null>(null);
  const [guardrailFormOpen, setGuardrailFormOpen] = useState(false);
  const [editingGuardrail, setEditingGuardrail] = useState<Guardrail | null>(null);
  const [updatingGuardrail, setUpdatingGuardrail] = useState<Guardrail | null>(null);
  const [confirmDeleteGuardrailId, setConfirmDeleteGuardrailId] = useState<string | null>(null);

  const isLoading = cyclesLoading || objectivesLoading;

  const selectedCycle = cycles.find((c) => c.id === effectiveCycleId);
  const isCycleActive = selectedCycle?.isActive ?? false;

  function handleExportReport() {
    if (!selectedCycle) return;
    exportStrategyToMarkdown({ cycle: selectedCycle, objectives, initiatives, alerts: [] });
  }

  // Always reflect the latest data from the query cache in the detail modal
  const liveDetailObjective = detailObjective
    ? (objectives.find((o) => o.id === detailObjective.id) ?? detailObjective)
    : null;

  return (
    <AppLayout
      title="Estratégia"
      actions={
        selectedCycle ? (
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar relatório
          </Button>
        ) : undefined
      }
    >
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
              <TabsTrigger value="guardrails" className="relative">
                Guardrails
                {guardrails.filter((g) => g.status === 'violated').length > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {guardrails.filter((g) => g.status === 'violated').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="initiatives">Iniciativas</TabsTrigger>
              <TabsTrigger value="cycles">Ciclos</TabsTrigger>
            </TabsList>

            {/* ── OKRs ────────────────────────────────────────────────────── */}
            <TabsContent value="okrs" className="space-y-6">
              <div className="flex items-center justify-between">
                <StrategyMetricsBar objectives={objectives} initiatives={initiatives} />
              </div>
              {canManageOkrs && isCycleActive && (
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
                <div className="grid gap-4 sm:grid-cols-2">
                  {objectives.map((obj) => (
                    <ObjectiveCard
                      key={obj.id}
                      objective={obj}
                      canManageOkrs={canManageOkrs}
                      cycleIsActive={isCycleActive}
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

            {/* ── Guardrails ──────────────────────────────────────────────── */}
            <TabsContent value="guardrails" className="space-y-4">
              {isAdmin && isCycleActive && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => { setEditingGuardrail(null); setGuardrailFormOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Novo guardrail
                  </Button>
                </div>
              )}
              {guardrails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <ShieldAlert className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">Nenhum guardrail cadastrado neste ciclo.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {guardrails.map((g) => (
                    <GuardrailCard
                      key={g.id}
                      guardrail={g}
                      isAdmin={isAdmin}
                      cycleIsActive={isCycleActive}
                      onEdit={() => { setEditingGuardrail(g); setGuardrailFormOpen(true); }}
                      onUpdate={() => setUpdatingGuardrail(g)}
                      onDelete={() => setConfirmDeleteGuardrailId(g.id)}
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
                cycleIsActive={isCycleActive}
                canManageInitiatives={canManageInitiatives}
              />
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
                    onClose={cycle.isActive ? () => setConfirmCloseCycleId(cycle.id) : undefined}
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
        canManageOkrs={canManageOkrs}
        cycleIsActive={isCycleActive}
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

      {effectiveCycleId && (
        <GuardrailFormDialog
          open={guardrailFormOpen}
          onOpenChange={(open) => { setGuardrailFormOpen(open); if (!open) setEditingGuardrail(null); }}
          cycleId={effectiveCycleId}
          guardrail={editingGuardrail}
        />
      )}

      <GuardrailUpdateDialog
        open={!!updatingGuardrail}
        onOpenChange={(open) => { if (!open) setUpdatingGuardrail(null); }}
        guardrail={updatingGuardrail}
      />

      <AlertDialog
        open={!!confirmDeleteGuardrailId}
        onOpenChange={(open) => { if (!open) setConfirmDeleteGuardrailId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir guardrail?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteGuardrail.mutate(confirmDeleteGuardrailId!, {
                  onSuccess: () => setConfirmDeleteGuardrailId(null),
                });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        open={!!confirmCloseCycleId}
        onOpenChange={(open) => { if (!open) setConfirmCloseCycleId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar ciclo?</AlertDialogTitle>
            <AlertDialogDescription>
              O ciclo será marcado como encerrado e não aparecerá mais como ativo. Os dados de OKRs
              e iniciativas serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                updateCycle.mutate(
                  { id: confirmCloseCycleId!, updates: { is_active: false } },
                  { onSuccess: () => setConfirmCloseCycleId(null) },
                );
              }}
            >
              Encerrar
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
