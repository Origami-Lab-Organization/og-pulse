import { supabase } from '@/integrations/supabase/client';
import { ProjectRoleDB, ProjectRoleWithEmployee, CreateProjectRolePayload } from '@/types/equipe.types';

export const equipeService = {
  async getProjectRoles(projectId: string): Promise<ProjectRoleWithEmployee[]> {
    const { data, error } = await supabase
      .from('project_roles')
      .select(`
        *,
        employee:employees(id, nome, cargo, foto_url)
      `)
      .eq('project_id', projectId)
      .order('created_at');
    if (error) throw error;
    return (data || []) as ProjectRoleWithEmployee[];
  },

  async createProjectRole(
    payload: CreateProjectRolePayload,
    tenantId: string,
    createdBy: string
  ): Promise<ProjectRoleDB> {
    const { data, error } = await supabase
      .from('project_roles')
      .insert({
        project_id: payload.projectId,
        tenant_id: tenantId,
        role_name: payload.roleName,
        employment_type: payload.employmentType,
        payment_type: payload.paymentType,
        employee_id: payload.employeeId || null,
        freelancer_name: payload.freelancerName || null,
        freelancer_email: payload.freelancerEmail || null,
        hourly_rate: payload.hourlyRate ?? null,
        monthly_rate: payload.monthlyRate ?? null,
        clt_encargos_multiplier: payload.cltEncargosMultiplier ?? 1.72,
        created_by: createdBy,
      })
      .select()
      .single();
    if (error) throw error;
    return data as ProjectRoleDB;
  },

  async deleteProjectRole(id: string): Promise<void> {
    const { error } = await supabase.from('project_roles').delete().eq('id', id);
    if (error) throw error;
  },
};
