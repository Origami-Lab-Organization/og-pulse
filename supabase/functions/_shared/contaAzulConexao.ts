// Token de uma conexão Conta Azul: guardar cifrado, entregar válido, renovar sem corrida.
// Só o cliente service role enxerga `conta_azul_tokens`.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cifrar, decifrar } from "./cifra.ts";
import { FalhaContaAzul, renovar } from "./contaAzul.ts";
import { MotivoFalha, StatusConexao } from "./contaAzulTipos.ts";
import type { Tokens } from "./contaAzulTipos.ts";

/** Renova antes de vencer, para a chamada seguinte não pegar o token no último segundo. */
const MARGEM_MS = 120_000;
const ESPERA_DA_TRAVA_MS = 1_500;
const TENTATIVAS = 5;

interface LinhaDeToken {
  access_token_cipher: string;
  refresh_token_cipher: string;
  access_expires_at: string;
}

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function guardarTokens(admin: SupabaseClient, connectionId: string, tokens: Tokens): Promise<void> {
  const linha = {
    connection_id: connectionId,
    access_token_cipher: await cifrar(tokens.accessToken),
    refresh_token_cipher: await cifrar(tokens.refreshToken),
    access_expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
    refreshing_until: null,
  };
  // Depois de uma renovação o refresh token antigo já morreu: perder a gravação derruba a
  // conexão. Uma segunda tentativa cobre a falha passageira do banco.
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const { error } = await admin.from("conta_azul_tokens").upsert(linha); // harness-ok: segunda tentativa de gravação
    if (!error) return;
  }
  throw new FalhaContaAzul(MotivoFalha.Indisponivel, "Não foi possível guardar a autorização do Conta Azul.");
}

async function lerLinha(admin: SupabaseClient, connectionId: string): Promise<LinhaDeToken | null> {
  const { data, error } = await admin
    .from("conta_azul_tokens")
    .select("access_token_cipher, refresh_token_cipher, access_expires_at")
    .eq("connection_id", connectionId)
    .maybeSingle();
  if (error) throw new FalhaContaAzul(MotivoFalha.Indisponivel, "Não foi possível ler a autorização do Conta Azul.");
  return data as LinhaDeToken | null;
}

async function pegarTrava(admin: SupabaseClient, connectionId: string): Promise<boolean> {
  const { data, error } = await admin.rpc("conta_azul_claim_refresh", { p_connection_id: connectionId });
  if (error) throw new FalhaContaAzul(MotivoFalha.Indisponivel, "Não foi possível renovar a autorização do Conta Azul.");
  return data === true;
}

async function soltarTrava(admin: SupabaseClient, connectionId: string): Promise<void> {
  await admin.from("conta_azul_tokens").update({ refreshing_until: null }).eq("connection_id", connectionId);
}

export async function marcarReconectar(admin: SupabaseClient, connectionId: string, mensagem: string): Promise<void> {
  await admin
    .from("conta_azul_connections")
    .update({ status: StatusConexao.Reconectar, last_error: mensagem })
    .eq("id", connectionId);
}

async function renovarComTrava(admin: SupabaseClient, connectionId: string, linha: LinhaDeToken): Promise<string> {
  try {
    const tokens = await renovar(await decifrar(linha.refresh_token_cipher));
    await guardarTokens(admin, connectionId, tokens);
    return tokens.accessToken;
  } catch (erro) {
    await soltarTrava(admin, connectionId);
    if (erro instanceof FalhaContaAzul && erro.motivo === MotivoFalha.Reconectar) {
      await marcarReconectar(admin, connectionId, erro.message);
    }
    throw erro;
  }
}

const valeAinda = (linha: LinhaDeToken) => new Date(linha.access_expires_at).getTime() - Date.now() > MARGEM_MS;

/**
 * Access token válido da conexão. Se precisa renovar, só uma execução renova: as outras
 * esperam e releem, porque o refresh token rotaciona e uma segunda renovação o mataria.
 */
export async function tokenDeAcesso(admin: SupabaseClient, connectionId: string): Promise<string> {
  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const linha = await lerLinha(admin, connectionId); // harness-ok: relê o que outra execução renovou
    if (!linha) {
      throw new FalhaContaAzul(MotivoFalha.Reconectar, "Esta empresa não tem autorização do Conta Azul. Conecte de novo.");
    }
    if (valeAinda(linha)) return decifrar(linha.access_token_cipher);
    if (await pegarTrava(admin, connectionId)) return renovarComTrava(admin, connectionId, linha); // harness-ok: a trava muda de dono entre tentativas
    await esperar(ESPERA_DA_TRAVA_MS); // harness-ok: espera quem está renovando
  }
  throw new FalhaContaAzul(MotivoFalha.Indisponivel, "A autorização do Conta Azul está sendo renovada. Tente de novo em instantes.");
}
