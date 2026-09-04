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
 * `null` é diferente de `[]`: `[]` é "confirmei e não tem nenhuma", `null` é
 * "não consegui confirmar". A distinção existe porque tratar as duas como iguais
 * transforma uma falha de rede num rebaixamento silencioso de acesso — foi o que
 * aconteceu no deploy de PUL-206, quando o front antigo perdeu a fonte de papel e
 * a interface simplesmente escondeu as abas de quem era admin.
 */
export type CapabilityFetchResult = string[] | null;

function parse(data: unknown): string[] {
  return Array.isArray(data) ? data.filter((key): key is string => typeof key === 'string') : [];
}

/**
 * Capacidades efetivas do usuário autenticado no tenant, resolvidas no banco
 * (override > papel > nada) pela mesma função que as policies usam.
 *
 * Uma segunda tentativa cobre o caso comum de falha transitória (rede oscilando,
 * schema cache do PostgREST recarregando durante um deploy). Falha nas duas
 * devolve `null`, e quem chama decide o que fazer — a barreira real segue sendo a RLS.
 */
export async function fetchMyCapabilities(tenantId: string): Promise<CapabilityFetchResult> {
  for (let tentativa = 1; tentativa <= 2; tentativa += 1) {
    const { data, error } = await (supabase as unknown as RpcClient).rpc('my_capabilities', {
      _tenant_id: tenantId,
    });
    if (!error) return parse(data);
    console.error(
      `Erro ao carregar capacidades do usuário (tentativa ${tentativa}/2):`,
      error.message,
    );
  }
  return null;
}
