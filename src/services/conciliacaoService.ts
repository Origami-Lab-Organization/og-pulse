import { supabase } from '@/integrations/supabase/client';
import type { ReceivableReconciliationRow } from '@/types/conciliacao';

/**
 * Conciliação de contas a receber (ADR-0044, parte 3). Leitura por RPC invoker — a RLS de
 * cada tabela vale; as três ações são RPCs definer com guarda de tenant (ADR-0021).
 */
export const conciliacaoService = {
  async getReceivables(tenantId: string, from: string, to: string): Promise<ReceivableReconciliationRow[]> {
    const { data, error } = await supabase.rpc('conta_azul_receivables_reconciliation', {
      p_tenant_id: tenantId,
      p_from: from,
      p_to: to,
    });
    if (error) throw error;
    return (data ?? []) as unknown as ReceivableReconciliationRow[];
  },

  async confirm(matchId: string): Promise<void> {
    const { error } = await supabase.rpc('conta_azul_confirm_match', { p_match_id: matchId });
    if (error) throw error;
  },

  /** Desfaz o casamento; se ele deu baixa, a parcela volta ao que era antes. */
  async undo(matchId: string): Promise<void> {
    const { error } = await supabase.rpc('conta_azul_undo_match', { p_match_id: matchId });
    if (error) throw error;
  },

  async applyPayment(matchId: string): Promise<void> {
    const { error } = await supabase.rpc('conta_azul_apply_payment', { p_match_id: matchId });
    if (error) throw error;
  },
};
