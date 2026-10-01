// Desliga a empresa do Conta Azul (ADR-0044): revoga a autorização lá e apaga a conexão aqui
// (o token sai junto, por cascade). Sem revogar, a autorização ficaria viva no Conta Azul até
// o refresh token vencer — até dois anos.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { FalhaContaAzul, revogar } from "../_shared/contaAzul.ts";
import { tokenDeAcesso } from "../_shared/contaAzulConexao.ts";
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
import { MotivoFalha } from "../_shared/contaAzulTipos.ts";

interface ConexaoParaRevogar {
  id: string;
  ca_company_id: string;
}

async function lerConexao(admin: SupabaseClient, tenantId: string): Promise<ConexaoParaRevogar | null> {
  const { data, error } = await admin
    .from("conta_azul_connections")
    .select("id, ca_company_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw new Recusa("Não foi possível ler a conexão.", 500);
  return data as ConexaoParaRevogar | null;
}

async function revogarNoContaAzul(admin: SupabaseClient, conexao: ConexaoParaRevogar): Promise<void> {
  try {
    await revogar(await tokenDeAcesso(admin, conexao.id), conexao.ca_company_id);
  } catch (erro) {
    // Autorização já morta do lado do Conta Azul: não sobrou o que revogar.
    if (erro instanceof FalhaContaAzul && erro.motivo === MotivoFalha.Reconectar) return;
    throw erro;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const userId = await usuarioDaSessao(req);
    const tenantId = tenantDe(await corpoDe(req));
    const admin = clienteAdmin();
    await exigirCapacidade(admin, userId, tenantId);
    const conexao = await lerConexao(admin, tenantId);
    if (conexao) {
      await revogarNoContaAzul(admin, conexao);
      const { error } = await admin.from("conta_azul_connections").delete().eq("id", conexao.id);
      if (error) throw new Recusa("A autorização foi revogada, mas não foi possível apagar a conexão. Tente de novo.", 500);
    }
    return json({ ok: true }, 200);
  } catch (erro) {
    return respostaDeErro("conta-azul-disconnect", erro);
  }
});
