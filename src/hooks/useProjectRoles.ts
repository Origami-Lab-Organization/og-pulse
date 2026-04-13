import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { equipeService } from '@/services/equipeService';
import {
  AddAllocationPayload,
  ProjectAllocation,
  ProjectAllocationWithEmployee,
} from '@/types/equipe.types';

// ─── Aggregate raw rows → one entry per employee ──────────────────────────────

function groupAllocations(raw: ProjectAllocationWithEmployee[]): ProjectAllocation[] {
  const map = new Map<string, ProjectAllocation>();

  for (const row of raw) {
    const key = row.employee_id;
    if (!map.has(key)) {
      map.set(key, {
        employeeId: row.employee_id,
        employee: row.employee,
        budgetRoleId: row.budget_role_id,
        budgetRole: row.budget_role ?? null,
        customRoleName: row.custom_role_name,
        roleName:
          (row.budget_role as any)?.role_name ??
          row.custom_role_name ??
          '—',
        monthlyHours: [],
        totalHours: 0,
      });
    }
    const entry = map.get(key)!;
    const hours = Number(row.planned_hours);
    entry.monthlyHours.push({ year: row.year, month: row.month, plannedHours: hours });
    entry.totalHours += hours;
  }

  return Array.from(map.values());
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useProjectAllocations = (projectId: string) => {
  return useQuery({
    queryKey: ['project-allocations', projectId],
    queryFn: async () => {
      const raw = await equipeService.getProjectAllocations(projectId);
      return groupAllocations(raw);
    },
    enabled: !!projectId,
  });
};

export const useAddAllocation = (projectId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: AddAllocationPayload) => {
      const rows = payload.monthlyHours.map((mh) => ({
        project_id: payload.projectId,
        tenant_id: payload.tenantId,
        employee_id: payload.employeeId,
        budget_role_id: payload.budgetRoleId ?? null,
        custom_role_name: payload.customRoleName ?? null,
        year: mh.year,
        month: mh.month,
        planned_hours: mh.plannedHours,
      }));
      await equipeService.upsertAllocations(rows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-allocations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-allocations-filled-roles', projectId] });
      toast({ title: 'Funcionário alocado com sucesso' });
      onSuccess?.();
    },
    onError: () => {
      toast({ title: 'Erro ao alocar funcionário. Tente novamente.', variant: 'destructive' });
    },
  });
};

export const useRemoveAllocation = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ employeeId }: { employeeId: string }) =>
      equipeService.deleteEmployeeAllocations(projectId, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-allocations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-allocations-filled-roles', projectId] });
      toast({ title: 'Alocação removida' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover alocação', variant: 'destructive' });
    },
  });
};
