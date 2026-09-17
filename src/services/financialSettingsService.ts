import { supabase } from '@/integrations/supabase/client';
import {
  FinancialSettings,
  FinancialSettingsFormData,
  FinancialSettingsVersion,
} from '@/types/financialSettings';

const CAMPOS = `
  id, tenant_id, admin_expenses_percent, taxes_percent, commission_percent,
  net_margin_percent, gross_margin_target_percent, effective_from, created_by,
  created_at, updated_at
`;

export const financialSettingsService = {
  /**
   * Todas as versões do tenant, da mais nova para a mais antiga.
   *
   * A tabela é pequena por natureza — uma linha por mudança de política financeira, não por
   * transação —, então vale trazer tudo e resolver as datas em memória. É o que permite a
   * evolução mensal responder doze meses com uma consulta só.
   */
  async listVersions(tenantId: string): Promise<FinancialSettings[]> {
    const { data, error } = await supabase
      .from('financial_settings')
      .select(CAMPOS)
      .eq('tenant_id', tenantId)
      .order('effective_from', { ascending: false });

    if (error) {
      console.error('Error fetching financial settings versions:', error);
      throw error;
    }

    return (data ?? []) as FinancialSettings[];
  },

  /** O mesmo histórico, com o nome de quem gravou cada versão. */
  async listVersionsWithAuthor(tenantId: string): Promise<FinancialSettingsVersion[]> {
    const versoes = await this.listVersions(tenantId);
    const autorIds = [...new Set(versoes.map((v) => v.created_by).filter(Boolean))] as string[];
    if (autorIds.length === 0) return versoes.map((v) => ({ ...v, autorNome: null }));

    // Nome fora do select aninhado de propósito: `employees` tem policy própria, e uma pessoa
    // que pode ler a configuração pode não poder ler a ficha de quem a alterou. Falhar a
    // busca do nome não pode derrubar o histórico.
    const { data } = await supabase.from('employees').select('id, nome').in('id', autorIds);
    const nomePorId = new Map((data ?? []).map((e) => [e.id, e.nome]));
    return versoes.map((v) => ({
      ...v,
      autorNome: v.created_by ? (nomePorId.get(v.created_by) ?? null) : null,
    }));
  },

  /** A versão que valia na data informada, ou `null` se a empresa ainda não tinha nenhuma. */
  async getSettingsAt(tenantId: string, data: string): Promise<FinancialSettings | null> {
    const { data: linhas, error } = await supabase
      .from('financial_settings')
      .select(CAMPOS)
      .eq('tenant_id', tenantId)
      .lte('effective_from', data)
      .order('effective_from', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching financial settings:', error);
      throw error;
    }

    return ((linhas ?? [])[0] as FinancialSettings | undefined) ?? null;
  },

  /**
   * Grava uma versão. Salvar duas vezes com a mesma vigência CORRIGE a versão daquele dia em
   * vez de criar duas concorrentes — quem errou o número às 9h e arrumou às 10h queria uma
   * política só, não duas.
   */
  async saveVersion(
    tenantId: string,
    formData: FinancialSettingsFormData,
    autorId: string | null,
  ): Promise<FinancialSettings> {
    const { data, error } = await supabase
      .from('financial_settings')
      .upsert(
        {
          tenant_id: tenantId,
          admin_expenses_percent: formData.admin_expenses_percent,
          taxes_percent: formData.taxes_percent,
          commission_percent: formData.commission_percent,
          net_margin_percent: formData.net_margin_percent,
          gross_margin_target_percent: formData.gross_margin_target_percent,
          effective_from: formData.effective_from,
          created_by: autorId,
        },
        { onConflict: 'tenant_id,effective_from' },
      )
      .select(CAMPOS)
      .single();

    if (error) {
      console.error('Error saving financial settings:', error);
      throw error;
    }

    return data as FinancialSettings;
  },
};
