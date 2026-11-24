/**
 * Retrato da Base nas empresas do Pulse (US-0014, ADR-0055), só com a chave de serviço: a
 * tarefa de segunda-feira e a chamada à mão depois de cada carga. Os logs trazem só contagens.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { ehChamadaDeServico } from "../_shared/chamadaDeServico.ts";

const LOTE = 1000;
const METODO = "POST";

interface EmpresaDoPulse {
  id: string;
  cnpj: string;
}

interface LinhaDaBase {
  cnpj_basico: string;
  funcionarios: number | null;
  divida_ajuizada: number | null;
  distancia_km: number | null;
  faturamento_estimado: number | null;
  faturamento_base: string | null;
}

function baseDaReceita(): Pool {
  const url = Deno.env.get("RECEITA_DB_URL");
  const ac = Deno.env.get("RECEITA_DB_CA");
  if (!url || !ac) throw new Error("A base da Receita não está configurada.");
  const u = new URL(url);
  return new Pool({
    hostname: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    tls: { enabled: true, enforce: true, caCertificates: [ac] },
    connection: { attempts: 1 },
  }, 1, true);
}

const raiz = (cnpj: string) => cnpj.replace(/\D/g, "").slice(0, 8);

// deno-lint-ignore no-explicit-any
async function empresasDoPulse(admin: any): Promise<EmpresaDoPulse[]> {
  const todas: EmpresaDoPulse[] = [];
  for (let de = 0; ; de += LOTE) {
    const { data, error } = await admin.from("prospect_companies").select("id, cnpj").not("cnpj", "is", null).order("id").range(de, de + LOTE - 1); // harness-ok: paginação
    if (error) throw error;
    todas.push(...((data ?? []) as EmpresaDoPulse[]).filter((e) => raiz(e.cnpj).length === 8));
    if (!data || data.length < LOTE) return todas;
  }
}

async function daBase(pool: Pool, raizes: string[]): Promise<Map<string, LinhaDaBase>> {
  const conexao = await pool.connect();
  try {
    const mapa = new Map<string, LinhaDaBase>();
    for (let i = 0; i < raizes.length; i += LOTE) {
      const r = await conexao.queryObject<LinhaDaBase>( // harness-ok: lotes de mil raízes
        `SELECT cnpj_basico::text AS cnpj_basico, funcionarios, divida_ajuizada::float8 AS divida_ajuizada, distancia_km,
                faturamento_estimado::float8 AS faturamento_estimado, faturamento_base
           FROM pulse.empresas WHERE cnpj_basico = ANY($1::bpchar[])`,
        [raizes.slice(i, i + LOTE)],
      );
      r.rows.forEach((l) => mapa.set(l.cnpj_basico.trim(), l));
    }
    return mapa;
  } finally {
    conexao.release();
  }
}

function retratoDe(e: EmpresaDoPulse, base: Map<string, LinhaDaBase>) {
  const l = base.get(raiz(e.cnpj));
  return {
    id: e.id,
    funcionarios: l?.funcionarios ?? null,
    divida_ajuizada: l?.divida_ajuizada ?? null,
    distancia_km: l?.distancia_km ?? null,
    faturamento_estimado: l?.faturamento_estimado ?? null,
    faturamento_base: l?.faturamento_base ?? null,
  };
}

// deno-lint-ignore no-explicit-any
async function gravar(admin: any, retratos: ReturnType<typeof retratoDe>[]): Promise<number> {
  let gravadas = 0;
  for (let i = 0; i < retratos.length; i += LOTE) {
    const { data, error } = await admin.rpc("atualizar_retrato_da_base", { p_retratos: retratos.slice(i, i + LOTE) }); // harness-ok: lotes de mil
    if (error) throw error;
    gravadas += Number(data ?? 0);
  }
  return gravadas;
}

async function atualizar(): Promise<{ empresas: number; na_base: number }> {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const pool = baseDaReceita();
  try {
    const empresas = await empresasDoPulse(admin);
    const base = await daBase(pool, [...new Set(empresas.map((e) => raiz(e.cnpj)))]);
    const retratos = empresas.map((e) => retratoDe(e, base));
    return { empresas: await gravar(admin, retratos), na_base: retratos.filter((r) => r.faturamento_base !== null).length };
  } finally {
    await pool.end();
  }
}

Deno.serve(async (req) => {
  if (req.method !== METODO) return new Response("Use POST.", { status: 405 });
  if (!(await ehChamadaDeServico(req))) return new Response("Não autorizado.", { status: 401 });
  try {
    const resultado = await atualizar();
    console.log(`[retrato-da-base] ${resultado.empresas} empresas, ${resultado.na_base} encontradas na Base`);
    return Response.json(resultado);
  } catch (e) {
    console.error("[retrato-da-base] falhou:", e instanceof Error ? e.name : "erro");
    return Response.json({ erro: "Não foi possível atualizar o retrato da Base." }, { status: 500 });
  }
});
