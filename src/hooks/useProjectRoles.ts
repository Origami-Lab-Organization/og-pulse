import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { equipeService } from '@/services/equipeService';
import { ProjectWithRelations } from '@/types/project';
import {
  AddAllocationPayload,
  ProjectAllocation,
  ProjectAllocationWithEmployee,
  ProjectTeamRowDB,
  CreateProjectRolePayload,
  TeamAllocationRow,
  TeamMonthCell,
} from '@/types/equipe.types';
import { useProjectBudgetRoles } from '@/hooks/useProjectBudgetRoles';
import { useProjectRealizedHours } from '@/hooks/useProjectRealizedHours';
import { getEmployeeMonthLoad, useTenantMonthlyCapacitySummary } from '@/hooks/useTenantMonthlyCapacitySummary';
import { buildProjectMonths } from '@/lib/projectMonths';
import { invalidateAllocationQueries } from '@/lib/allocationInvalidation';

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
          row.budget_role?.role_name ??
          row.custom_role_name ??
          '—',
        monthlyHours: [],
        totalHours: 0,
      });
    }
    const entry = map.get(key)!;
    const hours = Number(row.planned_hours);
    entry.monthlyHours.push({
      id: row.id,
      year: row.year,
      month: row.month,
      plannedHours: hours,
      costPerHour: row.cost_per_hour == null ? null : Number(row.cost_per_hour),
    });
    entry.totalHours += hours;
  }

  return Array.from(map.values());
}

function monthKey(year: number, month: number) {
  return `${year}-${month}`;
}

function isFutureMonth(year: number, month: number, today: Date) {
  const current = today.getFullYear() * 12 + today.getMonth();
  const target = year * 12 + (month - 1);
  return target > current;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useProjectAllocations = (projectId: string, includeCost: boolean) => {
  return useQuery({
    queryKey: ['project-allocations', projectId, includeCost],
    queryFn: async () => {
      const raw = await equipeService.getProjectAllocations(projectId, includeCost);
      return groupAllocations(raw);
    },
    enabled: !!projectId,
  });
};

export const useProjectTeamRows = (projectId: string) => {
  return useQuery({
    queryKey: ['project-team-rows', projectId],
    queryFn: () => equipeService.getProjectTeamRows(projectId),
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
      // Aba Equipe
      queryClient.invalidateQueries({ queryKey: ['project-allocations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-allocations-filled-roles', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-team-rows', projectId] });
      // Tela /alocacao
      queryClient.invalidateQueries({ queryKey: ['allocation-employee-month-summary'] });
      queryClient.invalidateQueries({ queryKey: ['allocation-employee-detail'] });
      queryClient.invalidateQueries({ queryKey: ['allocation-grid'] });
      queryClient.invalidateQueries({ queryKey: ['allocation-overview-planner'] });
      // Disponibilidade
      queryClient.invalidateQueries({ queryKey: ['employee-availability'] });
      queryClient.invalidateQueries({ queryKey: ['employee-monthly-load'] });
      // Custos / financeiro do projeto
      queryClient.invalidateQueries({ queryKey: ['project-team-financials', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-realized-hours', projectId] });
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

export const useCreateProjectRole = (projectId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: CreateProjectRolePayload) => {
      if (!employee?.tenant_id) throw new Error('No tenant');
      return equipeService.createProjectRole({
        project_id: payload.projectId,
        tenant_id: employee.tenant_id,
        role_name: payload.roleName,
        employment_type: payload.employmentType,
        payment_type: payload.paymentType,
        employee_id: payload.employeeId || null,
        freelancer_name: payload.freelancerName || null,
        freelancer_email: payload.freelancerEmail || null,
        hourly_rate: payload.hourlyRate ?? null,
        monthly_rate: payload.monthlyRate ?? null,
        clt_encargos_multiplier: payload.cltEncargosMultiplier ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-roles', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-allocations', projectId] });
      toast({ title: 'Papel adicionado com sucesso' });
      onSuccess?.();
    },
    onError: () => {
      toast({ title: 'Erro ao adicionar papel', variant: 'destructive' });
    },
  });
};

// ─── Edição inline de 1 célula (mês existente ou novo) ─────────────────────────

/**
 * Invalida todas as leituras impactadas por uma escrita de horas planejadas.
 * Fonte única de invalidação cruzada (compartilhada com a Tela de Alocação) —
 * ver `invalidateAllocationQueries`. `projectId` mantido por compatibilidade de
 * assinatura; a invalidação é por prefixo (cobre todos os projetos/pessoas).
 */
function invalidateAllocationDependents(queryClient: ReturnType<typeof useQueryClient>, _projectId: string) {
  invalidateAllocationQueries(queryClient);
}

/**
 * Escrita canônica de horas planejadas de 1 célula (mês existente OU novo).
 *
 * SEMPRE upsert por chave composta — nunca `update` puro por id — para evitar a
 * falha silenciosa de 0 linhas afetadas (RLS/linha inexistente devolvem sucesso
 * no Supabase). O toast de sucesso só dispara após confirmar que a gravação
 * afetou ≥ 1 linha; qualquer erro (ou 0 linhas) cai no toast de erro e mantém o
 * valor anterior visível na grade (o cache não é atualizado).
 */
export const useSaveAllocationMonthHours = (projectId: string) => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      tenantId: string;
      employeeId: string;
      budgetRoleId: string | null;
      customRoleName: string | null;
      year: number;
      month: number;
      plannedHours: number;
      previousHours: number;
      isPastMonth: boolean;
      allocationId: string | null;
      reasonCode?: string;
      justification?: string;
    }) => {
      if (input.isPastMonth && !employee?.isAdmin) {
        throw new Error('Apenas admin pode editar horas planejadas de meses passados');
      }

      const affected = await equipeService.upsertAllocations([{
        project_id: projectId,
        tenant_id: input.tenantId,
        employee_id: input.employeeId,
        budget_role_id: input.budgetRoleId,
        custom_role_name: input.customRoleName,
        year: input.year,
        month: input.month,
        planned_hours: input.plannedHours,
      }]);

      if (affected === 0) {
        throw new Error('Não foi possível salvar as horas. Verifique suas permissões e tente novamente.');
      }

      // Mês passado: registra no log de auditoria (só admin chega aqui).
      if (input.isPastMonth && input.allocationId && employee?.id) {
        await equipeService.logAllocationHoursEdit({
          allocationId: input.allocationId,
          editedBy: employee.id,
          previousHours: input.previousHours,
          newHours: input.plannedHours,
          reasonCode: input.reasonCode ?? 'other',
          justification: input.justification ?? '',
        });
      }
    },
    onSuccess: () => {
      invalidateAllocationDependents(queryClient, projectId);
      toast({ title: 'Horas atualizadas' });
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Erro ao atualizar horas', variant: 'destructive' });
    },
  });
};

// ─── Desalocação / reativação ──────────────────────────────────────────────────

export const useDeallocateMember = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    // `clearCurrentMonth`: quando o GP opta por zerar também o mês vigente
    // (desalocação retroativa). Meses passados nunca são tocados; meses futuros
    // são zerados pela própria RPC.
    mutationFn: async ({ employeeId, clearCurrentMonth }: { employeeId: string; clearCurrentMonth: boolean }) => {
      await equipeService.deallocateMember(projectId, employeeId);
      if (clearCurrentMonth) {
        await equipeService.clearCurrentMonthPlanned(projectId, employeeId);
      }
    },
    onSuccess: (_data, variables) => {
      invalidateAllocationDependents(queryClient, projectId);
      toast({
        title: 'Funcionário desalocado',
        description: variables.clearCurrentMonth
          ? 'As horas planejadas do mês vigente em diante foram zeradas.'
          : 'As horas planejadas a partir do próximo mês foram zeradas.',
      });
    },
    onError: () => {
      toast({ title: 'Erro ao desalocar funcionário', variant: 'destructive' });
    },
  });
};

export const useReactivateMember = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (employeeId: string) => equipeService.reactivateMember(projectId, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-team-rows', projectId] });
      toast({ title: 'Funcionário reativado' });
    },
    onError: () => {
      toast({ title: 'Erro ao reativar funcionário', variant: 'destructive' });
    },
  });
};

// ─── Vagas (manuais, sem papel orçado) ─────────────────────────────────────────

export const useCreateVacancyRow = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: { tenantId: string; customRoleName: string; monthlyHours: { year: number; month: number; plannedHours: number }[] }) =>
      equipeService.createVacancyRow({ projectId, tenantId: input.tenantId, customRoleName: input.customRoleName, monthlyHours: input.monthlyHours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-team-rows', projectId] });
      toast({ title: 'Vaga criada' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar vaga', variant: 'destructive' });
    },
  });
};

export const useSetVacancyMonthHours = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { rowId: string; year: number; month: number; plannedHours: number }) =>
      equipeService.setVacancyMonthlyHours(input.rowId, input.year, input.month, input.plannedHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-team-rows', projectId] });
    },
  });
};

// ─── Papel orçado: materialização / supressão / zerar (v2.2) ───────────────────
// Vaga orçada (budget_role_id, ainda sem linha própria) vira uma linha real em
// project_team_rows para poder receber horas e ser gerenciada — mesmo caminho de
// escrita das demais vagas. O orçamento (budget_roles) permanece intocado.

interface BudgetVacancyPayload {
  tenantId: string;
  budgetRoleId: string;
  monthlyHours: { year: number; month: number; plannedHours: number }[];
}

/** Item 3: edição de horas de vaga orçada — materializa e grava as horas. */
export const useMaterializeBudgetRoleVacancy = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: BudgetVacancyPayload) => {
      await equipeService.createVacancyRow({
        projectId,
        tenantId: input.tenantId,
        budgetRoleId: input.budgetRoleId,
        monthlyHours: input.monthlyHours,
      });
    },
    onSuccess: () => invalidateAllocationDependents(queryClient, projectId),
    onError: () => toast({ title: 'Erro ao salvar horas do papel orçado', variant: 'destructive' }),
  });
};

/** Item 2: exclusão de papel orçado — supressão por soft-delete (não altera o orçamento). */
export const useSuppressBudgetRoleVacancy = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: BudgetVacancyPayload & { vacancyRowId: string | null }) => {
      const now = new Date().toISOString();
      if (input.vacancyRowId) {
        await equipeService.setTeamRowDeletedAt(input.vacancyRowId, now);
        return;
      }
      const rowId = await equipeService.createVacancyRow({
        projectId,
        tenantId: input.tenantId,
        budgetRoleId: input.budgetRoleId,
        monthlyHours: input.monthlyHours,
      });
      await equipeService.setTeamRowDeletedAt(rowId, now);
    },
    onSuccess: () => {
      invalidateAllocationDependents(queryClient, projectId);
      queryClient.invalidateQueries({ queryKey: ['budget-roles-for-project'] });
      toast({ title: 'Papel orçado removido do projeto', description: 'O orçamento não foi alterado.' });
    },
    onError: () => toast({ title: 'Erro ao remover papel orçado', variant: 'destructive' }),
  });
};

/** Item 2 (alternativa reversível): zerar as horas do papel orçado, preservando o vínculo. */
export const useZeroBudgetRoleVacancy = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: BudgetVacancyPayload & { vacancyRowId: string | null }) => {
      if (input.vacancyRowId) {
        await equipeService.zeroTeamRowMonths(input.vacancyRowId);
        return;
      }
      await equipeService.createVacancyRow({
        projectId,
        tenantId: input.tenantId,
        budgetRoleId: input.budgetRoleId,
        monthlyHours: input.monthlyHours.map((m) => ({ ...m, plannedHours: 0 })),
      });
    },
    onSuccess: () => {
      invalidateAllocationDependents(queryClient, projectId);
      toast({ title: 'Horas zeradas', description: 'O papel continua vinculado ao orçamento e pode ser reajustado.' });
    },
    onError: () => toast({ title: 'Erro ao zerar horas', variant: 'destructive' }),
  });
};

export const useAssignEmployeeToVacancyRow = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: { rowId: string; employeeId: string }) =>
      equipeService.assignEmployeeToVacancyRow(input.rowId, input.employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-allocations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-team-rows', projectId] });
      toast({ title: 'Funcionário atribuído à vaga' });
    },
    onError: () => {
      toast({ title: 'Erro ao atribuir funcionário', variant: 'destructive' });
    },
  });
};

export const useRemoveTeamRow = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { kind: 'vacancy' | 'member'; vacancyRowId?: string; employeeId?: string }) => {
      if (input.kind === 'vacancy') {
        if (!input.vacancyRowId) throw new Error('Vaga inválida');
        await equipeService.deleteTeamRow(input.vacancyRowId);
        return;
      }
      if (!input.employeeId) throw new Error('Funcionário inválido');
      const hasActual = await equipeService.hasActualHours(projectId, input.employeeId);
      if (hasActual) {
        throw new Error('Não é possível excluir: existem horas realizadas. Desative em vez de excluir.');
      }
      await equipeService.deleteEmployeeAllocations(projectId, input.employeeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-allocations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-allocations-filled-roles', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-team-rows', projectId] });
      toast({ title: 'Linha removida' });
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Erro ao remover', variant: 'destructive' });
    },
  });
};

// ─── Agregador: linhas "mês×membro" prontas para a tabela ──────────────────────

export const useTeamAllocationRows = (project: ProjectWithRelations, canEdit: boolean, currentEmployeeId?: string) => {
  const allocationsQuery = useProjectAllocations(project.id, canEdit);
  const teamRowsQuery = useProjectTeamRows(project.id);
  const { budgetRoles, isLoading: budgetRolesLoading } = useProjectBudgetRoles(project.budget_id, project.id);
  const realizedQuery = useProjectRealizedHours(project.id);

  const allocations = useMemo(() => allocationsQuery.data ?? [], [allocationsQuery.data]);
  const years = useMemo(
    () => Array.from(new Set(allocations.flatMap((a) => a.monthlyHours.map((mh) => mh.year)))),
    [allocations],
  );
  const capacitySummary = useTenantMonthlyCapacitySummary({ tenantId: project.tenant_id, years, enabled: years.length > 0 });

  const isLoading = allocationsQuery.isLoading || teamRowsQuery.isLoading || budgetRolesLoading || realizedQuery.isLoading;

  const rows = useMemo<TeamAllocationRow[]>(() => {
    if (isLoading) return [];
    const today = new Date();
    const teamRows: ProjectTeamRowDB[] = teamRowsQuery.data ?? [];
    const memberStatusByEmployee = new Map(
      teamRows.filter((r) => r.row_type === 'member_status' && r.employee_id).map((r) => [r.employee_id as string, r]),
    );
    const vacancyTeamRows = teamRows.filter((r) => r.row_type === 'vacancy');
    // Papéis orçados que já foram materializados como linha (ativa OU suprimida):
    // param excluir da derivação a partir de budget_roles (evita duplicar/reviver).
    const materializedBudgetRoleIds = new Set(
      vacancyTeamRows.filter((r) => (r as any).budget_role_id).map((r) => (r as any).budget_role_id as string),
    );
    // Suprimidas (soft-delete) não aparecem na tabela.
    const manualVacancies = vacancyTeamRows.filter((r) => !(r as any).deleted_at);
    const budgetRoleNameById = new Map(budgetRoles.map((role) => [role.id, role.role_name]));
    const realized = realizedQuery.data ?? new Map<string, number>();
    const projectMonths = buildProjectMonths(project.start_date, project.end_date);
    const monthNumberToDate = new Map(projectMonths.map((pm) => [pm.monthNumber, { year: pm.year, month: pm.month }]));

    const buildCell = (employeeId: string, year: number, month: number, plannedHours: number, allocationId: string | null): TeamMonthCell => {
      const future = isFutureMonth(year, month, today);
      const realizedHours = future ? null : (realized.get(`${employeeId}-${year}-${month}`) ?? 0);
      const load = getEmployeeMonthLoad(capacitySummary.data, employeeId, year, month);
      return {
        year,
        month,
        allocationId,
        plannedHours,
        realizedHours,
        isOverallocated: load.plannedHours > load.capacityHours && load.capacityHours > 0,
        capacityHours: load.capacityHours,
        othersHours: Math.max(0, load.plannedHours - plannedHours),
      };
    };

    const memberRows: TeamAllocationRow[] = allocations
      .filter((a) => memberStatusByEmployee.get(a.employeeId)?.status !== 'deallocated')
      .map((a) => {
        const months: Record<string, TeamMonthCell> = {};
        a.monthlyHours.forEach((mh) => {
          months[monthKey(mh.year, mh.month)] = buildCell(a.employeeId, mh.year, mh.month, mh.plannedHours, mh.id);
        });
        return {
          kind: 'member' as const,
          key: a.employeeId,
          employeeId: a.employeeId,
          employee: a.employee,
          roleName: a.roleName,
          budgetRoleId: a.budgetRoleId,
          isUnbudgeted: !a.budgetRoleId,
          vacancyRowId: null,
          months,
          totalPlanned: a.totalHours,
          totalRealized: a.monthlyHours.reduce((sum, mh) => sum + (realized.get(`${a.employeeId}-${mh.year}-${mh.month}`) ?? 0), 0),
          deallocatedAt: null,
        };
      })
      .sort((a, b) => {
        if (currentEmployeeId) {
          if (a.employeeId === currentEmployeeId) return -1;
          if (b.employeeId === currentEmployeeId) return 1;
        }
        return (a.employee?.nome ?? '').localeCompare(b.employee?.nome ?? '', 'pt-BR');
      });

    const deallocatedRows: TeamAllocationRow[] = allocations
      .filter((a) => memberStatusByEmployee.get(a.employeeId)?.status === 'deallocated')
      .map((a) => {
        const months: Record<string, TeamMonthCell> = {};
        a.monthlyHours.forEach((mh) => {
          months[monthKey(mh.year, mh.month)] = buildCell(a.employeeId, mh.year, mh.month, mh.plannedHours, mh.id);
        });
        return {
          kind: 'deallocated' as const,
          key: a.employeeId,
          employeeId: a.employeeId,
          employee: a.employee,
          roleName: a.roleName,
          budgetRoleId: a.budgetRoleId,
          isUnbudgeted: !a.budgetRoleId,
          vacancyRowId: null,
          months,
          totalPlanned: a.totalHours,
          totalRealized: a.monthlyHours.reduce((sum, mh) => sum + (realized.get(`${a.employeeId}-${mh.year}-${mh.month}`) ?? 0), 0),
          deallocatedAt: memberStatusByEmployee.get(a.employeeId)?.deallocated_at ?? null,
        };
      })
      .sort((a, b) => (a.employee?.nome ?? '').localeCompare(b.employee?.nome ?? '', 'pt-BR'));

    const budgetedVacancyRows: TeamAllocationRow[] = budgetRoles
      .filter((role) => !role.filled && !materializedBudgetRoleIds.has(role.id))
      .map((role) => {
        const months: Record<string, TeamMonthCell> = {};
        role.months.forEach((bm) => {
          const date = monthNumberToDate.get(bm.month_number);
          if (!date) return;
          months[monthKey(date.year, date.month)] = {
            year: date.year,
            month: date.month,
            allocationId: null,
            plannedHours: Number(bm.hours),
            realizedHours: null,
            isOverallocated: false,
            capacityHours: 0,
            othersHours: 0,
          };
        });
        return {
          kind: 'vacancy' as const,
          key: `budget-role-${role.id}`,
          employeeId: null,
          employee: null,
          roleName: role.role_name,
          budgetRoleId: role.id,
          isUnbudgeted: false,
          vacancyRowId: null,
          months,
          totalPlanned: role.months.reduce((sum, bm) => sum + Number(bm.hours), 0),
          totalRealized: 0,
          deallocatedAt: null,
        };
      });

    const manualVacancyRows: TeamAllocationRow[] = manualVacancies.map((row) => {
      const months: Record<string, TeamMonthCell> = {};
      (row.months ?? []).forEach((rm) => {
        months[monthKey(rm.year, rm.month)] = {
          year: rm.year,
          month: rm.month,
          allocationId: null,
          plannedHours: Number(rm.planned_hours),
          realizedHours: null,
          isOverallocated: false,
          capacityHours: 0,
          othersHours: 0,
        };
      });
      const linkedBudgetRoleId = (row as any).budget_role_id as string | null;
      return {
        kind: 'vacancy' as const,
        key: `team-row-${row.id}`,
        employeeId: null,
        employee: null,
        roleName: linkedBudgetRoleId
          ? budgetRoleNameById.get(linkedBudgetRoleId) ?? row.custom_role_name ?? 'Vaga'
          : row.custom_role_name ?? 'Vaga',
        budgetRoleId: linkedBudgetRoleId,
        isUnbudgeted: false,
        vacancyRowId: row.id,
        months,
        totalPlanned: (row.months ?? []).reduce((sum, rm) => sum + Number(rm.planned_hours), 0),
        totalRealized: 0,
        deallocatedAt: null,
      };
    });

    const vacancyRows = [...budgetedVacancyRows, ...manualVacancyRows].sort((a, b) =>
      a.roleName.localeCompare(b.roleName, 'pt-BR'),
    );

    return [...memberRows, ...vacancyRows, ...deallocatedRows];
  }, [allocations, teamRowsQuery.data, budgetRoles, realizedQuery.data, capacitySummary.data, isLoading, currentEmployeeId, project.start_date, project.end_date]);

  return { rows, isLoading };
};
