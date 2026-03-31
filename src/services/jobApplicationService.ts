import { supabase } from '@/integrations/supabase/client';
import { CreateJobApplicationInput, JobApplicationDB, JobApplicationStatus } from '@/types/jobApplication';

export const jobApplicationService = {
  async uploadCurriculo(
    file: File,
    tenantId: string
  ): Promise<{ url: string; nome: string }> {
    const sanitizedName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${tenantId}/${Date.now()}-${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('curriculos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    return { url: filePath, nome: file.name };
  },

  async create(
    input: CreateJobApplicationInput,
    tenantId: string
  ): Promise<void> {
    let curriculo_url: string | null = null;
    let curriculo_nome: string | null = null;

    if (input.curriculo) {
      const uploaded = await jobApplicationService.uploadCurriculo(
        input.curriculo,
        tenantId
      );
      curriculo_url = uploaded.url;
      curriculo_nome = uploaded.nome;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('job_applications')
      .insert({
        tenant_id: tenantId,
        nome: input.nome,
        email: input.email,
        telefone: input.telefone,
        linkedin: input.linkedin || null,
        motivacao: input.motivacao,
        curriculo_url,
        curriculo_nome,
        vaga_id: input.vaga_id || null,
        vaga_titulo: input.vaga_titulo || null,
        vaga_pretendida: input.vaga_pretendida || null,
        responsavel_id: input.responsavel_id || null,
      });

    if (error) throw error;
  },

  async getAll(tenantId: string): Promise<JobApplicationDB[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('job_applications')
      .select('*, responsavel:employees!responsavel_id(nome)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
      ...row,
      responsavel_nome: row.responsavel?.nome ?? null,
      responsavel: undefined,
    })) as JobApplicationDB[];
  },

  async updateStatus(id: string, status: JobApplicationStatus): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('job_applications')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  },

  async updateResponsavel(id: string, responsavelId: string | null): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('job_applications')
      .update({ responsavel_id: responsavelId })
      .eq('id', id);

    if (error) throw error;
  },

  async archive(
    id: string,
    status: 'descartado' | 'banco_de_talentos',
    justificativa: string
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('job_applications')
      .update({ status, justificativa_movimentacao: justificativa })
      .eq('id', id);

    if (error) throw error;
  },
};
