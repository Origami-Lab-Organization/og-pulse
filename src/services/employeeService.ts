import { supabase } from '@/integrations/supabase/client';
import { EmployeeTool, CreateEmployeeToolInput, EmployeeBenefit, CreateEmployeeBenefitInput, ContractType, SystemRole } from '@/types/employee';
import { employeeVersionService } from './employeeVersionService';
import { CostBreakdown, calculateEmployeeCost } from '@/lib/employeeCostCalculator';
import { PayrollProfile, DEFAULT_PAYROLL_PROFILE } from '@/types/payrollProfile';
import { Json } from '@/integrations/supabase/types';

export interface EmployeeDB {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  cpf: string;
  data_admissao: string;
  is_gerente: boolean;
  system_role: string;
  status: string;
  salario_mensal: number;
  beneficios: number;
  encargos: number;
  tipo_contratacao: string;
  jornada_mensal: number;
  jornada_diaria: number;
  salario_liquido: number;
  fgts: number;
  inss_empresa: number;
  decimo_terceiro: number;
  ferias: number;
  pro_labore: number;
  // New fields
  bolsa_auxilio: number;
  valor_contrato_pj: number;
  dividendos: number;
  provisao_13: number;
  provisao_ferias: number;
  provisao_recesso: number;
  total_monthly_cost_estimated: number;
  total_annual_cost_estimated: number;
  breakdown_json: Json | null;
  data_nascimento: string | null;
  foto_url: string | null;
  tenant_id: string;
  auth_id: string | null;
  must_change_password: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeInput {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  cpf: string;
  dataAdmissao: string;
  isGerente: boolean;
  systemRole: SystemRole;
  status: string;
  salarioMensal: number;
  beneficios: number;
  encargos: number;
  tipoContratacao: ContractType;
  jornadaMensal: number;
  jornadaDiaria?: number;
  salarioLiquido: number;
  fgts: number;
  inssEmpresa: number;
  decimoTerceiro: number;
  ferias: number;
  proLabore: number;
  // New fields
  bolsaAuxilio?: number;
  valorContratoPj?: number;
  dividendos?: number;
  provisao13?: number;
  provisaoFerias?: number;
  provisaoRecesso?: number;
  totalMonthlyCostEstimated?: number;
  totalAnnualCostEstimated?: number;
  breakdownJson?: CostBreakdown;
  dataNascimento?: string;
  fotoUrl?: string;
}

export const employeeService = {
  async getAll(tenantId: string): Promise<(EmployeeDB & {
    employee_tools: { monthly_cost: number; is_active: boolean }[];
    employee_benefits: { monthly_value: number; is_active: boolean }[];
  })[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*, employee_tools(monthly_cost, is_active), employee_benefits(monthly_value, is_active)')
      .eq('tenant_id', tenantId)
      .order('nome');

    if (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }

    return (data || []) as (EmployeeDB & {
      employee_tools: { monthly_cost: number; is_active: boolean }[];
      employee_benefits: { monthly_value: number; is_active: boolean }[];
    })[];
  },

  async getById(id: string, tenantId?: string): Promise<EmployeeDB | null> {
    let query = supabase.from('employees').select('*').eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching employee:', error);
      return null;
    }

    return data as EmployeeDB;
  },

  async create(input: CreateEmployeeInput, tenantId: string, loginUrl: string): Promise<EmployeeDB> {
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-employee-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          ...input,
          tenantId,
          loginUrl,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create employee');
    }

    return result.employee;
  },

  async update(id: string, updates: Partial<CreateEmployeeInput>, createNewVersion: boolean = false, effectiveFrom?: string): Promise<EmployeeDB> {
    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.nome !== undefined) dbUpdates.nome = updates.nome;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.telefone !== undefined) dbUpdates.telefone = updates.telefone;
    if (updates.cargo !== undefined) dbUpdates.cargo = updates.cargo;
    if (updates.cpf !== undefined) dbUpdates.cpf = updates.cpf;
    if (updates.dataAdmissao !== undefined) dbUpdates.data_admissao = updates.dataAdmissao;
    if (updates.isGerente !== undefined) dbUpdates.is_gerente = updates.isGerente;
    if (updates.systemRole !== undefined) dbUpdates.system_role = updates.systemRole;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.salarioMensal !== undefined) dbUpdates.salario_mensal = updates.salarioMensal;
    if (updates.beneficios !== undefined) dbUpdates.beneficios = updates.beneficios;
    if (updates.encargos !== undefined) dbUpdates.encargos = updates.encargos;
    if (updates.tipoContratacao !== undefined) dbUpdates.tipo_contratacao = updates.tipoContratacao;
    if (updates.jornadaMensal !== undefined) dbUpdates.jornada_mensal = updates.jornadaMensal;
    if (updates.jornadaDiaria !== undefined) dbUpdates.jornada_diaria = updates.jornadaDiaria;
    if (updates.salarioLiquido !== undefined) dbUpdates.salario_liquido = updates.salarioLiquido;
    if (updates.fgts !== undefined) dbUpdates.fgts = updates.fgts;
    if (updates.inssEmpresa !== undefined) dbUpdates.inss_empresa = updates.inssEmpresa;
    if (updates.decimoTerceiro !== undefined) dbUpdates.decimo_terceiro = updates.decimoTerceiro;
    if (updates.ferias !== undefined) dbUpdates.ferias = updates.ferias;
    if (updates.proLabore !== undefined) dbUpdates.pro_labore = updates.proLabore;
    // New fields
    if (updates.bolsaAuxilio !== undefined) dbUpdates.bolsa_auxilio = updates.bolsaAuxilio;
    if (updates.valorContratoPj !== undefined) dbUpdates.valor_contrato_pj = updates.valorContratoPj;
    if (updates.dividendos !== undefined) dbUpdates.dividendos = updates.dividendos;
    if (updates.provisao13 !== undefined) dbUpdates.provisao_13 = updates.provisao13;
    if (updates.provisaoFerias !== undefined) dbUpdates.provisao_ferias = updates.provisaoFerias;
    if (updates.provisaoRecesso !== undefined) dbUpdates.provisao_recesso = updates.provisaoRecesso;
    if (updates.totalMonthlyCostEstimated !== undefined) dbUpdates.total_monthly_cost_estimated = updates.totalMonthlyCostEstimated;
    if (updates.totalAnnualCostEstimated !== undefined) dbUpdates.total_annual_cost_estimated = updates.totalAnnualCostEstimated;
    if (updates.breakdownJson !== undefined) dbUpdates.breakdown_json = updates.breakdownJson;
    if (updates.dataNascimento !== undefined) dbUpdates.data_nascimento = updates.dataNascimento;
    if (updates.fotoUrl !== undefined) dbUpdates.foto_url = updates.fotoUrl;

    // Capture current cost before update so we can backfill the old version
    let oldTotalMonthlyCost: number | null = null;
    if (createNewVersion) {
      const { data: current } = await supabase
        .from('employees')
        .select('total_monthly_cost_estimated')
        .eq('id', id)
        .single();
      oldTotalMonthlyCost = current?.total_monthly_cost_estimated ?? null;
    }

    const { data, error } = await supabase
      .from('employees')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      throw error;
    }

    const updatedEmployee = data as EmployeeDB;

    // Create a new version if requested (for financial/charge changes)
    if (createNewVersion) {
      try {
        // Backfill total_monthly_cost_estimated into the still-open version BEFORE
        // createVersion closes it, preserving the historical cost for that period
        await supabase
          .from('employee_versions')
          .update({ total_monthly_cost_estimated: oldTotalMonthlyCost })
          .eq('employee_id', id)
          .is('effective_until', null);

        await employeeVersionService.createVersion({
          employeeId: id,
          effectiveFrom,
          salarioMensal: updatedEmployee.salario_mensal,
          salarioLiquido: updatedEmployee.salario_liquido,
          beneficios: updatedEmployee.beneficios,
          encargos: updatedEmployee.encargos,
          fgts: updatedEmployee.fgts,
          inssEmpresa: updatedEmployee.inss_empresa,
          decimoTerceiro: updatedEmployee.decimo_terceiro,
          ferias: updatedEmployee.ferias,
          proLabore: updatedEmployee.pro_labore,
          jornadaMensal: updatedEmployee.jornada_mensal,
          jornadaDiaria: updatedEmployee.jornada_diaria,
          tipoContratacao: updatedEmployee.tipo_contratacao,
          cargo: updatedEmployee.cargo,
          totalMonthlyCostEstimated: updatedEmployee.total_monthly_cost_estimated,
        });
      } catch (versionError) {
        console.error('Error creating employee version:', versionError);
        // Don't throw - the employee was updated successfully
      }
    }

    return updatedEmployee;
  },

  async block(id: string): Promise<EmployeeDB> {
    const { data, error } = await supabase
      .from('employees')
      .update({ status: 'bloqueado' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error blocking employee:', error);
      throw error;
    }

    return data as EmployeeDB;
  },

  async unblock(id: string, previousStatus: 'ativo' | 'aguardando_confirmacao' = 'ativo'): Promise<EmployeeDB> {
    const { data, error } = await supabase
      .from('employees')
      .update({ status: previousStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error unblocking employee:', error);
      throw error;
    }

    return data as EmployeeDB;
  },

  async archive(id: string): Promise<EmployeeDB> {
    const { data, error } = await supabase
      .from('employees')
      .update({ status: 'arquivado' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error archiving employee:', error);
      throw error;
    }

    return data as EmployeeDB;
  },

  async resendInvite(id: string, loginUrl: string): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-employee-invite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          employeeId: id,
          loginUrl,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to resend invite');
    }
  },

  async search(query: string, tenantId: string): Promise<EmployeeDB[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`nome.ilike.%${query}%,cargo.ilike.%${query}%,email.ilike.%${query}%`)
      .order('nome');

    if (error) {
      console.error('Error searching employees:', error);
      throw error;
    }

    return (data || []) as EmployeeDB[];
  },

  // Employee Tools
  async getTools(employeeId: string): Promise<EmployeeTool[]> {
    const { data, error } = await supabase
      .from('employee_tools')
      .select('*')
      .eq('employee_id', employeeId)
      .order('name');

    if (error) {
      console.error('Error fetching employee tools:', error);
      throw error;
    }

    return (data || []) as EmployeeTool[];
  },

  async addTool(input: CreateEmployeeToolInput): Promise<EmployeeTool> {
    const { data, error } = await supabase
      .from('employee_tools')
      .insert({
        employee_id: input.employeeId,
        name: input.name,
        description: input.description || null,
        monthly_cost: input.monthlyCost,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding employee tool:', error);
      throw error;
    }

    return data as EmployeeTool;
  },

  async updateTool(id: string, updates: Partial<Omit<CreateEmployeeToolInput, 'employeeId'>>): Promise<EmployeeTool> {
    const updateData: Record<string, unknown> = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.monthlyCost !== undefined) updateData.monthly_cost = updates.monthlyCost;

    const { data, error } = await supabase
      .from('employee_tools')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee tool:', error);
      throw error;
    }

    return data as EmployeeTool;
  },

  async deleteTool(id: string): Promise<void> {
    const { error } = await supabase
      .from('employee_tools')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting employee tool:', error);
      throw error;
    }
  },

  // Employee Benefits
  async getBenefits(employeeId: string): Promise<EmployeeBenefit[]> {
    const { data, error } = await supabase
      .from('employee_benefits')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching employee benefits:', error);
      throw error;
    }

    return (data || []) as EmployeeBenefit[];
  },

  async addBenefit(input: CreateEmployeeBenefitInput): Promise<EmployeeBenefit> {
    const { data, error } = await supabase
      .from('employee_benefits')
      .insert({
        employee_id: input.employeeId,
        name: input.name,
        description: input.description || null,
        monthly_value: input.monthlyValue,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding employee benefit:', error);
      throw error;
    }

    return data as EmployeeBenefit;
  },

  async updateBenefit(id: string, updates: Partial<Omit<CreateEmployeeBenefitInput, 'employeeId'>>): Promise<EmployeeBenefit> {
    const updateData: Record<string, unknown> = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.monthlyValue !== undefined) updateData.monthly_value = updates.monthlyValue;

    const { data, error } = await supabase
      .from('employee_benefits')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee benefit:', error);
      throw error;
    }

    return data as EmployeeBenefit;
  },

  async deleteBenefit(id: string): Promise<void> {
    const { error } = await supabase
      .from('employee_benefits')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting employee benefit:', error);
      throw error;
    }
  },

  async recalculateAndUpdateCost(
    employeeId: string,
    payrollProfile?: Partial<PayrollProfile>,
    effectiveFrom?: string
  ): Promise<void> {
    // 1. Fetch employee data
    const employee = await this.getById(employeeId);
    if (!employee) throw new Error('Employee not found');

    // 2. Fetch benefits total
    const { data: benefits } = await supabase
      .from('employee_benefits')
      .select('monthly_value')
      .eq('employee_id', employeeId)
      .eq('is_active', true);
    const benefitsTotal = (benefits || []).reduce((s, b) => s + Number(b.monthly_value), 0);

    // 3. Fetch tools total
    const { data: tools } = await supabase
      .from('employee_tools')
      .select('monthly_cost')
      .eq('employee_id', employeeId)
      .eq('is_active', true);
    const toolsTotal = (tools || []).reduce((s, t) => s + Number(t.monthly_cost), 0);

    // 4. Calculate cost
    const breakdown = calculateEmployeeCost({
      tipoContratacao: employee.tipo_contratacao as ContractType,
      salarioBruto: Number(employee.salario_mensal),
      bolsaAuxilio: Number(employee.bolsa_auxilio),
      valorContratoPj: Number(employee.valor_contrato_pj),
      proLabore: Number(employee.pro_labore),
      dividendos: Number(employee.dividendos),
      benefitsTotalMonthly: benefitsTotal,
      toolsTotalMonthly: toolsTotal,
      payrollProfile: payrollProfile || undefined,
    });

    // 5. Update employee record
    const { error: updateError } = await supabase
      .from('employees')
      .update({
        beneficios: benefitsTotal,
        total_monthly_cost_estimated: breakdown.totalMonthlyCost,
        total_annual_cost_estimated: breakdown.totalAnnualCost,
        breakdown_json: breakdown as unknown as Json,
        encargos: breakdown.chargesAmount,
        fgts: breakdown.details.fgts,
        inss_empresa: breakdown.details.inss,
        decimo_terceiro: breakdown.details.provisao13,
        ferias: breakdown.details.provisaoFerias,
        provisao_13: breakdown.details.provisao13,
        provisao_ferias: breakdown.details.provisaoFerias,
      })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Error updating employee cost:', updateError);
      throw updateError;
    }

    // 6. Create version if effectiveFrom provided
    if (effectiveFrom) {
      try {
        await employeeVersionService.createVersion({
          employeeId,
          effectiveFrom,
          salarioMensal: Number(employee.salario_mensal),
          salarioLiquido: Number(employee.salario_liquido),
          beneficios: benefitsTotal,
          encargos: breakdown.chargesAmount,
          fgts: breakdown.details.fgts,
          inssEmpresa: breakdown.details.inss,
          decimoTerceiro: breakdown.details.provisao13,
          ferias: breakdown.details.provisaoFerias,
          proLabore: Number(employee.pro_labore),
          jornadaMensal: Number(employee.jornada_mensal),
          jornadaDiaria: Number(employee.jornada_diaria),
          tipoContratacao: employee.tipo_contratacao,
          cargo: employee.cargo,
        });
      } catch (versionError) {
        console.error('Error creating employee version:', versionError);
      }
    }
  },
};
