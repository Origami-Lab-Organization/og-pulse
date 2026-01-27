import { supabase } from '@/integrations/supabase/client';
import { EmployeeTool, CreateEmployeeToolInput, EmployeeBenefit, CreateEmployeeBenefitInput, ContractType } from '@/types/employee';
import { employeeVersionService } from './employeeVersionService';
export interface EmployeeDB {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  cpf: string;
  data_admissao: string;
  is_gerente: boolean;
  status: string;
  salario_mensal: number;
  beneficios: number;
  encargos: number;
  tipo_contratacao: string;
  jornada_mensal: number;
  salario_liquido: number;
  fgts: number;
  inss_empresa: number;
  decimo_terceiro: number;
  ferias: number;
  pro_labore: number;
  tenant_id: string;
  auth_id: string | null;
  must_change_password: boolean;
  temp_password: string | null;
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
  status: string;
  salarioMensal: number;
  beneficios: number;
  encargos: number;
  tipoContratacao: ContractType;
  jornadaMensal: number;
  salarioLiquido: number;
  fgts: number;
  inssEmpresa: number;
  decimoTerceiro: number;
  ferias: number;
  proLabore: number;
}

export const employeeService = {
  async getAll(tenantId: string): Promise<(EmployeeDB & { employee_tools: { monthly_cost: number }[], employee_benefits: { monthly_value: number }[] })[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*, employee_tools(monthly_cost), employee_benefits(monthly_value)')
      .eq('tenant_id', tenantId)
      .order('nome');

    if (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }

    return (data || []) as (EmployeeDB & { employee_tools: { monthly_cost: number }[], employee_benefits: { monthly_value: number }[] })[];
  },

  async getById(id: string): Promise<EmployeeDB | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

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

  async update(id: string, updates: Partial<CreateEmployeeInput>, createNewVersion: boolean = false): Promise<EmployeeDB> {
    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.nome !== undefined) dbUpdates.nome = updates.nome;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.telefone !== undefined) dbUpdates.telefone = updates.telefone;
    if (updates.cargo !== undefined) dbUpdates.cargo = updates.cargo;
    if (updates.cpf !== undefined) dbUpdates.cpf = updates.cpf;
    if (updates.dataAdmissao !== undefined) dbUpdates.data_admissao = updates.dataAdmissao;
    if (updates.isGerente !== undefined) dbUpdates.is_gerente = updates.isGerente;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.salarioMensal !== undefined) dbUpdates.salario_mensal = updates.salarioMensal;
    if (updates.beneficios !== undefined) dbUpdates.beneficios = updates.beneficios;
    if (updates.encargos !== undefined) dbUpdates.encargos = updates.encargos;
    if (updates.tipoContratacao !== undefined) dbUpdates.tipo_contratacao = updates.tipoContratacao;
    if (updates.jornadaMensal !== undefined) dbUpdates.jornada_mensal = updates.jornadaMensal;
    if (updates.salarioLiquido !== undefined) dbUpdates.salario_liquido = updates.salarioLiquido;
    if (updates.fgts !== undefined) dbUpdates.fgts = updates.fgts;
    if (updates.inssEmpresa !== undefined) dbUpdates.inss_empresa = updates.inssEmpresa;
    if (updates.decimoTerceiro !== undefined) dbUpdates.decimo_terceiro = updates.decimoTerceiro;
    if (updates.ferias !== undefined) dbUpdates.ferias = updates.ferias;
    if (updates.proLabore !== undefined) dbUpdates.pro_labore = updates.proLabore;

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
        await employeeVersionService.createVersion({
          employeeId: id,
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
          tipoContratacao: updatedEmployee.tipo_contratacao,
          cargo: updatedEmployee.cargo,
        });
      } catch (versionError) {
        console.error('Error creating employee version:', versionError);
        // Don't throw - the employee was updated successfully
      }
    }

    return updatedEmployee;
  },

  async inactivate(id: string): Promise<EmployeeDB> {
    const { data, error } = await supabase
      .from('employees')
      .update({ status: 'inativo' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error inactivating employee:', error);
      throw error;
    }

    return data as EmployeeDB;
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
};
