import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  strategyCycleService,
  strategyObjectiveService,
  strategyKeyResultService,
  strategyCheckinService,
  strategyInitiativeService,
  guardrailService,
} from '@/services/strategyService';
import {
  dbToStrategyCycle,
  dbToStrategyObjective,
  dbToStrategyKeyResult,
  dbToStrategyInitiative,
  dbToStrategyCheckin,
  dbToGuardrail,
  StrategyObjectiveWithKrs,
  getKrProgress,
  CreateStrategyCycleInput,
  UpdateStrategyCycleInput,
  CreateStrategyObjectiveInput,
  UpdateStrategyObjectiveInput,
  CreateStrategyKeyResultInput,
  UpdateStrategyKeyResultInput,
  CreateStrategyCheckinInput,
  CreateStrategyInitiativeInput,
  UpdateStrategyInitiativeInput,
  StrategyInitiativeDB,
  CreateGuardrailInput,
  UpdateGuardrailInput,
} from '@/types/strategy';

// ─── Cycles ───────────────────────────────────────────────────────────────────

export function useStrategyCycles() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: ['strategy_cycles', tenantId],
    queryFn: async () => {
      const rows = await strategyCycleService.getAll(tenantId!);
      return rows.map(dbToStrategyCycle);
    },
    enabled: !!tenantId,
  });
}

export function useActiveStrategyCycle() {
  const { data: cycles = [], ...rest } = useStrategyCycles();
  return { ...rest, data: cycles.find((c) => c.isActive) ?? null };
}

export function useCreateStrategyCycle() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: CreateStrategyCycleInput) =>
      strategyCycleService.create(input, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_cycles'] });
      toast({ title: 'Ciclo criado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar ciclo', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateStrategyCycle() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateStrategyCycleInput }) =>
      strategyCycleService.update(id, updates, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_cycles'] });
      toast({ title: 'Ciclo atualizado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar ciclo', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteStrategyCycle() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (id: string) =>
      strategyCycleService.delete(id, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_cycles'] });
      toast({ title: 'Ciclo removido com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover ciclo', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Objectives ───────────────────────────────────────────────────────────────

export function useStrategyObjectives(cycleId: string | undefined) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: ['strategy_objectives', cycleId, tenantId],
    queryFn: async (): Promise<StrategyObjectiveWithKrs[]> => {
      const rows = await strategyObjectiveService.getAll(cycleId!, tenantId!);
      return rows.map((row) => {
        const objective = dbToStrategyObjective(row);
        const keyResults = ((row as any).key_results ?? []).map(dbToStrategyKeyResult);

        const avgProgress =
          keyResults.length > 0
            ? Math.round(
                keyResults.reduce(
                  (sum: number, kr: any) => sum + getKrProgress(kr.currentValue, kr.targetValue, kr.direction, kr.initialValue),
                  0,
                ) / keyResults.length,
              )
            : 0;

        const avgConfidence =
          keyResults.length > 0
            ? Math.round(
                (keyResults.reduce((sum: number, kr: any) => sum + kr.confidence, 0) /
                  keyResults.length) *
                  10,
              ) / 10
            : 0;

        return { ...objective, keyResults, avgProgress, avgConfidence };
      });
    },
    enabled: !!tenantId && !!cycleId,
  });
}

export function useCreateStrategyObjective() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: CreateStrategyObjectiveInput) =>
      strategyObjectiveService.create(input, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_objectives'] });
      toast({ title: 'Objetivo criado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar objetivo', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateStrategyObjective() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateStrategyObjectiveInput }) =>
      strategyObjectiveService.update(id, updates, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_objectives'] });
      toast({ title: 'Objetivo atualizado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar objetivo', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteStrategyObjective() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (id: string) =>
      strategyObjectiveService.delete(id, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_objectives'] });
      toast({ title: 'Objetivo removido' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover objetivo', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Key Results ──────────────────────────────────────────────────────────────

export function useCreateStrategyKeyResult() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: CreateStrategyKeyResultInput) =>
      strategyKeyResultService.create(input, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_objectives'] });
      toast({ title: 'Key Result criado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar Key Result', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateStrategyKeyResult() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateStrategyKeyResultInput }) =>
      strategyKeyResultService.update(id, updates, employee!.tenant_id, employee!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_objectives'] });
      toast({ title: 'Key Result atualizado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar Key Result', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteStrategyKeyResult() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (id: string) =>
      strategyKeyResultService.delete(id, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_objectives'] });
      toast({ title: 'Key Result removido' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover Key Result', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Checkins ─────────────────────────────────────────────────────────────────

export function useCreateStrategyCheckin() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: CreateStrategyCheckinInput) =>
      strategyCheckinService.create(input, employee!.tenant_id, employee!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_objectives'] });
      toast({ title: 'Check-in registrado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao registrar check-in', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Initiatives ──────────────────────────────────────────────────────────────

export function useStrategyInitiatives(cycleId: string | undefined) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: ['strategy_initiatives', cycleId, tenantId],
    queryFn: async () => {
      const rows = await strategyInitiativeService.getAll(cycleId!, tenantId!);
      return rows.map(dbToStrategyInitiative);
    },
    enabled: !!tenantId && !!cycleId,
  });
}

export function useCreateStrategyInitiative() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: CreateStrategyInitiativeInput) =>
      strategyInitiativeService.create(input, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_initiatives'] });
      toast({ title: 'Iniciativa criada com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar iniciativa', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateStrategyInitiative() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateStrategyInitiativeInput }) =>
      strategyInitiativeService.update(id, updates, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_initiatives'] });
      toast({ title: 'Iniciativa atualizada com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar iniciativa', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateInitiativeStatus() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: ({
      id,
      status,
      position,
    }: {
      id: string;
      status: StrategyInitiativeDB['status'];
      position: number;
    }) => strategyInitiativeService.updateStatus(id, status, position, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_initiatives'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao mover iniciativa', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteStrategyInitiative() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (id: string) =>
      strategyInitiativeService.delete(id, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_initiatives'] });
      toast({ title: 'Iniciativa removida' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover iniciativa', description: err.message, variant: 'destructive' });
    },
  });
}

export function useReorderInitiatives() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (updates: { id: string; position: number }[]) =>
      strategyInitiativeService.reorder(updates, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_initiatives'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao reordenar iniciativas', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Guardrails ───────────────────────────────────────────────────────────────

export function useGuardrails(cycleId: string | undefined) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: ['strategy_guardrails', cycleId, tenantId],
    queryFn: async () => {
      const rows = await guardrailService.getAll(cycleId!, tenantId!);
      return rows.map(dbToGuardrail);
    },
    enabled: !!tenantId && !!cycleId,
  });
}

export function useCreateGuardrail() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: CreateGuardrailInput) =>
      guardrailService.create(input, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_guardrails'] });
      toast({ title: 'Guardrail criado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar guardrail', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateGuardrail() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateGuardrailInput }) =>
      guardrailService.update(id, updates, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_guardrails'] });
      toast({ title: 'Guardrail atualizado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar guardrail', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteGuardrail() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (id: string) =>
      guardrailService.delete(id, employee!.tenant_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strategy_guardrails'] });
      toast({ title: 'Guardrail removido' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover guardrail', description: err.message, variant: 'destructive' });
    },
  });
}
