import { supabase } from '@/integrations/supabase/client';
import {
  ProjectDB,
  ProjectMemberDB,
  ProjectInstallmentDB,
  CreateProjectInput,
  CreateProjectMemberInput,
  UpdateInstallmentInput,
  ProjectWithRelations,
  InstallmentStatus,
} from '@/types/project';

function generateInstallments(
  projectId: string,
  totalValue: number,
  installmentsCount: number,
  firstInvoiceDate: string,
  dueDay: number,
  isContinuous: boolean = false,
  renewalDate?: string
): Omit<ProjectInstallmentDB, 'id' | 'created_at' | 'updated_at'>[] {
  const installments: Omit<ProjectInstallmentDB, 'id' | 'created_at' | 'updated_at'>[] = [];
  
  let count = installmentsCount;
  let valuePerInstallment = totalValue / installmentsCount;

  // For continuous projects, calculate months between first invoice and renewal date
  if (isContinuous && renewalDate) {
    const start = new Date(firstInvoiceDate);
    const end = new Date(renewalDate);
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    count = Math.max(1, monthsDiff);
    valuePerInstallment = totalValue; // Full monthly value per installment
  }

  let currentDate = new Date(firstInvoiceDate);

  for (let i = 1; i <= count; i++) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const adjustedDueDay = Math.min(dueDay, lastDayOfMonth);
    
    const dueDate = new Date(year, month, adjustedDueDay);

    installments.push({
      project_id: projectId,
      installment_number: i,
      value: Number(valuePerInstallment.toFixed(2)),
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending' as InstallmentStatus,
      invoice_number: null,
      invoice_date: null,
      payment_date: null,
      notes: null,
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return installments;
}

export interface ProjectFilterOptions {
  isAdmin?: boolean;
  managerId?: string;
}

export const projectService = {
  async getAll(tenantId: string, options?: ProjectFilterOptions): Promise<ProjectWithRelations[]> {
    let query = supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, company_name, trading_name),
        manager:employees!projects_manager_id_fkey(id, nome, cargo),
        installments:project_installments(id, installment_number, value, due_date, status, invoice_number, payment_date)
      `)
      .eq('tenant_id', tenantId);

    // Se não é admin, filtra apenas projetos onde é gerente
    if (!options?.isAdmin && options?.managerId) {
      query = query.eq('manager_id', options.managerId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }

    return (data || []) as unknown as ProjectWithRelations[];
  },

  async getById(id: string): Promise<ProjectWithRelations | null> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, company_name, trading_name),
        manager:employees!projects_manager_id_fkey(id, nome, cargo)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      throw error;
    }

    // Fetch members separately with cost data
    const { data: members } = await supabase
      .from('project_members')
      .select(`
        *,
        employee:employees(id, nome, cargo, foto_url, total_monthly_cost_estimated, jornada_mensal)
      `)
      .eq('project_id', id);

    // Fetch installments separately
    const { data: installments } = await supabase
      .from('project_installments')
      .select('*')
      .eq('project_id', id)
      .order('installment_number', { ascending: true });

    // Fetch suppliers
    const { data: suppliers } = await supabase
      .from('project_suppliers')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true });

    // Fetch materials
    const { data: materials } = await supabase
      .from('project_materials')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true });

    return {
      ...data,
      members: members || [],
      installments: installments || [],
      suppliers: suppliers || [],
      materials: materials || [],
    } as unknown as ProjectWithRelations;
  },

  async create(input: CreateProjectInput, tenantId: string): Promise<ProjectDB> {
    // First create the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        tenant_id: tenantId,
        client_id: input.clientId,
        manager_id: input.managerId,
        budget_id: input.budgetId || null,
        name: input.name,
        description: input.description || null,
        start_date: input.startDate,
        end_date: input.endDate || null,
        is_continuous: input.isContinuous || false,
        total_value: input.totalValue,
        payment_method: input.paymentMethod,
        installments_count: input.installmentsCount,
        first_invoice_date: input.firstInvoiceDate || null,
        due_day: input.dueDay,
        status: input.status || 'planning',
        contract_url: input.contractUrl || null,
        duration_months: input.durationMonths || 1,
        renewal_date: input.renewalDate || null,
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      throw projectError;
    }

    // Generate installments
    if (input.firstInvoiceDate) {
      const isContinuous = input.isContinuous || false;
      const installmentsCount = isContinuous ? 1 : input.installmentsCount;
      
      if (isContinuous ? input.renewalDate : installmentsCount > 0) {
        const installments = generateInstallments(
          project.id,
          input.totalValue,
          installmentsCount,
          input.firstInvoiceDate,
          input.dueDay,
          isContinuous,
          input.renewalDate
        );

        const { error: installmentsError } = await supabase
          .from('project_installments')
          .insert(installments);

        if (installmentsError) {
          console.error('Error creating installments:', installmentsError);
          // Don't throw - project was created successfully
        }
      }
    }

    return project as unknown as ProjectDB;
  },

  async update(id: string, updates: Partial<CreateProjectInput>): Promise<ProjectDB> {
    const updateData: Record<string, unknown> = {};

    if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
    if (updates.managerId !== undefined) updateData.manager_id = updates.managerId;
    if (updates.budgetId !== undefined) updateData.budget_id = updates.budgetId;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
    if (updates.isContinuous !== undefined) updateData.is_continuous = updates.isContinuous;
    if (updates.totalValue !== undefined) updateData.total_value = updates.totalValue;
    if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
    if (updates.installmentsCount !== undefined) updateData.installments_count = updates.installmentsCount;
    if (updates.firstInvoiceDate !== undefined) updateData.first_invoice_date = updates.firstInvoiceDate;
    if (updates.dueDay !== undefined) updateData.due_day = updates.dueDay;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.contractUrl !== undefined) updateData.contract_url = updates.contractUrl;
    if (updates.renewalDate !== undefined) updateData.renewal_date = updates.renewalDate;
    if (updates.durationMonths !== undefined) updateData.duration_months = updates.durationMonths;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      throw error;
    }

    // Regenerate installments if financial data changed
    const shouldRegenerateInstallments = 
      updates.totalValue !== undefined ||
      updates.installmentsCount !== undefined ||
      updates.firstInvoiceDate !== undefined ||
      updates.dueDay !== undefined ||
      updates.renewalDate !== undefined ||
      updates.isContinuous !== undefined;

    if (shouldRegenerateInstallments) {
      // Use the updated project data (from the UPDATE result)
      const projectIsContinuous = updates.isContinuous !== undefined ? updates.isContinuous : data.is_continuous;
      const projectFirstInvoiceDate = updates.firstInvoiceDate || data.first_invoice_date;
      const projectDueDay = updates.dueDay !== undefined ? updates.dueDay : data.due_day;
      const projectTotalValue = updates.totalValue !== undefined ? updates.totalValue : data.total_value;
      const projectRenewalDate = updates.renewalDate || data.renewal_date;
      const projectInstallmentsCount = updates.installmentsCount !== undefined ? updates.installmentsCount : data.installments_count;

      if (projectFirstInvoiceDate) {
        // Delete existing installments that haven't been invoiced or received
        await supabase
          .from('project_installments')
          .delete()
          .eq('project_id', id)
          .in('status', ['pending', 'overdue']);

        if (projectIsContinuous && projectRenewalDate) {
          // Continuous project: generate monthly installments using full monthly value
          const newInstallments = generateInstallments(
            id,
            projectTotalValue,
            1,
            projectFirstInvoiceDate,
            projectDueDay,
            true,
            projectRenewalDate
          );

          if (newInstallments.length > 0) {
            // Renumber considering existing (paid/invoiced) installments
            const { count: remainingCount } = await supabase
              .from('project_installments')
              .select('*', { count: 'exact', head: true })
              .eq('project_id', id);

            const offset = remainingCount || 0;
            const renumbered = newInstallments.map((inst, idx) => ({
              ...inst,
              installment_number: offset + idx + 1,
            }));

            await supabase.from('project_installments').insert(renumbered);
          }
        } else if (!projectIsContinuous && projectInstallmentsCount > 0) {
          // Non-continuous: keep existing logic
          const { count: remainingCount } = await supabase
            .from('project_installments')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', id);

          const remainingInstallments = remainingCount || 0;
          const newInstallmentsCount = projectInstallmentsCount - remainingInstallments;

          if (newInstallmentsCount > 0) {
            const { data: existingInstallments } = await supabase
              .from('project_installments')
              .select('value')
              .eq('project_id', id);

            const existingValue = (existingInstallments || []).reduce((sum, i) => sum + Number(i.value), 0);
            const remainingValue = projectTotalValue - existingValue;
            const valuePerNewInstallment = remainingValue / newInstallmentsCount;

            const installments = [];
            let currentDate = new Date(projectFirstInvoiceDate);
            currentDate.setMonth(currentDate.getMonth() + remainingInstallments);

            for (let i = 1; i <= newInstallmentsCount; i++) {
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth();
              const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
              const adjustedDueDay = Math.min(projectDueDay, lastDayOfMonth);
              const dueDate = new Date(year, month, adjustedDueDay);

              installments.push({
                project_id: id,
                installment_number: remainingInstallments + i,
                value: Number(valuePerNewInstallment.toFixed(2)),
                due_date: dueDate.toISOString().split('T')[0],
                status: 'pending' as InstallmentStatus,
                invoice_number: null,
                invoice_date: null,
                payment_date: null,
                notes: null,
              });

              currentDate.setMonth(currentDate.getMonth() + 1);
            }

            if (installments.length > 0) {
              await supabase.from('project_installments').insert(installments);
            }
          }
        }
      }
    }

    return data as unknown as ProjectDB;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },

  // Project Members
  async addMember(input: CreateProjectMemberInput): Promise<ProjectMemberDB> {
    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: input.projectId,
        employee_id: input.employeeId || null, // Allow null for roles without assigned employees
        role: input.role,
        seniority: input.seniority,
        hours_per_month: input.hoursPerMonth,
        budget_role_id: input.budgetRoleId || null,
        hourly_rate: input.hourlyRate || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding project member:', error);
      throw error;
    }

    // If budget hours are provided, copy them to project_member_months
    if (input.monthlyHours && input.monthlyHours.length > 0) {
      const monthInserts = input.monthlyHours.map((m) => ({
        project_member_id: data.id,
        month_number: m.monthNumber,
        hours: m.hours,
      }));

      const { error: monthsError } = await supabase
        .from('project_member_months')
        .insert(monthInserts);

      if (monthsError) {
        console.error('Error adding member monthly hours:', monthsError);
        // Don't throw - member was created successfully
      }
    }

    return data as unknown as ProjectMemberDB;
  },

  async updateMember(
    id: string,
    updates: { role?: string; seniority?: string; hours_per_month?: number; hourly_rate?: number; employee_id?: string | null }
  ): Promise<ProjectMemberDB> {
    const { data, error } = await supabase
      .from('project_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project member:', error);
      throw error;
    }

    return data as unknown as ProjectMemberDB;
  },

  async removeMember(id: string): Promise<void> {
    const { error } = await supabase.from('project_members').delete().eq('id', id);

    if (error) {
      console.error('Error removing project member:', error);
      throw error;
    }
  },

  async getMembers(projectId: string): Promise<(ProjectMemberDB & { employee?: { id: string; nome: string; cargo: string } })[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        employee:employees(id, nome, cargo)
      `)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error fetching project members:', error);
      throw error;
    }

    return (data || []) as unknown as (ProjectMemberDB & { employee?: { id: string; nome: string; cargo: string } })[];
  },

  // Project Installments
  async getInstallments(projectId: string): Promise<ProjectInstallmentDB[]> {
    const { data, error } = await supabase
      .from('project_installments')
      .select('*')
      .eq('project_id', projectId)
      .order('installment_number', { ascending: true });

    if (error) {
      console.error('Error fetching installments:', error);
      throw error;
    }

    return (data || []) as unknown as ProjectInstallmentDB[];
  },

  async updateInstallment(id: string, updates: UpdateInstallmentInput): Promise<ProjectInstallmentDB> {
    const updateData: Record<string, unknown> = {};

    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.invoiceNumber !== undefined) updateData.invoice_number = updates.invoiceNumber;
    if (updates.invoiceDate !== undefined) updateData.invoice_date = updates.invoiceDate;
    if (updates.paymentDate !== undefined) updateData.payment_date = updates.paymentDate;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.value !== undefined) updateData.value = updates.value;

    const { data, error } = await supabase
      .from('project_installments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating installment:', error);
      throw error;
    }

    return data as unknown as ProjectInstallmentDB;
  },

  // Contract upload
  async uploadContract(file: File, projectId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${projectId}/contract-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading contract:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('contracts')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  },

  async search(query: string, tenantId: string): Promise<ProjectWithRelations[]> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, company_name, trading_name),
        manager:employees!projects_manager_id_fkey(id, nome, cargo)
      `)
      .eq('tenant_id', tenantId)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching projects:', error);
      throw error;
    }

    return (data || []) as unknown as ProjectWithRelations[];
  },
};
