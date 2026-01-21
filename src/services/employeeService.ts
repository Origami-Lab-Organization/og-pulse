import { supabase } from '@/integrations/supabase/client';

export interface EmployeeDB {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cargo: string;
  cpf: string | null;
  data_admissao: string;
  is_gerente: boolean;
  status: string;
  salario_mensal: number;
  beneficios: number;
  encargos: number;
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
  telefone?: string;
  cargo: string;
  cpf?: string;
  dataAdmissao: string;
  isGerente: boolean;
  status: string;
  salarioMensal: number;
  beneficios: number;
  encargos: number;
}

export const employeeService = {
  async getAll(tenantId: string): Promise<EmployeeDB[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('nome');

    if (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }

    return data || [];
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

    return data;
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

  async update(id: string, updates: Partial<CreateEmployeeInput>): Promise<EmployeeDB> {
    const dbUpdates: Record<string, any> = {};
    
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

    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting employee:', error);
      throw error;
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

    return data || [];
  },
};
