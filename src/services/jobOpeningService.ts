import { supabase } from '@/integrations/supabase/client';
import {
  JobOpeningDB,
  CreateJobOpeningInput,
  UpdateJobOpeningInput,
} from '@/types/jobOpening';

export const jobOpeningService = {
  async getAll(tenantId: string): Promise<JobOpeningDB[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('job_openings')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as JobOpeningDB[];
  },

  /** Fetch a single open job publicly via SECURITY DEFINER RPC that masks confidential salary. */
  async getPublic(vagaId: string): Promise<JobOpeningDB | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .rpc('get_public_job_opening', { p_vaga_id: vagaId });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return (row ?? null) as JobOpeningDB | null;
  },

  async create(
    input: CreateJobOpeningInput,
    tenantId: string
  ): Promise<JobOpeningDB> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('job_openings')
      .insert({ ...input, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;

    // If published, set the public URL using the generated id
    if (data.status === 'aberta' && !data.public_url) {
      const public_url = `/trabalhe-conosco/${tenantId}/${data.id}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('job_openings')
        .update({ public_url })
        .eq('id', data.id);
      return { ...data, public_url } as JobOpeningDB;
    }

    return data as JobOpeningDB;
  },

  async update(
    id: string,
    updates: UpdateJobOpeningInput,
    tenantId?: string
  ): Promise<JobOpeningDB> {
    const finalUpdates: UpdateJobOpeningInput & { updated_at: string; public_url?: string } = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Generate public URL when publishing for the first time
    if (updates.status === 'aberta' && tenantId && !updates.public_url) {
      finalUpdates.public_url = `/trabalhe-conosco/${tenantId}/${id}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('job_openings')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as JobOpeningDB;
  },

  async delete(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('job_openings')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
