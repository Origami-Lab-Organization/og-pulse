// A chamada traz uma chave de serviço deste projeto? É assim que as funções do cron reconhecem
// o cron. Comparar o texto com SUPABASE_SERVICE_ROLE_KEY não serve: o Vault guarda a chave em
// outro formato (ver 20261001160000) e o cron recebia 401 sempre. Aqui quem responde é o banco.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function ehChamadaDeServico(req: Request): Promise<boolean> {
  const chave = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!chave) return false;
  if (chave === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return true;
  const cliente = createClient(Deno.env.get("SUPABASE_URL")!, chave, { auth: { persistSession: false } });
  const { data, error } = await cliente.rpc("caller_is_service_role");
  return !error && data === true;
}
