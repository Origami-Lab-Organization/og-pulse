import { supabase } from '@/integrations/supabase/client';
import { fetchProjectSuppliersRaw, fetchProjectMaterialsRaw } from '@/services/projectCostsService';
import {
  ProjectDB,
  ProjectMemberDB,
  ProjectInstallmentDB,
  CreateProjectInput,
  CreateProjectMemberInput,
  CreateInstallmentInput,
  UpdateInstallmentInput,
  ProjectWithRelations,
  InstallmentStatus,
} from '@/types/project';
import { fetchEmployeeDirectoryMap, withDirectoryIdentity } from '@/services/employeeDirectoryService';

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

  const currentDate = new Date(firstInvoiceDate);

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


/**
 * Reexpõe `total_value` na raiz do projeto a partir de `project_financials`.
 * A coluna saiu de `projects` (PUL-164): projects precisa ser legível por qualquer
 * membro e RLS não restringe coluna. Os consumidores continuam lendo
 * `project.total_value`; quem não pode ver o financeiro recebe 0, porque a RLS da
 * tabela-filha não devolve a linha.
 */
function withTotalValue<T>(row: T): T {
  const record = row as Record<string, unknown>;
  const financials = record.financials as { total_value?: number | null } | null | undefined;
  return { ...record, total_value: Number(financials?.total_value ?? 0) } as T;
}

export const projectService = {
  async getAll(tenantId: string, options?: ProjectFilterOptions): Promise<ProjectWithRelations[]> {
    let query = supabase
      .from('projects')
      .select(`
        *,
        financials:project_financials(total_value),
        client:clients(id, company_name, trading_name),
        manager:employees!projects_manager_id_fkey(id, nome, cargo),
        installments:project_installments(id, project_id, installment_number, value, due_date, status, invoice_number, payment_date)
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

    return ((data || []) as unknown[]).map(withTotalValue) as unknown as ProjectWithRelations[];
  },

  async getByClient(clientId: string, tenantId: string): Promise<ProjectWithRelations[]> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        financials:project_financials(total_value),
        client:clients(id, company_name, trading_name),
        manager:employees!projects_manager_id_fkey(id, nome, cargo)
      `)
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects by client:', error);
      throw error;
    }

    return ((data || []) as unknown[]).map(withTotalValue) as unknown as ProjectWithRelations[];
  },

  async getById(id: string, tenantId?: string): Promise<ProjectWithRelations | null> {
    let query = supabase
      .from('projects')
      .select(`
        *,
        financials:project_financials(total_value),
        client:clients(id, company_name, trading_name),
        manager:employees!projects_manager_id_fkey(id, nome, cargo)
      `)
      .eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching project:', error);
      throw error;
    }

    // Fetch members separately with cost data
    const { data: members } = await supabase
      .from('project_members')
      .select(`
        *,
        employee:employees(id, nome, cargo, foto_url, total_monthly_cost_estimated, jornada_diaria, data_admissao, termination:employee_terminations(termination_date))
      `)
      .eq('project_id', id);

    // Identidade dos membros e do gerente pelo diretório quando o embed vier
    // vazio por RLS (PUL-162). Campos de custo seguem só para admin/gerente.
    const directory = await fetchEmployeeDirectoryMap();
    const membersWithIdentity = withDirectoryIdentity(members ?? [], directory, {
      idField: 'employee_id',
      embedField: 'employee',
    });
    const projectRow = data as Record<string, unknown>;
    const managerId = projectRow.manager_id;
    if (!projectRow.manager && typeof managerId === 'string') {
      const managerEntry = directory.get(managerId);
      if (managerEntry) {
        projectRow.manager = {
          id: managerEntry.id,
          nome: managerEntry.nome,
          cargo: managerEntry.cargo,
        };
      }
    }

    // Fetch installments separately
    const { data: installments } = await supabase
      .from('project_installments')
      .select('*')
      .eq('project_id', id)
      .order('installment_number', { ascending: true });

    // Fetch suppliers + materials via porta única de custos (J9-02)
    const suppliers = await fetchProjectSuppliersRaw(id);
    const materials = await fetchProjectMaterialsRaw(id);

    // Fetch service name (service_line is plain text — only query if it looks like a UUID)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let service: { name: string; billing_type: string } | null = null;
    if (data.service_line && uuidPattern.test(data.service_line)) {
      const { data: svc } = await supabase
        .from('services')
        .select('name, billing_type')
        .eq('tenant_id', data.tenant_id)
        .eq('id', data.service_line)
        .single();
      if (svc) service = { name: svc.name, billing_type: svc.billing_type ?? '' };
    }

    return {
      ...withTotalValue(data),
      members: membersWithIdentity,
      installments: installments || [],
      suppliers: suppliers || [],
      materials: materials || [],
      service,
    } as unknown as ProjectWithRelations;
  },

  async create(input: CreateProjectInput, tenantId: string): Promise<ProjectDB> {
    // First create the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        tenant_id: tenantId,
        client_id: input.clientId || null,
        manager_id: input.managerId || null,
        budget_id: input.budgetId || null,
        name: input.name,
        description: input.description || null,
        start_date: input.startDate,
        end_date: input.endDate || null,
        is_continuous: input.isContinuous || false,
        payment_method: input.paymentMethod,
        installments_count: input.installmentsCount,
        first_invoice_date: input.firstInvoiceDate || null,
        due_day: input.dueDay,
        status: input.status || 'planning',
        duration_months: input.durationMonths || 1,
        renewal_date: input.renewalDate || null,
        service_line: input.serviceLine || null,
        success_fee_percent: input.successFeePercent ?? null,
        lead_id: input.leadId || null,
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      throw projectError;
    }

    const customInstallments = input.customInstallments?.map((installment) => ({
      project_id: project.id,
      installment_number: installment.installmentNumber,
      value: installment.value,
      due_date: installment.dueDate,
      status: 'pending' as InstallmentStatus,
      invoice_number: null,
      invoice_date: installment.invoiceDate || null,
      payment_date: null,
      notes: null,
    }));

    if (customInstallments?.length) {
      const { error: installmentsError } = await supabase
        .from('project_installments')
        .insert(customInstallments);

      if (installmentsError) {
        console.error('Error creating custom installments:', installmentsError);
      }
    } else if (input.firstInvoiceDate && input.serviceLine !== 'financiamento_inovacao') {
      // Generate installments (skip for financiamento_inovacao - manual installments)
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
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate || null;
    if (updates.isContinuous !== undefined) updateData.is_continuous = updates.isContinuous;
    if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
    if (updates.installmentsCount !== undefined) updateData.installments_count = updates.installmentsCount;
    if (updates.firstInvoiceDate !== undefined) updateData.first_invoice_date = updates.firstInvoiceDate || null;
    if (updates.dueDay !== undefined) updateData.due_day = updates.dueDay;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.renewalDate !== undefined) updateData.renewal_date = updates.renewalDate || null;
    if (updates.durationMonths !== undefined) updateData.duration_months = updates.durationMonths;
    if (updates.serviceLine !== undefined) updateData.service_line = updates.serviceLine;
    if (updates.successFeePercent !== undefined) updateData.success_fee_percent = updates.successFeePercent;
    if (updates.valueBookUrl !== undefined) updateData.value_book_url = updates.valueBookUrl || null;

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

    // Valor de contrato mora em project_financials (PUL-164).
    if (updates.totalValue !== undefined) {
      const { error: financialsError } = await supabase
        .from('project_financials')
        .upsert({ project_id: id, total_value: updates.totalValue }, { onConflict: 'project_id' });
      if (financialsError) {
        console.error('Error updating project total value:', financialsError);
        throw financialsError;
      }
    }

    // Regenerate installments if financial data changed
    const shouldRegenerateInstallments = 
      updates.totalValue !== undefined ||
      updates.installmentsCount !== undefined ||
      updates.firstInvoiceDate !== undefined ||
      updates.dueDay !== undefined ||
      updates.renewalDate !== undefined ||
      updates.isContinuous !== undefined;

    // Skip auto-regeneration for financiamento_inovacao projects
    if (shouldRegenerateInstallments && data.service_line !== 'financiamento_inovacao') {
      // Use the updated project data (from the UPDATE result)
      const projectIsContinuous = updates.isContinuous !== undefined ? updates.isContinuous : data.is_continuous;
      const projectFirstInvoiceDate = updates.firstInvoiceDate || data.first_invoice_date;
      const projectDueDay = updates.dueDay !== undefined ? updates.dueDay : data.due_day;
      let projectTotalValue = updates.totalValue;
      if (projectTotalValue === undefined) {
        const { data: currentFinancials } = await supabase
          .from('project_financials')
          .select('total_value')
          .eq('project_id', id)
          .maybeSingle();
        projectTotalValue = Number(currentFinancials?.total_value ?? 0);
      }
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
            const currentDate = new Date(projectFirstInvoiceDate);
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

  async hasActivity(projectId: string): Promise<boolean> {
    // Check invoiced/received installments
    const { count: installCount } = await supabase
      .from('project_installments')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .in('status', ['invoiced', 'received']);
    if ((installCount ?? 0) > 0) return true;

    // Check OKRs
    const { count: okrCount } = await supabase
      .from('project_okrs')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    if ((okrCount ?? 0) > 0) return true;

    // Check completed milestones
    const { count: milestoneCount } = await supabase
      .from('project_milestones')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .not('completed_date', 'is', null);
    if ((milestoneCount ?? 0) > 0) return true;

    // Check stakeholders
    const { count: stakeholderCount } = await supabase
      .from('project_stakeholders')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    if ((stakeholderCount ?? 0) > 0) return true;

    // Check paid commissions
    const { count: commissionCount } = await supabase
      .from('project_commissions')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .not('paid_date', 'is', null);
    if ((commissionCount ?? 0) > 0) return true;

    // Check key results
    const { count: krCount } = await (supabase as any)
      .from('project_key_results')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    if ((krCount ?? 0) > 0) return true;

    return false;
  },

  async deleteWithCascade(id: string): Promise<void> {
    // Get project info for commercial cleanup
    const { data: project } = await supabase
      .from('projects')
      .select('budget_id, lead_id')
      .eq('id', id)
      .single();

    // Delete project (FK CASCADE handles child tables)
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error('Error deleting project:', error);
      throw error;
    }

    // Clean up budget if exists
    if (project?.budget_id) {
      await supabase.from('budgets').delete().eq('id', project.budget_id);
    }

    // Clean up lead if exists
    if (project?.lead_id) {
      await supabase.from('leads').delete().eq('id', project.lead_id);
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },

  async archive(id: string, input: { reason: string; notes: string; cancelledBy: string }): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({
        status: 'cancelled',
        portfolio_stage: 'completed',
        cancellation_reason: input.reason,
        cancellation_notes: input.notes,
        cancelled_at: new Date().toISOString(),
        cancelled_by: input.cancelledBy,
      })
      .eq('id', id);

    if (error) {
      console.error('Error archiving project:', error);
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

    const directory = await fetchEmployeeDirectoryMap();
    return withDirectoryIdentity(data || [], directory, {
      idField: 'employee_id',
      embedField: 'employee',
    }) as unknown as (ProjectMemberDB & { employee?: { id: string; nome: string; cargo: string } })[];
  },

  /**
   * Recalculate cost_per_hour for all project_member_months and project_timesheets
   * linked to a given employee, using the employee_versions historical cost data.
   * Called after a new employee version is created (salary/contract change).
   */
  async recalculateMemberCosts(employeeId: string): Promise<void> {
    try {
      const { error } = await (supabase.rpc as any)('recalculate_employee_cost_snapshots', {
        p_employee_id: employeeId,
      });

      if (error) throw error;
    } catch (err) {
      console.error('Error recalculating member costs:', err);
      // Don't throw — recalculation is best-effort
    }
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
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;

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

  // Value Book upload
  async uploadValueBook(file: File, projectId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${projectId}/value-book-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading value book:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('contracts')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
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

  async createInstallment(input: CreateInstallmentInput): Promise<ProjectInstallmentDB> {
    // Get the next installment number
    const { data: existing } = await supabase
      .from('project_installments')
      .select('installment_number')
      .eq('project_id', input.projectId)
      .order('installment_number', { ascending: false })
      .limit(1);

    const nextNumber = (existing && existing.length > 0 ? existing[0].installment_number : 0) + 1;

    const { data, error } = await supabase
      .from('project_installments')
      .insert({
        project_id: input.projectId,
        installment_number: nextNumber,
        value: input.value,
        due_date: input.dueDate,
        status: 'pending' as InstallmentStatus,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating installment:', error);
      throw error;
    }

    return data as unknown as ProjectInstallmentDB;
  },

  async setNfEmissionLeadDays(projectId: string, days: number): Promise<void> {
    const { error } = await (supabase
      .from('projects') as any)
      .update({ nf_emission_lead_days: Math.max(0, Math.trunc(days)) })
      .eq('id', projectId);
    if (error) {
      console.error('Error updating nf_emission_lead_days:', error);
      throw error;
    }
  },

  async deleteInstallment(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_installments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting installment:', error);
      throw error;
    }
  },

  async search(query: string, tenantId: string): Promise<ProjectWithRelations[]> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        financials:project_financials(total_value),
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

    return ((data || []) as unknown[]).map(withTotalValue) as unknown as ProjectWithRelations[];
  },
};
