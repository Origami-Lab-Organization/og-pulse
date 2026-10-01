// Começa a ligação da empresa ao Conta Azul (ADR-0044): grava um `state` de uso único e
// devolve a URL de autorização. O retorno chega em `conta-azul-callback`.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { urlDeAutorizacao } from "../_shared/contaAzul.ts";
import {
  clienteAdmin,
  corpoDe,
  corsHeaders,
  exigirCapacidade,
  json,
  Recusa,
  respostaDeErro,
  tenantDe,
  usuarioDaSessao,
} from "../_shared/contaAzulHttp.ts";

const VALIDADE_DO_STATE_MS = 10 * 60_000;

function novoState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function gravarState(admin: SupabaseClient, state: string, tenantId: string, userId: string): Promise<void> {
  await admin.from("conta_azul_oauth_states").delete().lt("expires_at", new Date().toISOString());
  const { error } = await admin.from("conta_azul_oauth_states").insert({
    state,
    tenant_id: tenantId,
    user_id: userId,
    expires_at: new Date(Date.now() + VALIDADE_DO_STATE_MS).toISOString(),
  });
  if (error) throw new Recusa("Não foi possível começar a conexão com o Conta Azul.", 500);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const userId = await usuarioDaSessao(req);
    const tenantId = tenantDe(await corpoDe(req));
    const admin = clienteAdmin();
    await exigirCapacidade(admin, userId, tenantId);
    const state = novoState();
    const url = urlDeAutorizacao(state);
    await gravarState(admin, state, tenantId, userId);
    return json({ url }, 200);
  } catch (erro) {
    return respostaDeErro("conta-azul-connect", erro);
  }
});
