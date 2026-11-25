import { supabase } from '@/integrations/supabase/client';
import {
  ServiceRevenueModelDB,
  CreateServiceRevenueModelInput,
} from '@/types/serviceRevenueModel';
import { modelTypeDoModelo } from '@/lib/formasDeReceita';

/** Violação do índice `service_revenue_models_composicao_unica`. */
const CODIGO_DE_REPETICAO = '23505';

/** Traduz a recusa do banco; as mensagens do gatilho do modelo de receita já vêm em português. */
function erroDoModelo(error: { code?: string; message?: string }): Error {
  if (error.code === CODIGO_DE_REPETICAO) return new Error('Esse modelo de receita já existe neste serviço.');
  return new Error(error.message || 'Não foi possível salvar o modelo de receita.');
}

/** Colunas de forma: com `formas`, o `model_type` sai delas (US-0046). */
function colunasDaForma(input: Partial<CreateServiceRevenueModelInput>): Record<string, unknown> {
  if (input.formas) return { formas: input.formas, model_type: modelTypeDoModelo(input.formas) };
  if (input.modelType !== undefined) return { model_type: input.modelType, formas: [input.modelType] };
  return {};
}

export const serviceRevenueModelService = {
  async getAll(tenantId: string): Promise<ServiceRevenueModelDB[]> {
    const { data, error } = await supabase
      .from('service_revenue_models')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order')
      .order('name');

    if (error) {
      console.error('Error fetching service revenue models:', error);
      throw error;
    }

    return (data || []) as unknown as ServiceRevenueModelDB[];
  },

  async create(
    input: CreateServiceRevenueModelInput,
    tenantId: string
  ): Promise<ServiceRevenueModelDB> {
    const { data, error } = await supabase
      .from('service_revenue_models')
      .insert({
        tenant_id: tenantId,
        service_id: input.serviceId,
        name: input.name,
        model_type: input.modelType,
        ...colunasDaForma(input),
        base_value: input.baseValue ?? null,
        billing_unit: input.billingUnit ?? null,
      } as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating service revenue model:', error);
      throw erroDoModelo(error);
    }

    return data as unknown as ServiceRevenueModelDB;
  },

  async update(
    id: string,
    input: Partial<CreateServiceRevenueModelInput>
  ): Promise<ServiceRevenueModelDB> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    Object.assign(updates, colunasDaForma(input));
    if (input.baseValue !== undefined) updates.base_value = input.baseValue ?? null;
    if (input.billingUnit !== undefined) updates.billing_unit = input.billingUnit ?? null;

    const { data, error } = await supabase
      .from('service_revenue_models')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service revenue model:', error);
      throw erroDoModelo(error);
    }

    return data as unknown as ServiceRevenueModelDB;
  },

  async toggleActive(id: string, isActive: boolean): Promise<ServiceRevenueModelDB> {
    const { data, error } = await supabase
      .from('service_revenue_models')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ServiceRevenueModelDB;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('service_revenue_models').delete().eq('id', id);

    if (error) {
      console.error('Error deleting service revenue model:', error);
      throw error;
    }
  },
};
