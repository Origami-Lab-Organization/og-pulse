import { supabase } from '@/integrations/supabase/client';
import {
  StrategyCycleDB,
  StrategyObjectiveDB,
  StrategyKeyResultDB,
  StrategyCheckinDB,
  StrategyInitiativeDB,
  GuardrailDB,
  CreateStrategyCycleInput,
  UpdateStrategyCycleInput,
  CreateStrategyObjectiveInput,
  UpdateStrategyObjectiveInput,
  CreateStrategyKeyResultInput,
  UpdateStrategyKeyResultInput,
  CreateStrategyCheckinInput,
  CreateStrategyInitiativeInput,
  UpdateStrategyInitiativeInput,
  CreateGuardrailInput,
  UpdateGuardrailInput,
} from '@/types/strategy';

// ─── Cycle ────────────────────────────────────────────────────────────────────

export const strategyCycleService = {
  async getAll(tenantId: string): Promise<StrategyCycleDB[]> {
    const { data, error } = await supabase
      .from('strategy_cycles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string, tenantId: string): Promise<StrategyCycleDB> {
    const { data, error } = await supabase
      .from('strategy_cycles')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) throw error;
    return data;
  },

  async create(input: CreateStrategyCycleInput, tenantId: string): Promise<StrategyCycleDB> {
    const { data, error } = await supabase
      .from('strategy_cycles')
      .insert({ ...input, tenant_id: tenantId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: UpdateStrategyCycleInput, tenantId: string): Promise<StrategyCycleDB> {
    const { data, error } = await supabase
      .from('strategy_cycles')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('strategy_cycles')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },
};

// ─── Objective ────────────────────────────────────────────────────────────────

const OBJECTIVE_SELECT = `
  *,
  owner:employees!owner_id(nome),
  key_results:strategy_key_results(
    *,
    checkins:strategy_checkins(*)
  )
`.trim();

export const strategyObjectiveService = {
  async getAll(cycleId: string, tenantId: string): Promise<StrategyObjectiveDB[]> {
    const { data, error } = await supabase
      .from('strategy_objectives')
      .select(OBJECTIVE_SELECT)
      .eq('cycle_id', cycleId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as StrategyObjectiveDB[];
  },

  async create(input: CreateStrategyObjectiveInput, tenantId: string): Promise<StrategyObjectiveDB> {
    const { data, error } = await supabase
      .from('strategy_objectives')
      .insert({ ...input, tenant_id: tenantId })
      .select(OBJECTIVE_SELECT)
      .single();

    if (error) throw error;
    return data as unknown as StrategyObjectiveDB;
  },

  async update(id: string, updates: UpdateStrategyObjectiveInput, tenantId: string): Promise<StrategyObjectiveDB> {
    const { data, error } = await supabase
      .from('strategy_objectives')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(OBJECTIVE_SELECT)
      .single();

    if (error) throw error;
    return data as unknown as StrategyObjectiveDB;
  },

  async delete(id: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('strategy_objectives')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },
};

// ─── Key Result ───────────────────────────────────────────────────────────────

const KEY_RESULT_SELECT = `
  *,
  owner:employees!owner_id(nome),
  checkins:strategy_checkins(*)
`.trim();

export const strategyKeyResultService = {
  async create(input: CreateStrategyKeyResultInput, tenantId: string): Promise<StrategyKeyResultDB> {
    const { data, error } = await supabase
      .from('strategy_key_results')
      .insert({
        ...input,
        tenant_id: tenantId,
        current_value: input.current_value ?? input.initial_value,
        confidence: input.confidence ?? 5,
      })
      .select(KEY_RESULT_SELECT)
      .single();

    if (error) throw error;
    return data as unknown as StrategyKeyResultDB;
  },

  async update(
    id: string,
    updates: UpdateStrategyKeyResultInput,
    tenantId: string,
    createdBy?: string,
  ): Promise<StrategyKeyResultDB> {
    const valueChanged =
      updates.current_value !== undefined || updates.confidence !== undefined;

    if (valueChanged) {
      // Fetch current state to detect actual change
      const { data: current, error: fetchError } = await supabase
        .from('strategy_key_results')
        .select('current_value, confidence')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;

      const newValue = updates.current_value ?? current.current_value;
      const newConfidence = updates.confidence ?? current.confidence;
      const hasChange =
        newValue !== current.current_value || newConfidence !== current.confidence;

      if (hasChange) {
        const { error: checkinError } = await supabase
          .from('strategy_checkins')
          .insert({
            key_result_id: id,
            tenant_id: tenantId,
            current_value: newValue,
            confidence: newConfidence,
            notes: null,
            created_by: createdBy ?? null,
          });

        if (checkinError) throw checkinError;
      }
    }

    const { data, error } = await supabase
      .from('strategy_key_results')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(KEY_RESULT_SELECT)
      .single();

    if (error) throw error;
    return data as unknown as StrategyKeyResultDB;
  },

  async delete(id: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('strategy_key_results')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },
};

// ─── Checkin ──────────────────────────────────────────────────────────────────

export const strategyCheckinService = {
  async create(input: CreateStrategyCheckinInput, tenantId: string, createdBy?: string): Promise<StrategyCheckinDB> {
    // Insert the check-in record
    const { data, error } = await supabase
      .from('strategy_checkins')
      .insert({
        ...input,
        tenant_id: tenantId,
        created_by: createdBy ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    // Update current_value and confidence on the parent KR
    const { error: updateError } = await supabase
      .from('strategy_key_results')
      .update({
        current_value: input.current_value,
        confidence: input.confidence,
      })
      .eq('id', input.key_result_id)
      .eq('tenant_id', tenantId);

    if (updateError) throw updateError;

    return data as StrategyCheckinDB;
  },
};

// ─── Initiative ───────────────────────────────────────────────────────────────

const INITIATIVE_SELECT = `
  *,
  owner:employees!owner_id(nome),
  objective:strategy_objectives!objective_id(title)
`.trim();

export const strategyInitiativeService = {
  async getAll(cycleId: string, tenantId: string): Promise<StrategyInitiativeDB[]> {
    const { data: objIds } = await supabase
      .from('strategy_objectives')
      .select('id')
      .eq('cycle_id', cycleId)
      .eq('tenant_id', tenantId);

    const ids = (objIds || []).map((o: any) => o.id);
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from('strategy_initiatives')
      .select(INITIATIVE_SELECT)
      .eq('tenant_id', tenantId)
      .in('objective_id', ids)
      .order('position', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as StrategyInitiativeDB[];
  },

  async getByObjective(objectiveId: string, tenantId: string): Promise<StrategyInitiativeDB[]> {
    const { data, error } = await supabase
      .from('strategy_initiatives')
      .select(INITIATIVE_SELECT)
      .eq('objective_id', objectiveId)
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as StrategyInitiativeDB[];
  },

  async create(input: CreateStrategyInitiativeInput, tenantId: string): Promise<StrategyInitiativeDB> {
    const { data, error } = await supabase
      .from('strategy_initiatives')
      .insert({
        ...input,
        tenant_id: tenantId,
        status: input.status ?? 'backlog',
      })
      .select(INITIATIVE_SELECT)
      .single();

    if (error) throw error;
    return data as unknown as StrategyInitiativeDB;
  },

  async update(id: string, updates: UpdateStrategyInitiativeInput, tenantId: string): Promise<StrategyInitiativeDB> {
    const { data, error } = await supabase
      .from('strategy_initiatives')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(INITIATIVE_SELECT)
      .single();

    if (error) throw error;
    return data as unknown as StrategyInitiativeDB;
  },

  async updateStatus(
    id: string,
    status: StrategyInitiativeDB['status'],
    position: number,
    tenantId: string,
  ): Promise<StrategyInitiativeDB> {
    const { data, error } = await supabase
      .from('strategy_initiatives')
      .update({ status, position })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(INITIATIVE_SELECT)
      .single();

    if (error) throw error;
    return data as unknown as StrategyInitiativeDB;
  },

  async delete(id: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('strategy_initiatives')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },

  async reorder(updates: { id: string; position: number }[], tenantId: string): Promise<void> {
    const promises = updates.map(({ id, position }) =>
      supabase
        .from('strategy_initiatives')
        .update({ position })
        .eq('id', id)
        .eq('tenant_id', tenantId),
    );

    const results = await Promise.all(promises);
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  },
};

// ─── Guardrail ────────────────────────────────────────────────────────────────

export const guardrailService = {
  async getAll(cycleId: string, tenantId: string): Promise<GuardrailDB[]> {
    const { data, error } = await supabase
      .from('strategy_guardrails')
      .select('*')
      .eq('cycle_id', cycleId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as GuardrailDB[];
  },

  async create(input: CreateGuardrailInput, tenantId: string): Promise<GuardrailDB> {
    const { data, error } = await supabase
      .from('strategy_guardrails')
      .insert({ ...input, tenant_id: tenantId })
      .select('*')
      .single();

    if (error) throw error;
    return data as GuardrailDB;
  },

  async update(id: string, updates: UpdateGuardrailInput, tenantId: string): Promise<GuardrailDB> {
    const { data, error } = await supabase
      .from('strategy_guardrails')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (error) throw error;
    return data as GuardrailDB;
  },

  async delete(id: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('strategy_guardrails')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  },
};
