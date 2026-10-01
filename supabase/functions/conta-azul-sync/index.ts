// Sincroniza o espelho do Conta Azul (ADR-0044, parte 2). Cron: todas as conexões ativas;
// "Sincronizar agora": só a da empresa. Responde na hora; o trabalho segue em segundo plano.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
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
import { sincronizarConexao } from "../_shared/contaAzulSync.ts";
import { StatusConexao } from "../_shared/contaAzulTipos.ts";
import type { ConexaoParaSincronizar } from "../_shared/contaAzulTipos.ts";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

/** Abaixo do limite de execução das Edge Functions, com folga para gravar o andamento. */
const PRAZO_MS = 110_000;
const COLUNAS = "id, tenant_id, connected_at, backfill_cursor, backfill_done_at, incremental_cursor, last_full_scan_at";

function ehCron(req: Request): boolean {
  const chave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return chave.length > 0 && req.headers.get("Authorization") === `Bearer ${chave}`;
}

async function conexoesDoCron(admin: SupabaseClient): Promise<ConexaoParaSincronizar[]> {
  const { data, error } = await admin
    .from("conta_azul_connections")
    .select(COLUNAS)
    .eq("status", StatusConexao.Ativa)
    .order("last_sync_at", { ascending: true, nullsFirst: true });
  if (error) throw new Recusa("Não foi possível ler as conexões.", 500);
  return (data ?? []) as ConexaoParaSincronizar[];
}

async function conexaoDoPedido(admin: SupabaseClient, req: Request): Promise<ConexaoParaSincronizar> {
  const userId = await usuarioDaSessao(req);
  const tenantId = tenantDe(await corpoDe(req));
  await exigirCapacidade(admin, userId, tenantId);
  const { data, error } = await admin
    .from("conta_azul_connections")
    .select(COLUNAS)
    .eq("tenant_id", tenantId)
    .eq("status", StatusConexao.Ativa)
    .maybeSingle();
  if (error) throw new Recusa("Não foi possível ler a conexão.", 500);
  if (!data) throw new Recusa("Esta empresa não tem conexão ativa com o Conta Azul.", 404);
  return data as ConexaoParaSincronizar;
}

/** Uma conexão por vez: o limite de requisições do Conta Azul é por conta, mas o prazo é da execução. */
async function sincronizarTodas(admin: SupabaseClient, conexoes: ConexaoParaSincronizar[]): Promise<void> {
  const prazo = Date.now() + PRAZO_MS;
  for (const conexao of conexoes) {
    if (Date.now() >= prazo) return;
    await sincronizarConexao(admin, conexao, prazo); // harness-ok: uma conexão por vez, dentro do prazo
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const admin = clienteAdmin();
    const conexoes = ehCron(req) ? await conexoesDoCron(admin) : [await conexaoDoPedido(admin, req)];
    EdgeRuntime.waitUntil(sincronizarTodas(admin, conexoes));
    return json({ iniciadas: conexoes.length }, 202);
  } catch (erro) {
    return respostaDeErro("conta-azul-sync", erro);
  }
});
