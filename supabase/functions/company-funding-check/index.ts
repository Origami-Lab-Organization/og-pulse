// company-funding-check — cruza a empresa com o fomento público pelo CNPJ e grava o resultado
// em prospect_companies.fomento. Fontes e limites: .harness/integrations/fomento-publico.md

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEMPO_MS = 10000;
const BNDES_API = "https://dadosabertos.bndes.gov.br/api/3/action/datastore_search";
const BNDES_NAO_AUTOMATICAS = "6f56b78c-510f-44b6-8274-78a5b7e931f4";
const TRANSPARENCIA_API = "https://api.portaldatransparencia.gov.br/api-de-dados";
const FONTE_LEI_DO_BEM = "lei_do_bem";
const FONTE_FINEP = "finep";

// deno-lint-ignore no-explicit-any -- cliente sem tipos gerados, como nas outras funções
type Supabase = ReturnType<typeof createClient<any>>;

interface Operacao {
  fonte: "FINEP" | "BNDES";
  ano: number | null;
  valor: number | null;
  instrumento: string | null;
  descricao: string | null;
}

class Recusa extends Error {
  constructor(message: string, readonly status = 422) {
    super(message);
  }
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const mascarado = (cnpj: string) =>
  cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

const anoDe = (data: unknown) => {
  const ano = Number(String(data ?? "").slice(0, 4));
  return Number.isFinite(ano) && ano > 1990 ? ano : null;
};

const numero = (valor: unknown) => {
  if (typeof valor === "number") return valor;
  const texto = String(valor ?? "").replace(/\./g, "").replace(",", ".");
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
};

// ── Fontes ────────────────────────────────────────────────────────────────────

// BNDES: operações diretas e indiretas não automáticas, por CNPJ exato. POST — o GET com
// filtro é barrado pelo WAF deles.
async function bndes(cnpj: string): Promise<Operacao[]> {
  const resposta = await fetch(BNDES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource_id: BNDES_NAO_AUTOMATICAS, filters: { cnpj: mascarado(cnpj) }, limit: 50 }),
    signal: AbortSignal.timeout(TEMPO_MS),
  });
  if (!resposta.ok) throw new Error(`bndes ${resposta.status}`);
  const corpo = await resposta.json();
  const registros: Record<string, unknown>[] = corpo?.result?.records ?? [];
  return registros.map((r) => ({
    fonte: "BNDES" as const,
    ano: anoDe(r.data_da_contratacao),
    valor: numero(r.valor_contratado_reais),
    instrumento: [r.produto, r.inovacao === "SIM" ? "inovação" : null].filter(Boolean).join(" · ") || null,
    descricao: String(r.descricao_do_projeto ?? "").replace(/\s+/g, " ").trim().slice(0, 300) || null,
  }));
}

interface Referencia {
  fonte: string;
  ano: number | null;
  valor: number | null;
  instrumento: string | null;
  descricao: string | null;
}

async function referencia(supabase: Supabase, cnpj: string): Promise<{ linhas: Referencia[]; temLeiDoBem: boolean }> {
  const [{ data, error }, carga] = await Promise.all([
    supabase.from("fomento_publico").select("fonte, ano, valor, instrumento, descricao").eq("cnpj", cnpj).limit(200),
    supabase.from("fomento_publico").select("id", { count: "exact", head: true }).eq("fonte", FONTE_LEI_DO_BEM),
  ]);
  if (error) throw new Error("fomento_publico");
  return { linhas: (data ?? []) as Referencia[], temLeiDoBem: (carga.count ?? 0) > 0 };
}

// Portal da Transparência: contratos do governo federal com a empresa. Sem a chave (secret
// TRANSPARENCIA_API_KEY), devolve null — a tela diz que a fonte não está configurada.
async function governo(cnpj: string): Promise<{ contratos: number; valorTotal: number | null } | null> {
  const chave = Deno.env.get("TRANSPARENCIA_API_KEY");
  if (!chave) return null;
  let contratos = 0;
  let valorTotal = 0;
  for (let pagina = 1; pagina <= 3; pagina++) {
    const url = `${TRANSPARENCIA_API}/contratos/cpf-cnpj?cpfCnpj=${cnpj}&pagina=${pagina}`;
    const resposta = await fetch(url, { headers: { "chave-api-dados": chave, Accept: "application/json" }, signal: AbortSignal.timeout(TEMPO_MS) }); // harness-ok: página diferente a cada volta
    if (!resposta.ok) throw new Error(`transparencia ${resposta.status}`);
    const lista: Array<{ valorFinalCompra?: number; valorInicialCompra?: number }> = await resposta.json(); // harness-ok: corpo desta página
    contratos += lista.length;
    valorTotal += lista.reduce((t, c) => t + (Number(c.valorFinalCompra ?? c.valorInicialCompra) || 0), 0);
    if (lista.length < 15) break;
  }
  return { contratos, valorTotal: contratos > 0 ? valorTotal : null };
}

// ── Montagem ──────────────────────────────────────────────────────────────────

function sinais(ref: { linhas: Referencia[]; temLeiDoBem: boolean }, doBndes: Operacao[], doGoverno: Awaited<ReturnType<typeof governo>>) {
  const leiDoBem = ref.linhas.filter((l) => l.fonte === FONTE_LEI_DO_BEM);
  const finep: Operacao[] = ref.linhas
    .filter((l) => l.fonte === FONTE_FINEP)
    .map((l) => ({ fonte: "FINEP", ano: l.ano, valor: l.valor, instrumento: l.instrumento, descricao: l.descricao }));
  const fomentos = [...finep, ...doBndes].sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0));
  return {
    leiDoBem: leiDoBem.length > 0 ? "ja_usa" : ref.temLeiDoBem ? "nunca_usou" : "desconhecido",
    leiDoBemAno: leiDoBem.reduce<number | null>((m, l) => (l.ano && (!m || l.ano > m) ? l.ano : m), null),
    captouFomento: fomentos.length > 0,
    fomentos: fomentos.slice(0, 30),
    governo: doGoverno,
  };
}

async function clienteDoUsuario(req: Request): Promise<Supabase> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Recusa("Não autenticado.", 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Recusa("Sessão inválida.", 401);
  return supabase;
}

async function cnpjDaEmpresa(supabase: Supabase, id: string): Promise<string> {
  const { data, error } = await supabase.from("prospect_companies").select("cnpj").eq("id", id).maybeSingle();
  if (error) throw new Recusa("Não foi possível ler a empresa.", 500);
  if (!data) throw new Recusa("Empresa não encontrada.", 404);
  if (!data.cnpj) throw new Recusa("Cadastre o CNPJ da empresa para cruzar o fomento.");
  return data.cnpj as string;
}

// Uma fonte fora do ar não derruba as outras: o que respondeu é gravado, e o que falhou volta
// em `indisponiveis` para a tela avisar.
async function consultar(supabase: Supabase, cnpj: string) {
  const [ref, doBndes, doGoverno] = await Promise.allSettled([referencia(supabase, cnpj), bndes(cnpj), governo(cnpj)]);
  const indisponiveis = [
    ref.status === "rejected" ? "FINEP/Lei do Bem" : null,
    doBndes.status === "rejected" ? "BNDES" : null,
    doGoverno.status === "rejected" ? "Portal da Transparência" : null,
  ].filter(Boolean);
  const resultado = sinais(
    ref.status === "fulfilled" ? ref.value : { linhas: [], temLeiDoBem: false },
    doBndes.status === "fulfilled" ? doBndes.value : [],
    doGoverno.status === "fulfilled" ? doGoverno.value : null,
  );
  return { resultado, indisponiveis };
}

async function companyIdDe(req: Request): Promise<string> {
  const corpo = await req.json().catch(() => ({}));
  const id = typeof corpo?.company_id === "string" ? corpo.company_id : "";
  if (!UUID.test(id)) throw new Recusa("company_id inválido.", 400);
  return id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const supabase = await clienteDoUsuario(req);
    const id = await companyIdDe(req);
    const cnpj = await cnpjDaEmpresa(supabase, id);
    const { resultado, indisponiveis } = await consultar(supabase, cnpj);
    const { error } = await supabase
      .from("prospect_companies")
      .update({ fomento: resultado, fomento_consultado_em: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Recusa("Não foi possível gravar o fomento.", 500);
    return json({ fomento: resultado, indisponiveis }, 200);
  } catch (erro) {
    if (erro instanceof Recusa) return json({ error: erro.message }, erro.status);
    console.error("company-funding-check: falha inesperada", (erro as Error)?.name);
    return json({ error: "Não foi possível consultar o fomento agora." }, 502);
  }
});
