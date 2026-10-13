// lei-do-bem-sync — carga automática da Lei do Bem (13/10/2026). Contrato e limites:
// .harness/integrations/fomento-publico.md (seção Lei do Bem automática).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocumentProxy } from "npm:unpdf@1.8.1";
import { ehChamadaDeServico } from "../_shared/chamadaDeServico.ts";
import { anoDoLote, empresasDoLote, INDICE_DE_LOTES, lotesDoIndice, type LoteDoIndice } from "../_shared/leiDoBem.ts";

const FONTE = "lei_do_bem";
const HORAS_ENTRE_VARREDURAS = 6;
// Ler PDF gasta CPU, e a Edge Function tem cota curta por chamada: ~70 ms por lote medidos
// em 13/10/2026, pico de 270 ms na primeira leitura.
const LOTES_POR_CHAMADA = 4;
const MAXIMO_DE_TENTATIVAS = 5;
const LINHAS_POR_GRAVACAO = 500;
const TEMPO_MS = 20000;
const AGENTE = "og-pulse lei-do-bem-sync (+https://origamilab.com.br)";

const SITUACAO = { importado: "importado", semCnpj: "sem_cnpj", falhou: "falhou" } as const;

// deno-lint-ignore no-explicit-any -- cliente sem tipos gerados, como nas outras funções
type Supabase = ReturnType<typeof createClient<any>>;

interface Resultado {
  situacao: (typeof SITUACAO)[keyof typeof SITUACAO];
  empresas: number | null;
  erro: string | null;
}

// ── Índice ────────────────────────────────────────────────────────────────────

async function varreduraVencida(supabase: Supabase): Promise<boolean> {
  const { data, error } = await supabase
    .from("fomento_publico_varreduras")
    .select("verificada_em")
    .eq("fonte", FONTE)
    .maybeSingle();
  if (error) throw new Error("varreduras");
  return !data || Date.now() - new Date(data.verificada_em).getTime() > HORAS_ENTRE_VARREDURAS * 3600000;
}

/** Registra os lotes novos como pendentes; os já conhecidos ficam como estão. */
async function descobrirLotes(supabase: Supabase): Promise<number> {
  const resposta = await fetch(INDICE_DE_LOTES, { headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(TEMPO_MS) });
  if (!resposta.ok) throw new Error(`indice ${resposta.status}`);
  const lotes = lotesDoIndice(await resposta.text());
  if (lotes.length > 0) {
    const { error } = await supabase
      .from("fomento_publico_arquivos")
      .upsert(lotes.map((l) => ({ url: l.url, fonte: FONTE, ano: l.ano })), { onConflict: "url", ignoreDuplicates: true });
    if (error) throw new Error("arquivos");
  }
  const { error } = await supabase
    .from("fomento_publico_varreduras")
    .upsert({ fonte: FONTE, verificada_em: new Date().toISOString() });
  if (error) throw new Error("varreduras");
  return lotes.length;
}

// ── Lotes ─────────────────────────────────────────────────────────────────────

async function pendentes(supabase: Supabase): Promise<(LoteDoIndice & { tentativas: number })[]> {
  const { data, error } = await supabase
    .from("fomento_publico_arquivos")
    .select("url, ano, tentativas")
    .eq("fonte", FONTE)
    .or(`situacao.eq.pendente,and(situacao.eq.${SITUACAO.falhou},tentativas.lt.${MAXIMO_DE_TENTATIVAS})`)
    .order("tentativas")
    .order("ano")
    .order("url")
    .limit(LOTES_POR_CHAMADA);
  if (error) throw new Error("pendentes");
  return data ?? [];
}

/** O texto do PDF linha a linha: os pedaços na mesma altura da página formam uma linha. */
async function linhasDoPdf(bytes: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(bytes, { verbosity: 0 });
  const linhas: string[] = [];
  for (let numero = 1; numero <= pdf.numPages; numero++) {
    const { items } = await (await pdf.getPage(numero)).getTextContent(); // harness-ok: página diferente a cada volta
    const porAltura = new Map<number, { x: number; texto: string }[]>();
    for (const item of items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      porAltura.set(y, [...(porAltura.get(y) ?? []), { x: item.transform[4], texto: item.str.trim() }]);
    }
    for (const [, pedacos] of [...porAltura].sort((a, b) => b[0] - a[0])) {
      linhas.push(pedacos.sort((a, b) => a.x - b.x).map((p) => p.texto).join(" "));
    }
  }
  return linhas;
}

async function gravar(supabase: Supabase, empresas: ReturnType<typeof empresasDoLote>): Promise<void> {
  for (let i = 0; i < empresas.length; i += LINHAS_POR_GRAVACAO) {
    const parte = empresas.slice(i, i + LINHAS_POR_GRAVACAO);
    const { error } = await supabase.rpc("import_fomento_publico", { p_linhas: parte }); // harness-ok: um lote diferente a cada volta
    if (error) throw new Error("import_fomento_publico");
  }
}

async function importarLote(supabase: Supabase, lote: LoteDoIndice): Promise<Resultado> {
  try {
    const resposta = await fetch(lote.url, { headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(TEMPO_MS) });
    if (!resposta.ok) throw new Error(`pdf ${resposta.status}`);
    const linhas = await linhasDoPdf(new Uint8Array(await resposta.arrayBuffer()));
    const empresas = empresasDoLote(linhas, anoDoLote(linhas, lote.ano));
    await gravar(supabase, empresas);
    return { situacao: empresas.length > 0 ? SITUACAO.importado : SITUACAO.semCnpj, empresas: empresas.length, erro: null };
  } catch (erro) {
    return { situacao: SITUACAO.falhou, empresas: null, erro: String((erro as Error)?.message ?? erro).slice(0, 200) };
  }
}

async function registrar(supabase: Supabase, lote: { url: string; tentativas: number }, r: Resultado): Promise<void> {
  const { error } = await supabase
    .from("fomento_publico_arquivos")
    .update({
      situacao: r.situacao,
      empresas: r.empresas,
      erro: r.erro,
      tentativas: lote.tentativas + 1,
      importado_em: r.situacao === SITUACAO.falhou ? null : new Date().toISOString(),
    })
    .eq("url", lote.url);
  if (error) throw new Error("registrar");
}

async function processarPendentes(supabase: Supabase) {
  const total = { lotes: 0, falhas: 0, empresas: 0 };
  for (const lote of await pendentes(supabase)) {
    const r = await importarLote(supabase, lote); // harness-ok: um PDF por vez, pela cota de CPU
    await registrar(supabase, lote, r);
    total.lotes += 1;
    total.falhas += r.situacao === SITUACAO.falhou ? 1 : 0;
    total.empresas += r.empresas ?? 0;
  }
  return total;
}

async function recalcularEmpresas(supabase: Supabase): Promise<number> {
  const { data, error } = await supabase.rpc("recalcular_lei_do_bem_nas_empresas");
  if (error) throw new Error("recalcular_lei_do_bem_nas_empresas");
  return data ?? 0;
}

// ── Entrada ───────────────────────────────────────────────────────────────────

// Chamada pelo cron de hora em hora e pelo "Atualizar" do fomento (company-funding-check),
// sempre com a chave de serviço.
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Use POST.", { status: 405 });
  if (!(await ehChamadaDeServico(req))) return new Response("Não autorizado.", { status: 401 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const inicio = Date.now();
  try {
    const lotesNoIndice = (await varreduraVencida(supabase)) ? await descobrirLotes(supabase) : null;
    const processados = await processarPendentes(supabase);
    const empresasAtualizadas = processados.lotes > 0 ? await recalcularEmpresas(supabase) : 0;
    // Rastro da automação recorrente (patterns/monitoring.md): contagens, sem dado de empresa.
    const resumo = { evento: "lei-do-bem-sync", status: "ok", lotesNoIndice, ...processados, empresasAtualizadas, ms: Date.now() - inicio };
    console.log(JSON.stringify(resumo));
    return new Response(JSON.stringify(resumo), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (erro) {
    console.error(JSON.stringify({ evento: "lei-do-bem-sync", status: "erro", etapa: (erro as Error).message }));
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
});
