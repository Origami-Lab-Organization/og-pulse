import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { CostCenter, CostCenterFormData } from '@/types/costCenter';

const TABLE = 'cost_centers';
/** Código Postgres de violação de unicidade (índice `cost_centers_tenant_name_key`). */
const UNIQUE_VIOLATION = '23505';

export const DUPLICATE_COST_CENTER_MESSAGE = 'Já existe um centro de custo com este nome nesta empresa.';

function toError(error: PostgrestError): Error {
  if (error.code === UNIQUE_VIOLATION) return new Error(DUPLICATE_COST_CENTER_MESSAGE);
  return new Error(error.message);
}

function toRow(form: CostCenterFormData): { name: string; description: string | null } {
  const description = form.description?.trim();
  return { name: form.name.trim(), description: description ? description : null };
}

/**
 * Acesso a `cost_centers`. A RLS decide: leitura para todo membro do tenant, escrita por
 * `configuracao:editar`. Não há exclusão: centro sai de uso por `is_active` (PUL-217).
 */
export const costCenterService = {
  async getAll(): Promise<CostCenter[]> {
    // Ativos primeiro, depois por nome: o que está em uso aparece antes do que saiu de uso.
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('is_active', { ascending: false })
      .order('name');
    if (error) throw toError(error);
    return (data ?? []) as CostCenter[];
  },

  async create(tenantId: string, form: CostCenterFormData): Promise<CostCenter> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ tenant_id: tenantId, ...toRow(form) })
      .select()
      .single();
    if (error) throw toError(error);
    return data as CostCenter;
  },

  async update(id: string, form: CostCenterFormData): Promise<CostCenter> {
    const { data, error } = await supabase.from(TABLE).update(toRow(form)).eq('id', id).select().single();
    if (error) throw toError(error);
    return data as CostCenter;
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase.from(TABLE).update({ is_active: isActive }).eq('id', id);
    if (error) throw toError(error);
  },
};
