import { supabase } from '@/integrations/supabase/client';
import {
  BudgetDB,
  BudgetWithDetails,
  CreateBudgetInput,
  UpdateBudgetInput,
  BudgetStatus,
  BudgetCalculation,
  calculateBudgetTotals,
  calculateSuccessFeeTotals,
  BudgetRoleWithMonths,
} from '@/types/budget';

// Type helpers for Supabase queries until types are regenerated
type BudgetRow = {
  id: string;
  tenant_id: string;
  budget_number: string;
  title: string;
  status: BudgetStatus;
  valid_until: string | null;
  client_id: string | null;
  lead_name: string | null;
  lead_contact: string | null;
  start_date: string;
  duration_months: number;
  admin_expenses_percent: number;
  taxes_percent: number;
  commission_percent: number;
  net_margin_percent: number;
  discount_value: number;
  subtotal: number;
  total_with_fees: number;
  final_total: number;
  notes: string | null;
  billing_type?: string | null;
  success_fee_percent?: number | null;
  expected_revenue_12m?: number | null;
  planned_costs?: number | null;
  success_fee_type?: 'pontual' | 'continuo' | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    company_name: string;
    trading_name: string | null;
  } | null;
};

type BudgetRoleRow = {
  id: string;
  budget_id: string;
  role_rate_id: string | null;
  role_name: string;
  seniority: string;
  hourly_rate: number;
  created_at: string;
};

type BudgetRoleMonthRow = {
  id: string;
  budget_role_id: string;
  month_number: number;
  hours: number;
};

type BudgetMaterialRow = {
  id: string;
  budget_id: string;
  description: string;
  value: number;
  created_at: string;
};

type BudgetSupplierRow = {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  monthly_value: number;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (table: string) => supabase.from(table as any);

function computeTotals(input: CreateBudgetInput, durationMonths: number): BudgetCalculation {
  if (input.billingType === 'success_fee') {
    return calculateSuccessFeeTotals(
      input.roles,
      input.materials || [],
      input.suppliers || [],
      durationMonths,
      input.successFeePercent ?? 0,
      input.expectedRevenue12m ?? input.estimatedBase ?? 0,
      input.plannedCosts ?? 0
    );
  }
  return calculateBudgetTotals(
    input.roles,
    input.materials || [],
    input.suppliers || [],
    durationMonths,
    input.adminExpensesPercent,
    input.taxesPercent,
    input.commissionPercent,
    input.netMarginPercent,
    input.discountValue
  );
}

export const budgetService = {
  async getAll(tenantId: string): Promise<BudgetWithDetails[]> {
    const { data, error } = await fromTable('budgets')
      .select(`
        *,
        client:clients(id, company_name, trading_name)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching budgets:', error);
      throw error;
    }

    const budgets = data as unknown as BudgetRow[];

    // Fetch roles for all budgets
    const budgetIds = budgets.map((b) => b.id);
    if (budgetIds.length === 0) return [];

    const { data: rolesData, error: rolesError } = await fromTable('budget_roles')
      .select('*')
      .in('budget_id', budgetIds);

    if (rolesError) {
      console.error('Error fetching budget roles:', rolesError);
      throw rolesError;
    }

    const roles = rolesData as unknown as BudgetRoleRow[];

    // Fetch months for all roles
    const roleIds = roles.map((r) => r.id);
    let months: BudgetRoleMonthRow[] = [];
    
    if (roleIds.length > 0) {
      const { data: monthsData, error: monthsError } = await fromTable('budget_role_months')
        .select('*')
        .in('budget_role_id', roleIds);

      if (monthsError) {
        console.error('Error fetching budget role months:', monthsError);
        throw monthsError;
      }
      months = monthsData as unknown as BudgetRoleMonthRow[];
    }

    // Fetch materials for all budgets
    const { data: materialsData, error: materialsError } = await fromTable('budget_materials')
      .select('*')
      .in('budget_id', budgetIds);

    if (materialsError) {
      console.error('Error fetching budget materials:', materialsError);
      throw materialsError;
    }

    const materials = materialsData as unknown as BudgetMaterialRow[];

    // Fetch suppliers for all budgets
    const { data: suppliersData, error: suppliersError } = await fromTable('budget_suppliers')
      .select('*')
      .in('budget_id', budgetIds);

    if (suppliersError) {
      console.error('Error fetching budget suppliers:', suppliersError);
      throw suppliersError;
    }

    const suppliers = suppliersData as unknown as BudgetSupplierRow[];

    // Build the complete structure
    return budgets.map((budget) => {
      const budgetRoles = roles.filter((r) => r.budget_id === budget.id);
      const rolesWithMonths: BudgetRoleWithMonths[] = budgetRoles.map((role) => ({
        ...role,
        months: months.filter((m) => m.budget_role_id === role.id),
      }));

      const budgetMaterials = materials.filter((m) => m.budget_id === budget.id);
      const budgetSuppliers = suppliers.filter((s) => s.budget_id === budget.id);

      return {
        ...budget,
        roles: rolesWithMonths,
        materials: budgetMaterials,
        suppliers: budgetSuppliers,
      } as BudgetWithDetails;
    });
  },

  async getById(id: string): Promise<BudgetWithDetails | null> {
    const { data, error } = await fromTable('budgets')
      .select(`
        *,
        client:clients(id, company_name, trading_name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching budget:', error);
      throw error;
    }

    if (!data) return null;

    const budget = data as unknown as BudgetRow;

    // Fetch roles
    const { data: rolesData, error: rolesError } = await fromTable('budget_roles')
      .select('*')
      .eq('budget_id', id);

    if (rolesError) {
      console.error('Error fetching budget roles:', rolesError);
      throw rolesError;
    }

    const roles = rolesData as unknown as BudgetRoleRow[];

    // Fetch months
    const roleIds = roles.map((r) => r.id);
    let months: BudgetRoleMonthRow[] = [];

    if (roleIds.length > 0) {
      const { data: monthsData, error: monthsError } = await fromTable('budget_role_months')
        .select('*')
        .in('budget_role_id', roleIds);

      if (monthsError) {
        console.error('Error fetching budget role months:', monthsError);
        throw monthsError;
      }
      months = monthsData as unknown as BudgetRoleMonthRow[];
    }

    const rolesWithMonths: BudgetRoleWithMonths[] = roles.map((role) => ({
      ...role,
      months: months.filter((m) => m.budget_role_id === role.id),
    }));

    // Fetch materials
    const { data: materialsData, error: materialsError } = await fromTable('budget_materials')
      .select('*')
      .eq('budget_id', id);

    if (materialsError) {
      console.error('Error fetching budget materials:', materialsError);
      throw materialsError;
    }

    const materials = materialsData as unknown as BudgetMaterialRow[];

    // Fetch suppliers
    const { data: suppliersData, error: suppliersError } = await fromTable('budget_suppliers')
      .select('*')
      .eq('budget_id', id);

    if (suppliersError) {
      console.error('Error fetching budget suppliers:', suppliersError);
      throw suppliersError;
    }

    const suppliers = suppliersData as unknown as BudgetSupplierRow[];

    return {
      ...budget,
      roles: rolesWithMonths,
      materials,
      suppliers,
    } as BudgetWithDetails;
  },

  async generateBudgetNumber(tenantId: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('generate_budget_number', {
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error('Error generating budget number:', error);
      throw error;
    }

    return data as string;
  },

  async create(
    input: CreateBudgetInput,
    tenantId: string,
    createdBy: string
  ): Promise<BudgetDB> {
    // Generate budget number
    const budgetNumber = await this.generateBudgetNumber(tenantId);

    // Calculate totals using the appropriate formula for the billing type
    const totals = computeTotals(input, input.durationMonths);

    // Insert budget
    const { data: budget, error: budgetError } = await fromTable('budgets')
      .insert({
        tenant_id: tenantId,
        budget_number: budgetNumber,
        title: input.title,
        valid_until: input.validUntil || null,
        client_id: input.clientId || null,
        lead_name: input.leadName || null,
        lead_contact: input.leadContact || null,
        start_date: input.startDate,
        duration_months: input.durationMonths,
        admin_expenses_percent: input.adminExpensesPercent,
        taxes_percent: input.taxesPercent,
        commission_percent: input.commissionPercent,
        net_margin_percent: input.netMarginPercent,
        discount_value: input.discountValue,
        subtotal: totals.laborCost,
        total_with_fees: input.billingType === 'no_revenue' ? 0 : totals.sellingPrice,
        final_total: input.billingType === 'no_revenue' ? 0 : totals.finalTotal,
        monthly_value: input.monthlyValue ?? null,
        is_recurring: input.isRecurring ?? false,
        billing_type: input.billingType ?? null,
        success_fee_percent: input.successFeePercent ?? null,
        expected_revenue_12m: input.expectedRevenue12m ?? null,
        planned_costs: input.plannedCosts ?? null,
        success_fee_type: input.successFeeType ?? null,
        notes: input.notes || null,
        created_by: createdBy,
        margin_override_approved: input.marginOverrideApproved || false,
        margin_override_approved_by: input.marginOverrideApproved ? createdBy : null,
        margin_override_approved_at: input.marginOverrideApproved ? new Date().toISOString() : null,
        margin_override_pending: input.marginOverridePending || false,
      })
      .select()
      .single();

    if (budgetError) {
      console.error('Error creating budget:', budgetError);
      throw budgetError;
    }

    const createdBudget = budget as unknown as BudgetDB;

    // Insert roles and months
    for (const roleInput of input.roles) {
      const { data: role, error: roleError } = await fromTable('budget_roles')
        .insert({
          budget_id: createdBudget.id,
          role_rate_id: roleInput.roleRateId || null,
          role_name: roleInput.roleName,
          seniority: roleInput.seniority,
          hourly_rate: roleInput.hourlyRate,
        })
        .select()
        .single();

      if (roleError) {
        console.error('Error creating budget role:', roleError);
        throw roleError;
      }

      const createdRole = role as unknown as BudgetRoleRow;

      // Insert months for this role
      const monthsToInsert = roleInput.months
        .filter((m) => m.hours > 0)
        .map((m) => ({
          budget_role_id: createdRole.id,
          month_number: m.monthNumber,
          hours: m.hours,
        }));

      if (monthsToInsert.length > 0) {
        const { error: monthsError } = await fromTable('budget_role_months')
          .insert(monthsToInsert);

        if (monthsError) {
          console.error('Error creating budget role months:', monthsError);
          throw monthsError;
        }
      }
    }

    // Insert materials
    if (input.materials && input.materials.length > 0) {
      const materialsToInsert = input.materials
        .filter((m) => m.description.trim() !== '')
        .map((m) => ({
          budget_id: createdBudget.id,
          description: m.description,
          value: m.value || 0,
        }));

      if (materialsToInsert.length > 0) {
        const { error: materialsError } = await fromTable('budget_materials')
          .insert(materialsToInsert);

        if (materialsError) {
          console.error('Error creating budget materials:', materialsError);
          throw materialsError;
        }
      }
    }

    // Insert suppliers
    if (input.suppliers && input.suppliers.length > 0) {
      const suppliersToInsert = input.suppliers
        .filter((s) => s.name.trim() !== '')
        .map((s) => ({
          budget_id: createdBudget.id,
          name: s.name,
          description: s.description || null,
          monthly_value: s.monthlyValue || 0,
        }));

      if (suppliersToInsert.length > 0) {
        const { error: suppliersError } = await fromTable('budget_suppliers')
          .insert(suppliersToInsert);

        if (suppliersError) {
          console.error('Error creating budget suppliers:', suppliersError);
          throw suppliersError;
        }
      }
    }

    return createdBudget;
  },

  async update(id: string, input: UpdateBudgetInput, createdBy?: string | null): Promise<BudgetDB> {
    // First get the existing budget to get duration_months for calculation
    // and to create a version snapshot before updating
    const existing = await this.getById(id);
    
    // Import version service dynamically to avoid circular dependency
    if (existing) {
      const { budgetVersionService } = await import('./budgetVersionService');
      await budgetVersionService.createVersion(existing, createdBy || null);
    }
    
    const durationMonths = input.durationMonths ?? existing?.duration_months ?? 1;

    // If roles are being updated, recalculate totals using the appropriate formula
    let totals: BudgetCalculation | null = null;
    if (input.roles && input.adminExpensesPercent !== undefined) {
      totals = computeTotals(
        { ...input, adminExpensesPercent: input.adminExpensesPercent, taxesPercent: input.taxesPercent || 0, commissionPercent: input.commissionPercent || 0, netMarginPercent: input.netMarginPercent || 0, discountValue: input.discountValue || 0 } as CreateBudgetInput,
        durationMonths
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.validUntil !== undefined) updateData.valid_until = input.validUntil || null;
    if (input.clientId !== undefined) updateData.client_id = input.clientId || null;
    if (input.leadName !== undefined) updateData.lead_name = input.leadName || null;
    if (input.leadContact !== undefined) updateData.lead_contact = input.leadContact || null;
    if (input.startDate !== undefined) updateData.start_date = input.startDate;
    if (input.durationMonths !== undefined) updateData.duration_months = input.durationMonths;
    if (input.adminExpensesPercent !== undefined) updateData.admin_expenses_percent = input.adminExpensesPercent;
    if (input.taxesPercent !== undefined) updateData.taxes_percent = input.taxesPercent;
    if (input.commissionPercent !== undefined) updateData.commission_percent = input.commissionPercent;
    if (input.netMarginPercent !== undefined) updateData.net_margin_percent = input.netMarginPercent;
    if (input.discountValue !== undefined) updateData.discount_value = input.discountValue;
    if (input.notes !== undefined) updateData.notes = input.notes || null;
    if (input.marginOverrideApproved !== undefined) {
      updateData.margin_override_approved = input.marginOverrideApproved;
      updateData.margin_override_approved_by = input.marginOverrideApproved ? (createdBy || null) : null;
      updateData.margin_override_approved_at = input.marginOverrideApproved ? new Date().toISOString() : null;
    }
    if (input.marginOverridePending !== undefined) {
      updateData.margin_override_pending = input.marginOverridePending;
    }

    if (totals) {
      const isNoRevenue = input.billingType === 'no_revenue';
      updateData.subtotal = totals.laborCost;
      updateData.total_with_fees = isNoRevenue ? 0 : totals.sellingPrice;
      updateData.final_total = isNoRevenue ? 0 : totals.finalTotal;
    }
    if (input.monthlyValue !== undefined) updateData.monthly_value = input.monthlyValue ?? null;
    if (input.isRecurring !== undefined) updateData.is_recurring = input.isRecurring;
    if (input.billingType !== undefined) updateData.billing_type = input.billingType ?? null;
    if (input.successFeePercent !== undefined) updateData.success_fee_percent = input.successFeePercent ?? null;
    if (input.expectedRevenue12m !== undefined) updateData.expected_revenue_12m = input.expectedRevenue12m ?? null;
    if (input.plannedCosts !== undefined) updateData.planned_costs = input.plannedCosts ?? null;
    if (input.successFeeType !== undefined) updateData.success_fee_type = input.successFeeType ?? null;

    const { data, error } = await fromTable('budgets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating budget:', error);
      throw error;
    }

    const updatedBudget = data as unknown as BudgetDB;

    // If roles are being updated, delete old and insert new
    if (input.roles) {
      // Delete existing roles (cascade deletes months)
      const { error: deleteError } = await fromTable('budget_roles')
        .delete()
        .eq('budget_id', id);

      if (deleteError) {
        console.error('Error deleting budget roles:', deleteError);
        throw deleteError;
      }

      // Insert new roles
      for (const roleInput of input.roles) {
        const { data: role, error: roleError } = await fromTable('budget_roles')
          .insert({
            budget_id: id,
            role_rate_id: roleInput.roleRateId || null,
            role_name: roleInput.roleName,
            seniority: roleInput.seniority,
            hourly_rate: roleInput.hourlyRate,
          })
          .select()
          .single();

        if (roleError) {
          console.error('Error creating budget role:', roleError);
          throw roleError;
        }

        const createdRole = role as unknown as BudgetRoleRow;

        const monthsToInsert = roleInput.months
          .filter((m) => m.hours > 0)
          .map((m) => ({
            budget_role_id: createdRole.id,
            month_number: m.monthNumber,
            hours: m.hours,
          }));

        if (monthsToInsert.length > 0) {
          const { error: monthsError } = await fromTable('budget_role_months')
            .insert(monthsToInsert);

          if (monthsError) {
            console.error('Error creating budget role months:', monthsError);
            throw monthsError;
          }
        }
      }
    }

    // If materials are being updated, delete old and insert new
    if (input.materials !== undefined) {
      // Delete existing materials
      const { error: deleteMaterialsError } = await fromTable('budget_materials')
        .delete()
        .eq('budget_id', id);

      if (deleteMaterialsError) {
        console.error('Error deleting budget materials:', deleteMaterialsError);
        throw deleteMaterialsError;
      }

      // Insert new materials
      if (input.materials.length > 0) {
        const materialsToInsert = input.materials
          .filter((m) => m.description.trim() !== '')
          .map((m) => ({
            budget_id: id,
            description: m.description,
            value: m.value || 0,
          }));

        if (materialsToInsert.length > 0) {
          const { error: insertMaterialsError } = await fromTable('budget_materials')
            .insert(materialsToInsert);

          if (insertMaterialsError) {
            console.error('Error creating budget materials:', insertMaterialsError);
            throw insertMaterialsError;
          }
        }
      }
    }

    // If suppliers are being updated, delete old and insert new
    if (input.suppliers !== undefined) {
      // Delete existing suppliers
      const { error: deleteSuppliersError } = await fromTable('budget_suppliers')
        .delete()
        .eq('budget_id', id);

      if (deleteSuppliersError) {
        console.error('Error deleting budget suppliers:', deleteSuppliersError);
        throw deleteSuppliersError;
      }

      // Insert new suppliers
      if (input.suppliers.length > 0) {
        const suppliersToInsert = input.suppliers
          .filter((s) => s.name.trim() !== '')
          .map((s) => ({
            budget_id: id,
            name: s.name,
            description: s.description || null,
            monthly_value: s.monthlyValue || 0,
          }));

        if (suppliersToInsert.length > 0) {
          const { error: insertSuppliersError } = await fromTable('budget_suppliers')
            .insert(suppliersToInsert);

          if (insertSuppliersError) {
            console.error('Error creating budget suppliers:', insertSuppliersError);
            throw insertSuppliersError;
          }
        }
      }
    }

    return updatedBudget;
  },

  async updateStatus(id: string, status: BudgetStatus): Promise<BudgetDB> {
    const { data, error } = await fromTable('budgets')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating budget status:', error);
      throw error;
    }

    return data as unknown as BudgetDB;
  },

  async delete(id: string): Promise<void> {
    const { error } = await fromTable('budgets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting budget:', error);
      throw error;
    }
  },

  async duplicate(id: string, tenantId: string, createdBy: string): Promise<BudgetDB> {
    // Get original budget with details
    const original = await this.getById(id);
    if (!original) {
      throw new Error('Budget not found');
    }

    // Create input from original
    const input: CreateBudgetInput = {
      title: `${original.title} (Cópia)`,
      validUntil: original.valid_until || undefined,
      clientId: original.client_id || undefined,
      leadName: original.lead_name || undefined,
      leadContact: original.lead_contact || undefined,
      startDate: original.start_date,
      durationMonths: original.duration_months,
      adminExpensesPercent: original.admin_expenses_percent,
      taxesPercent: original.taxes_percent,
      commissionPercent: original.commission_percent,
      netMarginPercent: 0,
      discountValue: (original as any).discount_value ?? 0,
      notes: original.notes || undefined,
      roles: original.roles.map((role) => ({
        tempId: crypto.randomUUID(),
        roleRateId: role.role_rate_id || '',
        roleName: role.role_name,
        seniority: role.seniority,
        hourlyRate: role.hourly_rate,
        months: role.months.map((m) => ({
          monthNumber: m.month_number,
          hours: m.hours,
        })),
      })),
      materials: (original.materials || []).map((m) => ({
        tempId: crypto.randomUUID(),
        description: m.description,
        value: m.value,
      })),
      suppliers: (original.suppliers || []).map((s) => ({
        tempId: crypto.randomUUID(),
        name: s.name,
        description: s.description || '',
        monthlyValue: s.monthly_value,
      })),
    };

    return this.create(input, tenantId, createdBy);
  },
};
