import { supabase } from '@/integrations/supabase/client';

/**
 * `my_capabilities` ainda não está nos tipos gerados do Supabase (mesma situação de
 * `accessProfileService`), então o cliente é estreitado à mão para o que se usa aqui.
 */
type RpcClient = {
  rpc: (
    fn: 'my_capabilities',
    args: { _tenant_id: string },
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/**
 * Capacidades efetivas do usuário autenticado no tenant, resolvidas no banco
 * (override > papel > nada) pela mesma função que as policies usam.
 *
 * Falha devolve lista vazia, não lança: a tela fica conservadora (esconde o que não
 * consegue confirmar) e a barreira real segue sendo a RLS.
 */
export async function fetchMyCapabilities(tenantId: string): Promise<string[]> {
  const { data, error } = await (supabase as unknown as RpcClient).rpc('my_capabilities', {
    _tenant_id: tenantId,
  });
  if (error) {
    console.error('Erro ao carregar capacidades do usuário:', error.message);
    return [];
  }
  return Array.isArray(data) ? data.filter((key): key is string => typeof key === 'string') : [];
}
