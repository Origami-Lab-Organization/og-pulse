// Fecha a ligação da empresa ao Conta Azul (ADR-0044): confere o `state`, troca o código pela
// autorização, descobre qual empresa do Conta Azul foi ligada e guarda o token cifrado.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { lerEmpresaConectada, revogar, trocarCodigo } from "../_shared/contaAzul.ts";
import { guardarTokens } from "../_shared/contaAzulConexao.ts";
import {
  clienteAdmin,
  corpoDe,
  corsHeaders,
  exigirCapacidade,
  json,
  Recusa,
  respostaDeErro,
  usuarioDaSessao,
} from "../_shared/contaAzulHttp.ts";
import { StatusConexao } from "../_shared/contaAzulTipos.ts";
import type { Conexao, EmpresaConectada, Tokens } from "../_shared/contaAzulTipos.ts";

const VIOLA_UNICIDADE = "23505";
const COLUNAS_DA_CONEXAO =
  "id, tenant_id, ca_company_id, ca_document, ca_legal_name, ca_trade_name, status, connected_at, last_sync_at, last_error";

interface Retorno {
  code: string;
  state: string;
}

function retornoDe(corpo: Record<string, unknown>): Retorno {
  const code = typeof corpo.code === "string" ? corpo.code : "";
  const state = typeof corpo.state === "string" ? corpo.state : "";
  if (!code || !state) throw new Recusa("O Conta Azul voltou sem a autorização. Comece a conexão de novo.", 400);
  return { code, state };
}

/** Uso único: o `state` sai da tabela na mesma operação que o lê. */
async function consumirState(admin: SupabaseClient, state: string, userId: string): Promise<string> {
  const { data, error } = await admin
    .from("conta_azul_oauth_states")
    .delete()
    .eq("state", state)
    .select("tenant_id, user_id, expires_at")
    .maybeSingle();
  if (error) throw new Recusa("Não foi possível conferir o retorno do Conta Azul.", 500);
  if (!data) throw new Recusa("Este retorno do Conta Azul não vale mais. Comece a conexão de novo.", 400);
  if (data.user_id !== userId) throw new Recusa("Esta conexão foi começada por outra pessoa.", 403);
  if (new Date(data.expires_at).getTime() < Date.now()) {
    throw new Recusa("A conexão demorou demais para voltar. Comece de novo.", 400);
  }
  return data.tenant_id as string;
}

async function conexaoAtual(admin: SupabaseClient, campo: string, valor: string): Promise<Conexao | null> {
  const { data, error } = await admin.from("conta_azul_connections").select(COLUNAS_DA_CONEXAO).eq(campo, valor).maybeSingle();
  if (error) throw new Recusa("Não foi possível ler a conexão atual.", 500);
  return data as Conexao | null;
}

/**
 * Uma conta do Conta Azul liga a UMA empresa do Pulse, e uma empresa troca de conta só
 * desconectando antes — senão a autorização antiga ficaria viva do lado do Conta Azul.
 */
async function conferirConflito(admin: SupabaseClient, tenantId: string, empresa: EmpresaConectada): Promise<void> {
  const daConta = await conexaoAtual(admin, "ca_company_id", empresa.idEmpresa);
  if (daConta && daConta.tenant_id !== tenantId) {
    throw new Recusa("Esta conta do Conta Azul já está ligada a outra empresa do Pulse.", 409);
  }
  const daEmpresa = await conexaoAtual(admin, "tenant_id", tenantId);
  if (daEmpresa && daEmpresa.ca_company_id !== empresa.idEmpresa) {
    throw new Recusa("Esta empresa já está ligada a outra conta do Conta Azul. Desconecte antes de trocar.", 409);
  }
}

async function gravarConexao(admin: SupabaseClient, tenantId: string, userId: string, empresa: EmpresaConectada): Promise<Conexao> {
  const { data, error } = await admin
    .from("conta_azul_connections")
    .upsert(
      {
        tenant_id: tenantId,
        ca_company_id: empresa.idEmpresa,
        ca_document: empresa.documento,
        ca_legal_name: empresa.razaoSocial,
        ca_trade_name: empresa.nomeFantasia,
        status: StatusConexao.Ativa,
        connected_by: userId,
        connected_at: new Date().toISOString(),
        last_error: null,
      },
      { onConflict: "tenant_id" },
    )
    .select(COLUNAS_DA_CONEXAO)
    .single();
  if (error?.code === VIOLA_UNICIDADE) throw new Recusa("Esta conta do Conta Azul já está ligada a outra empresa do Pulse.", 409);
  if (error || !data) throw new Recusa("Não foi possível gravar a conexão.", 500);
  return data as Conexao;
}

/** Autorização que não vai ser usada não fica viva do lado do Conta Azul. */
async function descartar(tokens: Tokens, empresa: EmpresaConectada): Promise<void> {
  await revogar(tokens.accessToken, empresa.idEmpresa).catch(() => undefined);
}

async function ligar(admin: SupabaseClient, tenantId: string, userId: string, tokens: Tokens): Promise<Conexao> {
  const empresa = await lerEmpresaConectada(tokens.accessToken);
  try {
    await conferirConflito(admin, tenantId, empresa);
    const conexao = await gravarConexao(admin, tenantId, userId, empresa);
    await guardarTokens(admin, conexao.id, tokens);
    return conexao;
  } catch (erro) {
    await descartar(tokens, empresa);
    throw erro;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const userId = await usuarioDaSessao(req);
    const { code, state } = retornoDe(await corpoDe(req));
    const admin = clienteAdmin();
    const tenantId = await consumirState(admin, state, userId);
    await exigirCapacidade(admin, userId, tenantId);
    const conexao = await ligar(admin, tenantId, userId, await trocarCodigo(code));
    return json({ conexao }, 200);
  } catch (erro) {
    return respostaDeErro("conta-azul-callback", erro);
  }
});
