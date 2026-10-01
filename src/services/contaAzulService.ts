import { supabase } from '@/integrations/supabase/client';
import type { ContaAzulConnection, ContaAzulCostCenter } from '@/types/contaAzul';

const COLUMNS =
  'id, ca_document, ca_legal_name, ca_trade_name, status, connected_at, last_sync_at, last_error, backfill_cursor, backfill_done_at, syncing_until, receivable_count, payable_count';
const COST_CENTER_COLUMNS = 'id, ca_cost_center_id, code, name, is_active, cost_center_id';

/** Erro das funções do Conta Azul, com a mensagem que a função já escreveu para a pessoa. */
export class ContaAzulError extends Error {}

async function invoke<T>(fn: string, body: Record<string, unknown>, fallback: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new ContaAzulError(corpo?.error ?? fallback);
  }
  return data as T;
}

/**
 * Conexão da empresa com o Conta Azul (ADR-0044). A linha se lê sob a RLS — quem não gere a
 * integração nem concilia não a enxerga. Conectar e desconectar passam pelas Edge Functions,
 * porque o token não pode chegar ao navegador.
 */
export const contaAzulService = {
  async getConnection(tenantId: string): Promise<ContaAzulConnection | null> {
    const { data, error } = await supabase
      .from('conta_azul_connections')
      .select(COLUMNS)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) throw error;
    return data as ContaAzulConnection | null;
  },

  /** Devolve a URL de autorização do Conta Azul, para onde a pessoa é levada. */
  async startConnection(tenantId: string): Promise<string> {
    const { url } = await invoke<{ url: string }>(
      'conta-azul-connect',
      { tenant_id: tenantId },
      'Não foi possível começar a conexão com o Conta Azul.',
    );
    return url;
  },

  async finishConnection(code: string, state: string): Promise<ContaAzulConnection> {
    const { conexao } = await invoke<{ conexao: ContaAzulConnection }>(
      'conta-azul-callback',
      { code, state },
      'Não foi possível concluir a conexão com o Conta Azul.',
    );
    return conexao;
  },

  async disconnect(tenantId: string): Promise<void> {
    await invoke('conta-azul-disconnect', { tenant_id: tenantId }, 'Não foi possível desconectar o Conta Azul.');
  },

  /** Pede uma sincronização. A função responde na hora e o trabalho segue em segundo plano. */
  async syncNow(tenantId: string): Promise<void> {
    await invoke('conta-azul-sync', { tenant_id: tenantId }, 'Não foi possível pedir a sincronização.');
  },

  async listCostCenters(tenantId: string): Promise<ContaAzulCostCenter[]> {
    const { data, error } = await supabase
      .from('conta_azul_cost_centers')
      .select(COST_CENTER_COLUMNS)
      .eq('tenant_id', tenantId)
      .order('is_active', { ascending: false })
      .order('name');
    if (error) throw error;
    return (data ?? []) as ContaAzulCostCenter[];
  },

  /** Só a ligação muda pela tela (GRANT por coluna); o resto é do Conta Azul. */
  async linkCostCenter(id: string, costCenterId: string | null): Promise<void> {
    const { error } = await supabase.from('conta_azul_cost_centers').update({ cost_center_id: costCenterId }).eq('id', id);
    if (error) throw error;
  },
};
