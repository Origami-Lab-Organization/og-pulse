import { useMemo } from 'react';
import { ProjectWithRelations } from '@/types/project';
import { useProjectAllocations, useProjectTeamRows } from '@/hooks/useProjectRoles';
import { useTimesheetsByMembers } from '@/hooks/useProjectTimesheets';
import { useHolidays } from '@/hooks/useHolidays';
import {
  calculatePlannedLaborCostByEmployeeMonth,
  calculateRealizedLaborCost,
  employeeMonthKey,
  EmployeeFallbackCost,
} from '@/lib/roleAllocationCosts';

export interface LaborMonthCell {
  year: number;
  month: number;
  plannedHours: number;
  plannedCost: number;
  realizedHours: number;
  realizedCost: number;
}

export interface LaborBreakdownRow {
  employeeId: string;
  employee: { id: string; nome: string; cargo: string; foto_url?: string | null } | null;
  roleName: string;
  isUnbudgeted: boolean;
  deallocated: boolean;
  plannedHours: number;
  realizedHours: number;
  plannedCost: number;
  realizedCost: number;
  deltaCost: number;
  deltaPct: number | null;
  months: LaborMonthCell[];
}

export interface LaborBreakdownTotals {
  peopleCount: number;
  plannedHours: number;
  realizedHours: number;
  plannedCost: number;
  realizedCost: number;
  deltaCost: number;
  deltaPct: number | null;
}

function memberFallbackCost(member: NonNullable<ProjectWithRelations['members']>[number]): EmployeeFallbackCost | null {
  if (!member.employee) return null;
  return {
    jornadaDiaria: member.employee.jornada_diaria || 8,
    monthlyCostEstimated: member.employee.total_monthly_cost_estimated || 0,
  };
}

/**
 * Breakdown de custo de mão de obra por pessoa (planejado × realizado × Δ),
 * com grão mensal. Reaproveita exatamente as mesmas fontes/fórmulas da aba
 * Custos, de modo que os subtotais reconciliam centavo a centavo com os KPIs.
 * Uso restrito a admin/GP (contém R$ por pessoa).
 */
export function useProjectLaborBreakdown(project: ProjectWithRelations) {
  const allocationsQuery = useProjectAllocations(project.id, true);
  const teamRowsQuery = useProjectTeamRows(project.id);
  const memberIds = useMemo(() => (project.members || []).map((m) => m.id), [project.members]);
  const timesheetsQuery = useTimesheetsByMembers(memberIds);
  const { data: holidays = [] } = useHolidays();

  const isLoading = allocationsQuery.isLoading || teamRowsQuery.isLoading || timesheetsQuery.isLoading;

  const result = useMemo(() => {
    const allocations = allocationsQuery.data ?? [];
    const timesheets = timesheetsQuery.data ?? [];
    const teamRows = teamRowsQuery.data ?? [];
    const members = project.members || [];

    const memberToEmployee = new Map<string, string>();
    const fallbackByMember = new Map<string, EmployeeFallbackCost>();
    const fallbackByEmployee: Record<string, EmployeeFallbackCost> = {};
    members.forEach((member) => {
      memberToEmployee.set(member.id, member.employee_id);
      const fallback = memberFallbackCost(member);
      if (fallback) {
        fallbackByMember.set(member.id, fallback);
        fallbackByEmployee[member.employee_id] = fallback;
      }
    });

    const deallocatedEmployees = new Set(
      teamRows
        .filter((r) => r.row_type === 'member_status' && r.status === 'deallocated' && r.employee_id)
        .map((r) => r.employee_id as string),
    );

    const plannedByEmployeeMonth = calculatePlannedLaborCostByEmployeeMonth(allocations, fallbackByEmployee, holidays);
    const realized = calculateRealizedLaborCost(timesheets, memberToEmployee, fallbackByMember, holidays);

    // Metadados de exibição por funcionário (nome/cargo/papel), preferindo a
    // alocação (modelo novo) e caindo para o membro (modelo antigo).
    const meta = new Map<string, { employee: LaborBreakdownRow['employee']; roleName: string; isUnbudgeted: boolean }>();
    allocations.forEach((a) => {
      meta.set(a.employeeId, { employee: a.employee, roleName: a.roleName, isUnbudgeted: !a.budgetRoleId });
    });
    members.forEach((member) => {
      if (meta.has(member.employee_id)) return;
      meta.set(member.employee_id, {
        employee: member.employee
          ? { id: member.employee.id, nome: member.employee.nome, cargo: member.employee.cargo, foto_url: member.employee.foto_url }
          : null,
        roleName: member.role || '—',
        isUnbudgeted: !member.budget_role_id,
      });
    });

    const employeeIds = new Set<string>([
      ...allocations.map((a) => a.employeeId),
      ...Object.keys(realized.costByEmployee),
    ]);

    const rows: LaborBreakdownRow[] = Array.from(employeeIds).map((employeeId) => {
      const info = meta.get(employeeId) ?? { employee: null, roleName: '—', isUnbudgeted: false };

      // Reúne células mês a mês (union planejado + realizado).
      const monthKeys = new Set<string>();
      const monthMap = new Map<string, LaborMonthCell>();
      const ensureCell = (year: number, month: number): LaborMonthCell => {
        const key = `${year}-${month}`;
        monthKeys.add(key);
        let cell = monthMap.get(key);
        if (!cell) {
          cell = { year, month, plannedHours: 0, plannedCost: 0, realizedHours: 0, realizedCost: 0 };
          monthMap.set(key, cell);
        }
        return cell;
      };

      const allocation = allocations.find((a) => a.employeeId === employeeId);
      (allocation?.monthlyHours ?? []).forEach((mh) => {
        const planned = plannedByEmployeeMonth.get(employeeMonthKey(employeeId, mh.year, mh.month));
        const cell = ensureCell(mh.year, mh.month);
        cell.plannedHours += mh.plannedHours;
        cell.plannedCost += planned?.cost ?? 0;
      });

      realized.byEmployeeMonth.forEach((entry) => {
        if (entry.employeeId !== employeeId) return;
        const cell = ensureCell(entry.year, entry.month);
        cell.realizedHours += entry.hours;
        cell.realizedCost += entry.cost;
      });

      const months = Array.from(monthMap.values()).sort((a, b) =>
        a.year !== b.year ? a.year - b.year : a.month - b.month,
      );

      const plannedHours = months.reduce((s, m) => s + m.plannedHours, 0);
      const realizedHours = months.reduce((s, m) => s + m.realizedHours, 0);
      const plannedCost = months.reduce((s, m) => s + m.plannedCost, 0);
      const realizedCost = months.reduce((s, m) => s + m.realizedCost, 0);
      const deltaCost = realizedCost - plannedCost;
      const deltaPct = plannedCost > 0 ? (realizedCost / plannedCost - 1) * 100 : null;

      return {
        employeeId,
        employee: info.employee,
        roleName: info.roleName,
        isUnbudgeted: info.isUnbudgeted,
        deallocated: deallocatedEmployees.has(employeeId),
        plannedHours,
        realizedHours,
        plannedCost,
        realizedCost,
        deltaCost,
        deltaPct,
        months,
      };
    });

    // Ativos primeiro (ordenados por Δ decrescente), desalocados no fim.
    rows.sort((a, b) => {
      if (a.deallocated !== b.deallocated) return a.deallocated ? 1 : -1;
      return b.deltaCost - a.deltaCost;
    });

    const totals: LaborBreakdownTotals = {
      peopleCount: rows.length,
      plannedHours: rows.reduce((s, r) => s + r.plannedHours, 0),
      realizedHours: rows.reduce((s, r) => s + r.realizedHours, 0),
      plannedCost: rows.reduce((s, r) => s + r.plannedCost, 0),
      realizedCost: rows.reduce((s, r) => s + r.realizedCost, 0),
      deltaCost: 0,
      deltaPct: null,
    };
    totals.deltaCost = totals.realizedCost - totals.plannedCost;
    totals.deltaPct = totals.plannedCost > 0 ? (totals.realizedCost / totals.plannedCost - 1) * 100 : null;

    return { rows, totals };
  }, [allocationsQuery.data, timesheetsQuery.data, teamRowsQuery.data, project.members, holidays]);

  return { ...result, isLoading };
}
