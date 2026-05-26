import { supabase } from '@/integrations/supabase/client';
import { ProjectAllocationWithEmployee } from '@/types/equipe.types';

export const equipeService = {
  async getProjectAllocations(projectId: string): Promise<ProjectAllocationWithEmployee[]> {
    const { data, error } = await (supabase
      .from('project_role_allocations' as any)
      .select(`
        *,
        employee:employees(id, nome, cargo, foto_url),
        budget_role:budget_roles(id, role_name, seniority, hourly_rate)
      `) as any)
      .eq('project_id', projectId)
      .order('employee_id')
      .order('year')
      .order('month');
    if (error) throw error;
    return (data || []) as ProjectAllocationWithEmployee[];
  },

  async upsertAllocations(rows: {
    project_id: string;
    tenant_id: string;
    employee_id: string;
    budget_role_id: string | null;
    custom_role_name: string | null;
    year: number;
    month: number;
    planned_hours: number;
  }[]): Promise<void> {
    const { error } = await (supabase
      .from('project_role_allocations' as any) as any)
      .upsert(rows, { onConflict: 'employee_id,project_id,year,month' });
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