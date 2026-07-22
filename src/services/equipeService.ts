import { supabase } from '@/integrations/supabase/client';
import { ProjectAllocationWithEmployee, ProjectTeamRowDB } from '@/types/equipe.types';
import { AllocationMarginImpact, SimulationMonth } from '@/types/equipe.types';

export const equipeService = {
  /**
   * Simulação de impacto na margem de uma alocação em composição (aba Equipe v2).
   * Chama a RPC server-side, que devolve APENAS agregados — nenhum campo salarial
   * bruto trafega para o cliente. RLS: admin OU manager_id do projeto.
   */
  async simulateAllocationImpact(
    projectId: string,
    employeeId: string,
    months: SimulationMonth[],
  ): Promise<AllocationMarginImpact | null> {
    const { data, error } = await supabase.rpc('simulate_allocation_margin_impact' as any, {
      p_project_id: projectId,
      p_employee_id: employeeId,
      p_months: months,
    } as any);
    if (error) throw error;
    const row = Array.isArray(data) ? (data[0] as any) : (data as any);
    if (!row) return null;
    return {
      custoEstimado: Number(row.custo_estimado ?? 0),
      horasTotal: Number(row.horas_total ?? 0),
      custoHoraMedio: Number(row.custo_hora_medio ?? 0),
      margemAtual: row.margem_atual == null ? null : Number(row.margem_atual),
      margemSimulada: row.margem_simulada == null ? null : Number(row.margem_simulada),
      margemBaseline: row.margem_baseline == null ? null : Number(row.margem_baseline),
      deltaPp: row.delta_pp == null ? null : Number(row.delta_pp),
      tolPp: Number(row.tol_pp ?? 3),
      verdict: (row.verdict ?? null) as AllocationMarginImpact['verdict'],
      hasBaseline: Boolean(row.has_baseline),
      isNonRevenue: Boolean(row.is_non_revenue),
    };
  },
  async getProjectAllocations(projectId: string, includeCost: boolean): Promise<ProjectAllocationWithEmployee[]> {
    const columns = [
      'id',
      'project_id',
      'tenant_id',
      'employee_id',
      'budget_role_id',
      'custom_role_name',
      'year',
      'month',
      'planned_hours',
      ...(includeCost ? ['cost_per_hour'] : []),
      'employee:employees(id, nome, cargo, foto_url)',
      'budget_role:budget_roles(id, role_name, seniority, hourly_rate)',
    ].join(', ');

    const { data, error } = await (supabase
      .from('project_role_allocations' as any)
      .select(columns) as any)
      .eq('project_id', projectId)
      .order('employee_id')
      .order('year')
      .order('month');
    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      cost_per_hour: includeCost ? row.cost_per_hour ?? null : null,
    })) as ProjectAllocationWithEmployee[];
  },

  /**
   * Upsert por chave composta (employee_id, project_id, year, month). Retorna
   * o nº de linhas efetivamente gravadas — um `.select()` é obrigatório para
   * detectar o caso em que a RLS filtra a linha e o Supabase devolve sucesso
   * com 0 linhas afetadas (falha silenciosa de persistência).
   */
  async upsertAllocations(rows: {
    project_id: string;
    tenant_id: string;
    employee_id: string;
    budget_role_id: string | null;
    custom_role_name: string | null;
    year: number;
    month: number;
    planned_hours: number;
  }[]): Promise<number> {
    const { data, error } = await (supabase
      .from('project_role_allocations' as any) as any)
      .upsert(rows, { onConflict: 'employee_id,project_id,year,month' })
      .select('id');
    if (error) throw error;
    return (data as unknown[] | null)?.length ?? 0;
  },

  /** Zera o planejado do MÊS VIGENTE de um membro (usado na desalocação retroativa). */
  async clearCurrentMonthPlanned(projectId: string, employeeId: string): Promise<void> {
    const now = new Date();
    const { error } = await (supabase
      .from('project_role_allocations' as any) as any)
      .update({ planned_hours: 0 })
      .eq('project_id', projectId)
      .eq('employee_id', employeeId)
      .eq('year', now.getFullYear())
      .eq('month', now.getMonth() + 1);
    if (error) throw error;
  },

  async updateAllocationHours(allocationId: string, plannedHours: number): Promise<void> {
    const { error } = await (supabase
      .from('project_role_allocations' as any) as any)
      .update({ planned_hours: plannedHours })
      .eq('id', allocationId);
    if (error) throw error;
  },

  async logAllocationHoursEdit(input: {
    allocationId: string;
    editedBy: string;
    previousHours: number;
    newHours: number;
    reasonCode: string;
    justification: string;
  }): Promise<void> {
    const { error } = await (supabase
      .from('project_role_allocation_edit_logs' as any) as any)
      .insert({
        allocation_id: input.allocationId,
        edited_by: input.editedBy,
        previous_hours: input.previousHours,
        new_hours: input.newHours,
        reason_code: input.reasonCode,
        justification: input.justification,
      });
    if (error) throw error;
  },

  async deleteEmployeeAllocations(projectId: string, employeeId: string): Promise<void> {
    const { error } = await (supabase
      .from('project_role_allocations' as any)
      .delete() as any)
      .eq('project_id', projectId)
      .eq('employee_id', employeeId);
    if (error) throw error;
  },

  async hasActualHours(projectId: string, employeeId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('project_employee_has_actual_hours' as any, {
      p_project_id: projectId,
      p_employee_id: employeeId,
    } as any);
    if (error) throw error;
    return Boolean(data);
  },

  async deallocateMember(projectId: string, employeeId: string): Promise<void> {
    const { error } = await supabase.rpc('deallocate_project_member' as any, {
      p_project_id: projectId,
      p_employee_id: employeeId,
    } as any);
    if (error) throw error;
  },

  async reactivateMember(projectId: string, employeeId: string): Promise<void> {
    const { error } = await supabase.rpc('reactivate_project_member' as any, {
      p_project_id: projectId,
      p_employee_id: employeeId,
    } as any);
    if (error) throw error;
  },

  async getProjectTeamRows(projectId: string): Promise<ProjectTeamRowDB[]> {
    const { data, error } = await (supabase
      .from('project_team_rows' as any)
      .select('*, months:project_team_row_months(*)') as any)
      .eq('project_id', projectId);
    if (error) throw error;
    return (data || []) as ProjectTeamRowDB[];
  },

  async createVacancyRow(input: {
    projectId: string;
    tenantId: string;
    budgetRoleId?: string | null;
    customRoleName?: string | null;
    monthlyHours: { year: number; month: number; plannedHours: number }[];
  }): Promise<string> {
    const { data, error } = await (supabase
      .from('project_team_rows' as any) as any)
      .insert({
        project_id: input.projectId,
        tenant_id: input.tenantId,
        row_type: 'vacancy',
        budget_role_id: input.budgetRoleId ?? null,
        custom_role_name: input.customRoleName ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;

    const rowId = data.id as string;
    if (input.monthlyHours.length > 0) {
      const { error: monthsError } = await (supabase
        .from('project_team_row_months' as any) as any)
        .insert(input.monthlyHours.map((mh) => ({
          row_id: rowId,
          year: mh.year,
          month: mh.month,
          planned_hours: mh.plannedHours,
        })));
      if (monthsError) throw monthsError;
    }
    return rowId;
  },

  async setVacancyMonthlyHours(rowId: string, year: number, month: number, plannedHours: number): Promise<void> {
    const { error } = await (supabase
      .from('project_team_row_months' as any) as any)
      .upsert({ row_id: rowId, year, month, planned_hours: plannedHours }, { onConflict: 'row_id,year,month' });
    if (error) throw error;
  },

  async deleteTeamRow(rowId: string): Promise<void> {
    const { error } = await (supabase
      .from('project_team_rows' as any)
      .delete() as any)
      .eq('id', rowId);
    if (error) throw error;
  },

  /** Soft-delete / restauração de uma vaga materializada (papel orçado suprimido). */
  async setTeamRowDeletedAt(rowId: string, deletedAt: string | null): Promise<void> {
    const { error } = await (supabase
      .from('project_team_rows' as any) as any)
      .update({ deleted_at: deletedAt })
      .eq('id', rowId);
    if (error) throw error;
  },

  /** Zera todas as horas planejadas dos meses de uma vaga materializada. */
  async zeroTeamRowMonths(rowId: string): Promise<void> {
    const { error } = await (supabase
      .from('project_team_row_months' as any) as any)
      .update({ planned_hours: 0 })
      .eq('row_id', rowId);
    if (error) throw error;
  },

  async assignEmployeeToVacancyRow(rowId: string, employeeId: string): Promise<void> {
    const { error } = await supabase.rpc('assign_employee_to_vacancy_row' as any, {
      p_row_id: rowId,
      p_employee_id: employeeId,
    } as any);
    if (error) throw error;
  },

  async getRealizedHoursByEmployeeMonth(projectId: string): Promise<{ employeeId: string; year: number; month: number; hours: number }[]> {
    const { data, error } = await (supabase
      .from('project_timesheets' as any)
      .select('hours, work_date, project_member:project_members(employee_id)') as any)
      .eq('project_id', projectId);
    if (error) throw error;

    const totals = new Map<string, { employeeId: string; year: number; month: number; hours: number }>();
    (data || []).forEach((row: any) => {
      const employeeId = row.project_member?.employee_id;
      if (!employeeId || !row.work_date) return;
      const date = new Date(row.work_date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${employeeId}-${year}-${month}`;
      const entry = totals.get(key) ?? { employeeId, year, month, hours: 0 };
      entry.hours += Number(row.hours || 0);
      totals.set(key, entry);
    });
    return Array.from(totals.values());
  },

  async getBudgetRolesForProject(budgetId: string) {
    const { data, error } = await supabase
      .from('budget_roles')
      .select('*, months:budget_role_months(*)')
      .eq('budget_id', budgetId)
      .order('role_name');
    if (error) throw error;
    return data || [];
  },

  async getAllocatedBudgetRoleIds(projectId: string): Promise<string[]> {
    const { data, error } = await (supabase
      .from('project_role_allocations' as any)
      .select('budget_role_id') as any)
      .eq('project_id', projectId)
      .not('budget_role_id', 'is', null);
    if (error) throw error;
    return (data || []).map((r: any) => r.budget_role_id).filter(Boolean);
  },

  async createProjectRole(payload: {
    project_id: string;
    tenant_id: string;
    role_name: string;
    employment_type: string;
    payment_type: string;
    employee_id?: string | null;
    freelancer_name?: string | null;
    freelancer_email?: string | null;
    hourly_rate?: number | null;
    monthly_rate?: number | null;
    clt_encargos_multiplier?: number | null;
  }) {
    const { data, error } = await (supabase
      .from('project_roles' as any) as any)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};