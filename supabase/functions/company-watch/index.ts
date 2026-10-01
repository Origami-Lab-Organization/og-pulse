// company-watch — gatilhos comerciais: reconsulta a Receita pelo cron diário e avisa os
// responsáveis. Regras e limites: .harness/integrations/brasilapi-cnpj.md (seção Gatilhos).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  isSituacaoAtiva,
  leiDoBemSignal,
  receitaFromBrasilApi,
  type ReceitaSnapshot,
  type RespostaBrasilApi,
} from "../_shared/receita.ts";
import { ehChamadaDeServico } from "../_shared/chamadaDeServico.ts";

const BRASILAPI = "https://brasilapi.com.br/api/cnpj/v1";
const POR_EXECUCAO = 120;
const DIAS_ENTRE_CONSULTAS = 30;
const PAUSA_MS = 400;
const TEMPO_MS = 10000;
const TIPO = "prospeccao_gatilho";

// deno-lint-ignore no-explicit-any -- cliente sem tipos gerados, como nas outras funções
type Supabase = ReturnType<typeof createClient<any>>;

interface Empresa {
  id: string;
  tenant_id: string;
  name: string;
  cnpj: string;
  created_by: string | null;
  regime_tributario: string | null;
  porte: string | null;
  situacao_cadastral: string | null;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── O que é gatilho ───────────────────────────────────────────────────────────

const ELEGIVEL = "elegivel";

type Regra = (antes: Empresa, depois: ReceitaSnapshot, sociosAntes: Set<string>) => string | null;

const entrouNoLucroReal: Regra = (antes, depois) =>
  leiDoBemSignal(depois.regimeTributario) === ELEGIVEL && leiDoBemSignal(antes.regime_tributario) !== ELEGIVEL
    ? `entrou no Lucro Real (${depois.regimeTributarioAno}) — pode usar a Lei do Bem`
    : null;

const mudouDePorte: Regra = (antes, depois) =>
  antes.porte && depois.porte && antes.porte !== depois.porte ? `mudou de porte: ${depois.porte}` : null;

const deixouDeEstarAtiva: Regra = (antes, depois) =>
  isSituacaoAtiva(antes.situacao_cadastral) && !isSituacaoAtiva(depois.situacaoCadastral)
    ? `ficou ${depois.situacaoCadastral} na Receita — não abordar`
    : null;

const socioNovo: Regra = (_antes, depois, sociosAntes) => {
  if (sociosAntes.size === 0) return null;
  const novos = depois.socios.filter((s) => !sociosAntes.has(s.nome.trim().toLowerCase()));
  if (novos.length === 0) return null;
  const nomes = novos.slice(0, 3).map((s) => `${s.nome}${s.qualificacao ? ` (${s.qualificacao})` : ""}`);
  return `novo(s) no quadro: ${nomes.join(", ")}`;
};

const REGRAS: Regra[] = [entrouNoLucroReal, mudouDePorte, deixouDeEstarAtiva, socioNovo];

function mudancas(antes: Empresa, depois: ReceitaSnapshot, sociosAntes: Set<string>): string[] {
  return REGRAS.map((regra) => regra(antes, depois, sociosAntes)).filter((m): m is string => !!m);
}

// ── Dados ─────────────────────────────────────────────────────────────────────

async function empresasParaReconsultar(supabase: Supabase): Promise<Empresa[]> {
  const limite = new Date(Date.now() - DIAS_ENTRE_CONSULTAS * 86400000).toISOString();
  const { data, error } = await supabase
    .from("prospect_companies")
    .select("id, tenant_id, name, cnpj, created_by, regime_tributario, porte, situacao_cadastral")
    .not("cnpj", "is", null)
    .not("receita_consultada_em", "is", null)
    .lt("receita_consultada_em", limite)
    .order("receita_consultada_em", { ascending: true })
    .limit(POR_EXECUCAO);
  if (error) throw new Error("leitura de empresas");
  return (data ?? []) as Empresa[];
}

async function sociosAtivos(supabase: Supabase, companyId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("prospect_company_partners")
    .select("nome")
    .eq("company_id", companyId)
    .eq("ativo", true);
  return new Set((data ?? []).map((s: { nome: string }) => s.nome.trim().toLowerCase()));
}

// Quem recebe: os responsáveis pelos contatos da empresa e quem a cadastrou — do mesmo tenant.
async function destinatarios(supabase: Supabase, empresa: Empresa): Promise<string[]> {
  const { data } = await supabase
    .from("prospects")
    .select("owner_id")
    .eq("company_id", empresa.id)
    .eq("tenant_id", empresa.tenant_id);
  const ids = new Set<string>((data ?? []).map((p: { owner_id: string | null }) => p.owner_id).filter(Boolean) as string[]);
  if (empresa.created_by) ids.add(empresa.created_by);
  return [...ids];
}

async function avisar(supabase: Supabase, empresa: Empresa, itens: string[]): Promise<number> {
  const ids = await destinatarios(supabase, empresa);
  if (ids.length === 0) return 0;
  const { error } = await supabase.from("notifications").insert(
    ids.map((recipient_id) => ({
      tenant_id: empresa.tenant_id,
      recipient_id,
      type: TIPO,
      category: "comercial",
      priority: "normal",
      title: `${empresa.name}: ${itens[0]}`,
      message: itens.length > 1 ? itens.slice(1).join(" · ") : null,
      reference_id: empresa.id,
      action_url: `/comercial/empresas?empresa=${empresa.id}`,
      metadata: { gatilhos: itens },
    })),
  );
  if (error) throw new Error("notificação");
  return ids.length;
}

async function consultarReceita(cnpj: string): Promise<ReceitaSnapshot | null> {
  const resposta = await fetch(`${BRASILAPI}/${cnpj}`, { signal: AbortSignal.timeout(TEMPO_MS) });
  if (!resposta.ok) return null;
  return receitaFromBrasilApi((await resposta.json()) as RespostaBrasilApi);
}

async function processar(supabase: Supabase, empresa: Empresa): Promise<{ avisos: number; falhou: boolean }> {
  const depois = await consultarReceita(empresa.cnpj).catch(() => null);
  if (!depois) return { avisos: 0, falhou: true };
  const itens = mudancas(empresa, depois, await sociosAtivos(supabase, empresa.id));
  // Mesma RPC da tela: empresa e sócios mudam juntos. Service role: sem RLS, tenant da linha.
  const { error } = await supabase.rpc("save_prospect_company_receita", { p_company_id: empresa.id, p_receita: depois });
  if (error) return { avisos: 0, falhou: true };
  return { avisos: itens.length ? await avisar(supabase, empresa, itens) : 0, falhou: false };
}

// ── Entrada: só o cron (service role) ─────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Use POST.", { status: 405 });
  if (!(await ehChamadaDeServico(req))) return new Response("Não autorizado.", { status: 401 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const inicio = Date.now();
  let consultadas = 0;
  let falhas = 0;
  let avisos = 0;
  try {
    for (const empresa of await empresasParaReconsultar(supabase)) {
      const r = await processar(supabase, empresa); // harness-ok: uma empresa por vez, com pausa (limite da BrasilAPI)
      consultadas += 1;
      falhas += r.falhou ? 1 : 0;
      avisos += r.avisos;
      await esperar(PAUSA_MS); // harness-ok: pausa proposital entre consultas
    }
  } catch (erro) {
    console.error(JSON.stringify({ evento: "company-watch", status: "erro", etapa: (erro as Error).message }));
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
  // Rastro da automação recorrente (patterns/monitoring.md): contagens, sem dado de empresa.
  const resumo = { evento: "company-watch", status: "ok", consultadas, falhas, avisos, ms: Date.now() - inicio };
  console.log(JSON.stringify(resumo));
  return new Response(JSON.stringify(resumo), { status: 200, headers: { "Content-Type": "application/json" } });
});
