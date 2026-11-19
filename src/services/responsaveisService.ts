import { supabase } from '@/integrations/supabase/client';
import type { ResponsavelDaProspeccao } from '@/types/employeeDirectory';

// A RPC é de 18/11/2026 e ainda não está nos tipos gerados do Supabase.
type RpcSemTipo = (fn: string) => Promise<{ data: unknown; error: unknown }>;

/**
 * Funcionários ativos com `prospeccao:editar` (hoje Admin e Gerente), para escolher o
 * responsável de uma oportunidade. Desligados e cadastros por confirmar ficam de fora.
 */
export async function fetchResponsaveisDaProspeccao(): Promise<ResponsavelDaProspeccao[]> {
  const { data, error } = await (supabase.rpc as unknown as RpcSemTipo)('get_prospeccao_responsaveis');
  if (error) throw error;
  return (data ?? []) as ResponsavelDaProspeccao[];
}
