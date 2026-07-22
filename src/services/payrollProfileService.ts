import { supabase } from '@/integrations/supabase/client';
import { PayrollProfile, PayrollProfileDB, CreatePayrollProfileInput } from '@/types/payrollProfile';

const dbToPayrollProfile = (db: PayrollProfileDB): PayrollProfile => ({
  id: db.id,
  tenantId: db.tenant_id,
  fgtsRateClt: Number(db.fgts_rate_clt),
  fgtsRateApprentice: Number(db.fgts_rate_apprentice),
  inssPatronalRate: Number(db.inss_patronal_rate),
  ratRate: Number(db.rat_rate),
  terceirosRate: Number(db.terceiros_rate),
  outrosRate: Number(db.outros_rate),
  inssPatronalProlaboreRate: Number(db.inss_patronal_prolabore_rate),
  fgtsProlaboreRate: Number(db.fgts_prolabore_rate),
  applyFgtsOn13th: db.apply_fgts_on_13th,
  applyInssOn13th: db.apply_inss_on_13th,
  applyRatOn13th: db.apply_rat_on_13th,
  applyTerceirosOn13th: db.apply_terceiros_on_13th,
  applyOutrosOn13th: db.apply_outros_on_13th,
  applyFgtsOnVacation: db.apply_fgts_on_vacation,
  applyInssOnVacation: db.apply_inss_on_vacation,
  applyRatOnVacation: db.apply_rat_on_vacation,
  applyTerceirosOnVacation: db.apply_terceiros_on_vacation,
  applyOutrosOnVacation: db.apply_outros_on_vacation,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export const payrollProfileService = {
  async getByTenantId(tenantId: string): Promise<PayrollProfile | null> {
    const { data, error } = await supabase
      .from('payroll_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching payroll profile:', error);
      throw error;
    }

    return data ? dbToPayrollProfile(data as unknown as PayrollProfileDB) : null;
  },

  async create(input: CreatePayrollProfileInput): Promise<PayrollProfile> {
    const { data, error } = await supabase
      .from('payroll_profiles')
      .insert({
        tenant_id: input.tenantId,
        fgts_rate_clt: input.fgtsRateClt ?? 0.08,
        fgts_rate_apprentice: input.fgtsRateApprentice ?? 0.02,
        // Defaults do Simples Nacional (LC 123/2006) — mesmo default de DEFAULT_PAYROLL_PROFILE
        // (employeeCostCalculator.ts): sem INSS Patronal, substituído pelo DAS unificado.
        inss_patronal_rate: input.inssPatronalRate ?? 0,
        rat_rate: input.ratRate ?? 0.03,
        terceiros_rate: input.terceirosRate ?? 0.058,
        outros_rate: input.outrosRate ?? 0,
        inss_patronal_prolabore_rate: input.inssPatronalProlaboreRate ?? 0,
        fgts_prolabore_rate: input.fgtsProlaboreRate ?? 0,
        apply_fgts_on_13th: input.applyFgtsOn13th ?? true,
        apply_inss_on_13th: input.applyInssOn13th ?? false,
        apply_rat_on_13th: input.applyRatOn13th ?? true,
        apply_terceiros_on_13th: input.applyTerceirosOn13th ?? true,
        apply_outros_on_13th: input.applyOutrosOn13th ?? false,
        apply_fgts_on_vacation: input.applyFgtsOnVacation ?? true,
        apply_inss_on_vacation: input.applyInssOnVacation ?? false,
        apply_rat_on_vacation: input.applyRatOnVacation ?? true,
        apply_terceiros_on_vacation: input.applyTerceirosOnVacation ?? true,
        apply_outros_on_vacation: input.applyOutrosOnVacation ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payroll profile:', error);
      throw error;
    }

    return dbToPayrollProfile(data as unknown as PayrollProfileDB);
  },

  async update(id: string, updates: Partial<Omit<CreatePayrollProfileInput, 'tenantId'>>): Promise<PayrollProfile> {
    const dbUpdates: Record<string, unknown> = {};

    if (updates.fgtsRateClt !== undefined) dbUpdates.fgts_rate_clt = updates.fgtsRateClt;
    if (updates.fgtsRateApprentice !== undefined) dbUpdates.fgts_rate_apprentice = updates.fgtsRateApprentice;
    if (updates.inssPatronalRate !== undefined) dbUpdates.inss_patronal_rate = updates.inssPatronalRate;
    if (updates.ratRate !== undefined) dbUpdates.rat_rate = updates.ratRate;
    if (updates.terceirosRate !== undefined) dbUpdates.terceiros_rate = updates.terceirosRate;
    if (updates.outrosRate !== undefined) dbUpdates.outros_rate = updates.outrosRate;
    if (updates.inssPatronalProlaboreRate !== undefined) dbUpdates.inss_patronal_prolabore_rate = updates.inssPatronalProlaboreRate;
    if (updates.fgtsProlaboreRate !== undefined) dbUpdates.fgts_prolabore_rate = updates.fgtsProlaboreRate;
    if (updates.applyFgtsOn13th !== undefined) dbUpdates.apply_fgts_on_13th = updates.applyFgtsOn13th;
    if (updates.applyInssOn13th !== undefined) dbUpdates.apply_inss_on_13th = updates.applyInssOn13th;
    if (updates.applyRatOn13th !== undefined) dbUpdates.apply_rat_on_13th = updates.applyRatOn13th;
    if (updates.applyTerceirosOn13th !== undefined) dbUpdates.apply_terceiros_on_13th = updates.applyTerceirosOn13th;
    if (updates.applyOutrosOn13th !== undefined) dbUpdates.apply_outros_on_13th = updates.applyOutrosOn13th;
    if (updates.applyFgtsOnVacation !== undefined) dbUpdates.apply_fgts_on_vacation = updates.applyFgtsOnVacation;
    if (updates.applyInssOnVacation !== undefined) dbUpdates.apply_inss_on_vacation = updates.applyInssOnVacation;
    if (updates.applyRatOnVacation !== undefined) dbUpdates.apply_rat_on_vacation = updates.applyRatOnVacation;
    if (updates.applyTerceirosOnVacation !== undefined) dbUpdates.apply_terceiros_on_vacation = updates.applyTerceirosOnVacation;
    if (updates.applyOutrosOnVacation !== undefined) dbUpdates.apply_outros_on_vacation = updates.applyOutrosOnVacation;

    const { data, error } = await supabase
      .from('payroll_profiles')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payroll profile:', error);
      throw error;
    }

    return dbToPayrollProfile(data as unknown as PayrollProfileDB);
  },

  async upsert(input: CreatePayrollProfileInput): Promise<PayrollProfile> {
    // Try to get existing profile
    const existing = await this.getByTenantId(input.tenantId);
    
    if (existing) {
      return this.update(existing.id, input);
    } else {
      return this.create(input);
    }
  },
};
