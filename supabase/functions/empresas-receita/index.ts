// empresas-receita — páginas, total e CNAEs da base da Receita, que mora na VPS (ADR-0053, US-0001/US-0002).
//
// O Supabase não guarda nada da base. Esta função confere a sessão e a capacidade
// `prospeccao:ler` e só então consulta o Postgres da VPS, por TLS, com o usuário `pulse_api`
// (só leitura, statement_timeout de 5 s). O certificado da VPS é conferido contra a
// autoridade própria em RECEITA_DB_CA: servidor diferente é recusado.
// Contrato: .harness/integrations/base-receita-vps.md
//
// Driver nativo do Deno (deno-postgres): o `npm:postgres` não abre TLS com o Postgres no
// Deno — testado em 16/11/2026, estoura o tempo de conexão.
//
// Corpo (US-0003, US-0005), por modo:
//   pagina (padrão): { ordem, crescente, pagina, filtros, busca? } → { carregada_em, total_da_base, linhas[] }
//   total:           { modo: 'total', filtros, busca? }            → { total, limitado }  (conta até 100 mil)
//   cnaes:           { modo: 'cnaes', termo }                      → { cnaes: [{ codigo, descricao }] }
//   ficha:           { modo: 'ficha', cnpj }                       → { empresa, contato, socios[], oportunidades[] }  (US-0007)
// A página e o total vêm separados: a lista aparece sem esperar a contagem.
// `busca` (US-0005): só números, a partir de 5, procura o começo do CNPJ e ignora os filtros
// (os 14 de uma filial acham a matriz); outro texto, a partir de 3 letras, procura no nome e
// no nome inteiro da cidade.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CAPACIDADE = "prospeccao:ler";
const POR_PAGINA = 25;
// Navegação até as 10 mil primeiras de cada ordem: medido com a base real, até aí qualquer
// ordem responde abaixo de 0,7 s; com 250 mil de deslocamento, 20 s (ADR-0053).
const ULTIMA_PAGINA = 10000 / POR_PAGINA - 1;

// A ordem vem desta lista fechada: nada do cliente vira SQL. Cada uma casa com um índice
// de pulse.empresas (scripts/receita/vps/preparar-vps.sql). "idade" decrescente = abertas há
// mais tempo primeiro.
const ORDENS: Record<string, string> = {
  "fit:desc": "e.fit_previo DESC, e.funcionarios DESC NULLS LAST, e.cnpj DESC",
  "fit:asc": "e.fit_previo ASC, e.funcionarios ASC NULLS FIRST, e.cnpj ASC",
  "nome:asc": "e.nome_exibicao ASC, e.cnpj ASC",
  "nome:desc": "e.nome_exibicao DESC, e.cnpj DESC",
  // Sem estimativa fica por último nos dois sentidos (US-0006).
  "faturamento:desc": "e.faturamento_estimado DESC NULLS LAST, e.cnpj DESC",
  "faturamento:asc": "e.faturamento_estimado ASC NULLS LAST, e.cnpj ASC",
  // Distância de Formiga (US-0015): sem município reconhecido no fim, nos dois sentidos.
  "distancia:asc": "e.distancia_km ASC NULLS LAST, e.cnpj ASC",
  "distancia:desc": "e.distancia_km DESC NULLS LAST, e.cnpj DESC",
  "funcionarios:desc": "e.funcionarios DESC NULLS LAST, e.cnpj DESC",
  "funcionarios:asc": "e.funcionarios ASC NULLS LAST, e.cnpj ASC",
  "idade:desc": "e.data_inicio_atividade ASC NULLS LAST, e.cnpj ASC",
  "idade:asc": "e.data_inicio_atividade DESC NULLS FIRST, e.cnpj DESC",
};

class Recusa extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PRAZO_MS = 5000;

// Conexões reaproveitadas entre chamadas enquanto a função está quente.
let conexoes: Pool | null = null;

function baseDaReceita(): Pool {
  const url = Deno.env.get("RECEITA_DB_URL");
  const ac = Deno.env.get("RECEITA_DB_CA");
  if (!url || !ac) throw new Recusa("A base da Receita não está configurada.", 503);
  if (conexoes) return conexoes;
  const u = new URL(url);
  conexoes = new Pool({
    hostname: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    tls: { enabled: true, enforce: true, caCertificates: [ac] },
    connection: { attempts: 1 },
  }, 2, true);
  return conexoes;
}

/** A VPS fora do ar não pode prender a função: falha em 5 s, e a tela oferece tentar de novo. */
function comPrazo<T>(promessa: Promise<T>): Promise<T> {
  let relogio: number | undefined;
  const prazo = new Promise<never>((_, rejeitar) => {
    relogio = setTimeout(() => rejeitar(new Error("prazo")), PRAZO_MS);
  });
  return Promise.race([promessa, prazo]).finally(() => clearTimeout(relogio));
}

/** Confere sessão e capacidade; devolve o cliente da sessão, que lê com a RLS da pessoa. */
async function exigirLeitura(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Recusa("Não autenticado.", 401);
  const url = Deno.env.get("SUPABASE_URL")!;
  const daSessao = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: sessao, error: erroDaSessao } = await daSessao.auth.getUser();
  if (erroDaSessao || !sessao?.user) throw new Recusa("Sessão inválida.", 401);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: tenant } = await admin.rpc("get_user_tenant_id", { _user_id: sessao.user.id });
  const { data: pode, error } = await admin.rpc("has_capability", { _user_id: sessao.user.id, _tenant_id: tenant, _capability: CAPACIDADE });
  if (error) throw new Recusa("Não foi possível conferir sua permissão.", 500);
  if (pode !== true) throw new Recusa("Sem permissão para ver a base da Receita.", 403);
  return daSessao;
}

// ---------- filtros (US-0003) ----------
// Cada valor vem de uma lista fechada (src/lib/prospecting/filtrosReceita.ts): o que chega
// do cliente só vira parâmetro, nunca texto de SQL. Valor fora da lista = 400.

const SETORES = new Set("ABCDEFGHIJKLMNOPQRSTU".split(""));
const UFS = new Set(["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"]);
const CAPITAIS = new Set([0, 1_000_000, 10_000_000, 50_000_000, 100_000_000]);
/** Faixas da distância de Formiga, em km (US-0015); 0 = qualquer. */
const DISTANCIAS = new Set([0, 50, 100, 200, 300, 500]);
const MAX_CNAES = 20;

const IDADES: Record<string, string> = {
  ate3: "e.data_inicio_atividade > current_date - interval '3 years'",
  "3a10": "e.data_inicio_atividade <= current_date - interval '3 years' AND e.data_inicio_atividade > current_date - interval '10 years'",
  "10a20": "e.data_inicio_atividade <= current_date - interval '10 years' AND e.data_inicio_atividade > current_date - interval '20 years'",
  "20a40": "e.data_inicio_atividade <= current_date - interval '20 years' AND e.data_inicio_atividade > current_date - interval '40 years'",
  mais40: "e.data_inicio_atividade <= current_date - interval '40 years'",
};

const FUNCIONARIOS: Record<string, string> = {
  ate19: "e.funcionarios < 20",
  "20a49": "e.funcionarios BETWEEN 20 AND 49",
  "50a99": "e.funcionarios BETWEEN 50 AND 99",
  "100a249": "e.funcionarios BETWEEN 100 AND 249",
  "250a499": "e.funcionarios BETWEEN 250 AND 499",
  "500mais": "e.funcionarios >= 500",
  sem: "e.funcionarios IS NULL",
};

// Natureza jurídica da Receita: 2xxx empresas, 3xxx sem fins lucrativos, 4xxx pessoa física,
// 5xxx organizações internacionais. 1xxx (administração pública) saiu do recorte.
const NATUREZAS: Record<string, string> = {
  limitada: "e.natureza_juridica = '2062'",
  sa_fechada: "e.natureza_juridica = '2054'",
  sa_aberta: "e.natureza_juridica = '2046'",
  outras_empresas: "(e.natureza_juridica LIKE '2%' OR e.natureza_juridica LIKE '5%') AND e.natureza_juridica NOT IN ('2062', '2054', '2046')",
  associacoes: "e.natureza_juridica LIKE '3%'",
  pessoa_fisica: "e.natureza_juridica LIKE '4%'",
};

// Faixas do tipo de conta (US-0006, US-0016), pelo valor estimado; o piso conta como R$ 4,8 mi.
// Acima de R$ 10 mi nunca há piso: dizer isso deixa o banco usar o índice parcial das
// estimadas (Âncora: de 1,6 s para menos de 0,1 s).
const SO_ESTIMADAS = "e.faturamento_base IS DISTINCT FROM 'piso'";
const FATURAMENTOS: Record<string, string> = {
  ate10: "e.faturamento_estimado < 10000000",
  satelite: `${SO_ESTIMADAS} AND e.faturamento_estimado >= 10000000 AND e.faturamento_estimado < 100000000`,
  ponte: `${SO_ESTIMADAS} AND e.faturamento_estimado >= 100000000 AND e.faturamento_estimado < 300000000`,
  ancora: `${SO_ESTIMADAS} AND e.faturamento_estimado >= 300000000`,
};

/** A faixa em que cai o piso do porte (R$ 4,8 mi). */
const FAIXA_DO_PISO = "ate10";

const DIVIDAS: Record<string, string | null> = {
  qualquer: null,
  sem: "e.divida_total IS NULL",
  sem_ajuizada: "coalesce(e.divida_ajuizada, 0) = 0",
  com: "e.divida_total IS NOT NULL",
};

interface Filtros {
  setores: string[];
  ramos: string[];
  cnaes: string[];
  secundaria: boolean;
  idades: string[];
  ufs: string[];
  funcionarios: string[];
  faturamentos: string[];
  capitalMinimo: number;
  distanciaMaxima: number;
  naturezas: string[];
  divida: string;
  comEmail: boolean;
  comTelefone: boolean;
}

function listaDe(valor: unknown, aceito: (v: string) => boolean, nome: string): string[] {
  if (valor === undefined) return [];
  if (!Array.isArray(valor) || !valor.every((v) => typeof v === "string" && aceito(v))) {
    throw new Recusa(`Filtro inválido: ${nome}.`, 400);
  }
  return [...new Set(valor as string[])];
}

const chaveDe = (mapa: Record<string, unknown>) => (v: string) => Object.hasOwn(mapa, v);

function lerAtividade(f: Record<string, unknown>) {
  const cnaes = listaDe(f.cnaes, (v) => /^\d{2,7}$/.test(v), "CNAE");
  if (cnaes.length > MAX_CNAES) throw new Recusa(`Escolha até ${MAX_CNAES} CNAEs.`, 400);
  return {
    setores: listaDe(f.setores, (v) => SETORES.has(v), "setor"),
    ramos: listaDe(f.ramos, (v) => /^\d{2}$/.test(v), "ramo"),
    cnaes,
    secundaria: f.secundaria === true,
  };
}

function lerFiltros(valor: unknown): Filtros {
  const f = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  const capitalMinimo = Number(f.capitalMinimo ?? 0);
  const distanciaMaxima = Number(f.distanciaMaxima ?? 0);
  const divida = String(f.divida ?? "qualquer");
  if (!CAPITAIS.has(capitalMinimo)) throw new Recusa("Filtro inválido: capital social.", 400);
  if (!DISTANCIAS.has(distanciaMaxima)) throw new Recusa("Filtro inválido: distância de Formiga.", 400);
  if (!Object.hasOwn(DIVIDAS, divida)) throw new Recusa("Filtro inválido: dívida ativa.", 400);
  return {
    ...lerAtividade(f),
    idades: listaDe(f.idades, chaveDe(IDADES), "idade"),
    ufs: listaDe(f.ufs, (v) => UFS.has(v), "estado"),
    funcionarios: listaDe(f.funcionarios, chaveDe(FUNCIONARIOS), "funcionários"),
    faturamentos: listaDe(f.faturamentos, chaveDe(FATURAMENTOS), "faturamento estimado"),
    capitalMinimo,
    distanciaMaxima,
    naturezas: listaDe(f.naturezas, chaveDe(NATUREZAS), "natureza jurídica"),
    divida,
    comEmail: f.comEmail === true,
    comTelefone: f.comTelefone === true,
  };
}

/** Monta o WHERE com parâmetros numerados a partir de `inicio`. */
class Condicoes {
  readonly partes: string[] = [];
  readonly valores: unknown[] = [];
  constructor(private readonly inicio = 1) {}
  param(valor: unknown): string {
    this.valores.push(valor);
    return `$${this.inicio + this.valores.length - 1}`;
  }
  e(parte: string | null) {
    if (parte) this.partes.push(parte);
  }
  where(): string {
    return this.partes.length ? `WHERE ${this.partes.map((p) => `(${p})`).join(" AND ")}` : "";
  }
}

const ou = (mapa: Record<string, string | null>, chaves: string[]) =>
  chaves.length ? chaves.map((k) => `(${mapa[k]})`).join(" OR ") : null;

// Os CNAEs escolhidos podem ser começo de código ("2062"); viram a lista de códigos inteiros
// pela tabela da base, para usar os índices de pulse.empresas.
const codigosDe = (prefixos: string) => `ARRAY(SELECT codigo FROM public.cnaes WHERE codigo LIKE ANY(${prefixos}))`;

/** Setor/ramo e CNAE; cada um só pelo principal, ou também pelos secundários. */
function atividade(f: Filtros, c: Condicoes): { principal: string[]; completa: string[] } {
  const principal: string[] = [];
  const completa: string[] = [];
  const somar = (doPrincipal: string, dosSecundarios: string) => {
    principal.push(doPrincipal);
    completa.push(f.secundaria ? `${doPrincipal} OR ${dosSecundarios}` : doPrincipal);
  };
  // O ramo refina o setor: com ramo marcado, vale o ramo (que é sempre de um setor marcado).
  if (f.ramos.length) {
    const r = c.param(f.ramos);
    somar(`e.divisao = ANY(${r}::text[])`, `e.divisoes_sec && ${r}::text[]`);
  } else if (f.setores.length) {
    const s = c.param(f.setores);
    somar(`e.secao = ANY(${s}::text[])`, `e.secoes_sec && ${s}::text[]`);
  }
  if (f.cnaes.length) {
    const codigos = codigosDe(`${c.param(f.cnaes.map((p) => `${p}%`))}::text[]`);
    somar(`e.cnae_principal = ANY(${codigos}::bpchar[])`, `e.cnaes_secundarios && ${codigos}::bpchar[]`);
  }
  return { principal, completa };
}

function condicoes(f: Filtros, inicio: number, extra?: (c: Condicoes) => string) {
  const c = new Condicoes(inicio);
  if (extra) c.e(extra(c));
  const { principal, completa } = atividade(f, c);
  completa.forEach((parte) => c.e(parte));
  c.e(ou(IDADES, f.idades));
  if (f.ufs.length) c.e(`e.uf = ANY(${c.param(f.ufs)}::bpchar[])`);
  c.e(ou(FUNCIONARIOS, f.funcionarios));
  c.e(ou(FATURAMENTOS, f.faturamentos));
  if (f.capitalMinimo > 0) c.e(`e.capital_social >= ${c.param(f.capitalMinimo)}`);
  if (f.distanciaMaxima > 0) c.e(`e.distancia_km <= ${c.param(f.distanciaMaxima)}`);
  c.e(ou(NATUREZAS, f.naturezas));
  c.e(DIVIDAS[f.divida]);
  if (f.comEmail) c.e("e.tem_email");
  if (f.comTelefone) c.e("e.tem_telefone");
  // "Entrou pela atividade secundária": casou no filtro, mas não pelo CNAE principal.
  const pelaSecundaria = f.secundaria && principal.length ? `NOT (${principal.map((p) => `(${p})`).join(" AND ")})` : "false";
  return { where: c.where(), valores: c.valores, pelaSecundaria };
}

// ---------- busca (US-0005) ----------
// A mesma regra está em src/lib/prospecting/buscaReceita.ts, que decide o que a tela manda.

const BUSCA_MINIMA = 3;
const CNPJ_MINIMO = 5;
const BUSCA_MAXIMA = 100;

type Busca = { tipo: "cnpj"; digitos: string } | { tipo: "texto"; termo: string };

function lerBusca(valor: unknown): Busca | null {
  if (valor === undefined || valor === null || valor === "") return null;
  if (typeof valor !== "string" || valor.length > BUSCA_MAXIMA) throw new Recusa("Busca inválida.", 400);
  const texto = valor.trim().replace(/\s+/g, " ");
  const digitos = texto.replace(/[\s./-]/g, "");
  if (/^\d+$/.test(digitos)) {
    if (digitos.length < CNPJ_MINIMO || digitos.length > 14) throw new Recusa(`Digite de ${CNPJ_MINIMO} a 14 números do CNPJ.`, 400);
    return { tipo: "cnpj", digitos };
  }
  if (texto.length < BUSCA_MINIMA) throw new Recusa(`Digite ao menos ${BUSCA_MINIMA} letras.`, 400);
  return { tipo: "texto", termo: texto };
}

/** O próximo número com a mesma quantidade de dígitos ("17469" → "17470"); nulo se for só 9. */
function seguinte(digitos: string): string | null {
  const proximo = (BigInt(digitos) + 1n).toString().padStart(digitos.length, "0");
  return proximo.length > digitos.length ? null : proximo;
}

/**
 * Começo do CNPJ por intervalo, não por LIKE: com a collation da base (en_US), o LIKE não usa a
 * chave primária (3,3 s medidos); o intervalo usa (26 ms). Os 14 dígitos procuram a raiz:
 * filial e matriz têm a mesma, e a base só tem matrizes.
 */
function porCnpj(digitos: string, c: Condicoes): string {
  if (digitos.length === 14) return `e.cnpj_basico = ${c.param(digitos.slice(0, 8))}`;
  const ate = seguinte(digitos);
  const desde = `e.cnpj >= ${c.param(digitos)}::bpchar`;
  return ate ? `${desde} AND e.cnpj < ${c.param(ate)}::bpchar` : desde;
}

// Mesma expressão dos índices de scripts/receita/vps/esquema.sql: se mudar lá, muda aqui.
const NOME_NORMALIZADO = "pulse.normalizar(coalesce(e.nome_fantasia, '') || ' ' || e.razao_social)";
const CIDADE_NORMALIZADA = "pulse.normalizar(e.municipio)";

/** `%` e `_` digitados valem como texto, não como curinga do LIKE. */
const literalDoLike = (termo: string) => termo.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Parte do nome, ou o nome inteiro da cidade ("sao" não traz São Paulo inteira). */
function porTexto(termo: string, c: Condicoes): string {
  const t = c.param(termo);
  const like = c.param(`%${literalDoLike(termo)}%`);
  return `${NOME_NORMALIZADO} LIKE pulse.normalizar(${like}) OR ${CIDADE_NORMALIZADA} = pulse.normalizar(${t})`;
}

/** CNPJ ignora os filtros; nome e cidade somam aos filtros. */
function condicoesDaBusca(filtros: Filtros, busca: Busca | null, inicio: number) {
  if (busca?.tipo === "cnpj") {
    const c = new Condicoes(inicio);
    c.e(porCnpj(busca.digitos, c));
    return { where: c.where(), valores: c.valores, pelaSecundaria: "false" };
  }
  return condicoes(filtros, inicio, busca ? (c) => porTexto(busca.termo, c) : undefined);
}

// ---------- pedidos ----------

type Pedido =
  | { modo: "pagina"; ordem: string; porFaturamento: boolean; crescente: boolean; pagina: number; filtros: Filtros; busca: Busca | null }
  | { modo: "total"; filtros: Filtros; busca: Busca | null }
  | { modo: "cnaes"; termo: string }
  | { modo: "ficha"; cnpj: string };

function lerPagina(corpo: Record<string, unknown>, filtros: Filtros, busca: Busca | null): Pedido {
  const ordem = `${corpo.ordem ?? "fit"}:${corpo.crescente === true ? "asc" : "desc"}`;
  const pagina = Number(corpo.pagina ?? 0);
  if (!ORDENS[ordem]) throw new Recusa("Ordem desconhecida.", 400);
  if (!Number.isInteger(pagina) || pagina < 0 || pagina > ULTIMA_PAGINA) {
    throw new Recusa("A lista vai até as 10 mil primeiras empresas. Use os filtros.", 400);
  }
  const porFaturamento = corpo.ordem === "faturamento";
  return { modo: "pagina", ordem: ORDENS[ordem], porFaturamento, crescente: corpo.crescente === true, pagina, filtros, busca };
}

function lerTermo(corpo: Record<string, unknown>): Pedido {
  const termo = String(corpo.termo ?? "").trim();
  if (termo.length < 2 || termo.length > 60) throw new Recusa("Digite de 2 a 60 caracteres.", 400);
  return { modo: "cnaes", termo };
}

function lerCnpjDaFicha(corpo: Record<string, unknown>): Pedido {
  const cnpj = String(corpo.cnpj ?? "");
  if (!/^\d{14}$/.test(cnpj)) throw new Recusa("CNPJ inválido.", 400);
  return { modo: "ficha", cnpj };
}

async function lerPedido(req: Request): Promise<Pedido> {
  const corpo = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (corpo.modo === "cnaes") return lerTermo(corpo);
  if (corpo.modo === "ficha") return lerCnpjDaFicha(corpo);
  const filtros = lerFiltros(corpo.filtros);
  const busca = lerBusca(corpo.busca);
  if (corpo.modo === "total") return { modo: "total", filtros, busca };
  return lerPagina(corpo, filtros, busca);
}

// ---------- consultas ----------

type Cliente = Awaited<ReturnType<Pool["connect"]>>;

async function lerBase(cliente: Cliente) {
  const base = await cliente.queryObject<{ total: number; carregada_em: Date }>("SELECT total, carregada_em FROM pulse.base WHERE id");
  return base.rows[0] ?? null;
}

const e_ = (where: string, condicao: string) => (where ? `${where} AND ${condicao}` : `WHERE ${condicao}`);

/**
 * As empresas da página, já ordenadas. Por faturamento (US-0006), em duas partes: 9 em cada
 * 10 empresas têm só o piso do porte (todas com o mesmo valor), e um filtro cujas empresas
 * são quase todas de piso fazia o índice de faturamento ser lido inteiro antes de achar a
 * primeira (5 s, medido em 17/11/2026). Primeiro as estimadas, pelo índice; depois as de
 * piso, pelo CNPJ — o mesmo desempate da ordem. Se a faixa marcada não inclui o piso, a
 * segunda parte não roda.
 */
function empresasDaPagina(p: Extract<Pedido, { modo: "pagina" }>, where: string, pelaSecundaria: string, poucas: boolean): string {
  const colunas = `e.*, ${pelaSecundaria} AS pela_secundaria`;
  if (poucas) {
    return `WITH filtradas AS MATERIALIZED (SELECT ${colunas} FROM pulse.empresas e ${where})
            SELECT * FROM filtradas e ORDER BY ${p.ordem} LIMIT $1 OFFSET $2`;
  }
  if (!p.porFaturamento) {
    return `SELECT ${colunas} FROM pulse.empresas e ${where} ORDER BY ${p.ordem} LIMIT $1 OFFSET $2`;
  }
  const ate = "($1::int + $2::int)";
  const estimadas = `SELECT ${colunas} FROM pulse.empresas e ${e_(where, SO_ESTIMADAS)} ORDER BY ${p.ordem} LIMIT ${ate}`;
  const piso = `SELECT ${colunas} FROM pulse.empresas e ${e_(where, "e.faturamento_base = 'piso'")} ORDER BY e.cnpj ${p.crescente ? "ASC" : "DESC"} LIMIT ${ate}`;
  const comPiso = !p.filtros.faturamentos.length || p.filtros.faturamentos.includes(FAIXA_DO_PISO);
  const partes = comPiso ? `(${estimadas}) UNION ALL (${piso})` : `(${estimadas})`;
  return `SELECT * FROM (${partes}) e ORDER BY ${p.ordem} LIMIT $1 OFFSET $2`;
}

type LinhaDaPagina = Record<string, unknown> & { cnpj: string };

/**
 * O faturamento que o time informou na Prospecção prevalece sobre a estimativa (US-0006): é o
 * único jeito de acertar quem fatura muito acima da média do ramo. Lido com a sessão da
 * pessoa, então a RLS só deixa ver as empresas do tenant dela. Falha aqui não derruba a lista.
 */
async function comFaturamentoDoTime(sessao: SupabaseClient, linhas: LinhaDaPagina[]): Promise<LinhaDaPagina[]> {
  if (!linhas.length) return linhas;
  const { data, error } = await sessao
    .from("prospect_companies")
    .select("cnpj, faturamento_anual, faturamento_anual_base")
    .in("cnpj", linhas.map((l) => l.cnpj.trim()))
    .not("faturamento_anual", "is", null);
  if (error || !data) return linhas;
  const doTime = new Map(data.map((r) => [r.cnpj as string, r]));
  return linhas.map((l) => {
    const t = doTime.get(l.cnpj.trim());
    return t ? { ...l, faturamento_informado: Number(t.faturamento_anual), faturamento_informado_base: t.faturamento_anual_base } : l;
  });
}

// Até aqui, a página separa as empresas filtradas antes de ordenar.
const POUCAS = 20_000;

/**
 * Com um filtro ou busca que pega poucas empresas, ordenar pelo índice faz o banco percorrer
 * a tabela inteira até achá-las (busca "belo horizonte" por distância: 5 s; até 100 km por
 * faturamento: 3 s, medido em 18/11/2026). Contar até 20 mil é rápido (36 ms) e decide o
 * caminho: poucas, separa e ordena só elas; muitas, o índice acha as primeiras logo.
 */
async function saoPoucas(cliente: Cliente, pedido: Extract<Pedido, { modo: "pagina" }>): Promise<boolean> {
  const { where, valores } = condicoesDaBusca(pedido.filtros, pedido.busca, 1);
  if (!where) return false;
  const r = await cliente.queryObject<{ n: bigint }>(
    `SELECT count(*) AS n FROM (SELECT 1 FROM pulse.empresas e ${where} LIMIT ${POUCAS + 1}) x`,
    valores,
  );
  return Number(r.rows[0]?.n ?? 0) <= POUCAS;
}

async function pagina(cliente: Cliente, pedido: Extract<Pedido, { modo: "pagina" }>, sessao: SupabaseClient) {
  const { ordem, pagina, filtros, busca } = pedido;
  const { where, valores, pelaSecundaria } = condicoesDaBusca(filtros, busca, 3);
  const poucas = await saoPoucas(cliente, pedido);
  const linhas = await cliente.queryObject(
    `SELECT e.cnpj, e.razao_social, e.nome_fantasia, e.cnae_principal, c.descricao AS cnae_descricao,
          e.municipio, e.uf, e.data_inicio_atividade::text AS data_inicio_atividade, e.capital_social::float8 AS capital_social, e.distancia_km, e.funcionarios,
          e.divida_total::float8 AS divida_total, e.divida_ajuizada::float8 AS divida_ajuizada,
          e.fit_previo, e.fit_frente, e.faturamento_estimado::float8 AS faturamento_estimado, e.faturamento_base, e.pela_secundaria
     FROM (${empresasDaPagina(pedido, where, pelaSecundaria, poucas)}) e
     LEFT JOIN public.cnaes c ON c.codigo = e.cnae_principal
    ORDER BY ${ordem}`,
    [POR_PAGINA, pagina * POR_PAGINA, ...valores],
  );
  const base = await lerBase(cliente);
  const comDoTime = await comFaturamentoDoTime(sessao, linhas.rows as LinhaDaPagina[]);
  return { carregada_em: base?.carregada_em ?? null, total_da_base: base?.total ?? null, linhas: comDoTime };
}

// A contagem para em 100 mil: a lista navega só até 10 mil, e contar 2 milhões passaria de 2 s.
const TETO_DA_CONTAGEM = 100_000;

async function total(cliente: Cliente, { filtros, busca }: Extract<Pedido, { modo: "total" }>) {
  const { where, valores } = condicoesDaBusca(filtros, busca, 2);
  if (!where) {
    const base = await lerBase(cliente);
    return { total: base?.total ?? null, limitado: false };
  }
  const r = await cliente.queryObject<{ n: bigint }>(
    `SELECT count(*) AS n FROM (SELECT 1 FROM pulse.empresas e ${where} LIMIT $1) x`,
    [TETO_DA_CONTAGEM + 1, ...valores],
  );
  const n = Number(r.rows[0]?.n ?? 0);
  return { total: Math.min(n, TETO_DA_CONTAGEM), limitado: n > TETO_DA_CONTAGEM };
}

// Sem extensão unaccent na base: tira os acentos dos dois lados para "fabricacao" achar "Fabricação".
const SEM_ACENTO = (expr: string) => `translate(lower(${expr}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')`;

async function cnaes(cliente: Cliente, { termo }: Extract<Pedido, { modo: "cnaes" }>) {
  const digitos = termo.replace(/\D/g, "");
  const porCodigo = digitos.length >= 2 && digitos.length === termo.replace(/[\s.\-/]/g, "").length;
  const r = await cliente.queryObject<{ codigo: string; descricao: string }>(
    porCodigo
      ? "SELECT codigo, descricao FROM public.cnaes WHERE codigo LIKE $1 ORDER BY codigo LIMIT 20"
      : `SELECT codigo, descricao FROM public.cnaes WHERE ${SEM_ACENTO("descricao")} LIKE '%' || ${SEM_ACENTO("$1")} || '%' ORDER BY codigo LIMIT 20`,
    [porCodigo ? `${digitos}%` : termo],
  );
  return { cnaes: r.rows };
}

// ---------- ficha (US-0007) ----------

const FICHA = `SELECT e.cnpj, e.razao_social, e.nome_fantasia, e.cnae_principal, c.descricao AS cnae_descricao,
    e.cnaes_secundarios::text[] AS cnaes_secundarios,
    coalesce((SELECT json_agg(json_build_object('codigo', s, 'descricao', cs.descricao) ORDER BY s)
              FROM unnest(e.cnaes_secundarios) s LEFT JOIN public.cnaes cs ON cs.codigo = s), '[]') AS secundarias,
    e.natureza_juridica, n.descricao AS natureza_descricao,
    e.capital_social::float8 AS capital_social, e.data_inicio_atividade::text AS data_inicio_atividade,
    e.municipio, e.uf, e.distancia_km, e.funcionarios, e.unidades_com_funcionarios, e.filiais_ativas, e.socios,
    e.divida_total::float8 AS divida_total, e.divida_em_cobranca::float8 AS divida_em_cobranca,
    e.divida_ajuizada::float8 AS divida_ajuizada, e.inscricoes_divida, e.tem_email, e.tem_telefone,
    e.fit_previo, e.fit_frente, e.faturamento_estimado::float8 AS faturamento_estimado, e.faturamento_base
  FROM pulse.empresas e
  LEFT JOIN public.cnaes c ON c.codigo = e.cnae_principal
  LEFT JOIN public.naturezas_juridicas n ON n.codigo = e.natureza_juridica
  WHERE e.cnpj = $1`;

// Sócios pela visão pulse.socios (só nome, qualificação, entrada, tipo e CNPJ de sócio
// empresa; ADR-0041). Quem administra vem primeiro.
const ADMINISTRAM = ["49", "05", "10", "16", "28", "65", "50"];
const SOCIOS = `SELECT nome, qualificacao_codigo, entrada::text AS entrada, tipo, cnpj
  FROM pulse.socios WHERE cnpj_basico = $1
  ORDER BY array_position($2::text[], qualificacao_codigo::text) NULLS LAST, entrada NULLS LAST, nome
  LIMIT 50`;

// Etapas que encerram a oportunidade: a ficha só mostra as que estão em andamento.
const ETAPAS_ENCERRADAS = "(ganho,descartado,sem_resposta,convertido)";

/** Oportunidades em andamento da empresa na Prospecção, lidas com a RLS da pessoa. */
async function oportunidadesDaEmpresa(sessao: SupabaseClient, cnpj: string) {
  const { data: empresas, error } = await sessao.from("prospect_companies").select("id").eq("cnpj", cnpj);
  if (error || !empresas?.length) return [];
  const { data } = await sessao
    .from("prospects")
    .select("id, title, stage, owner_id")
    .in("company_id", empresas.map((e) => e.id))
    .not("stage", "in", ETAPAS_ENCERRADAS);
  return data ?? [];
}

async function ficha(cliente: Cliente, { cnpj }: Extract<Pedido, { modo: "ficha" }>, sessao: SupabaseClient) {
  const r = await cliente.queryObject<LinhaDaPagina>(FICHA, [cnpj]);
  if (!r.rows.length) throw new Recusa("Empresa não encontrada na base.", 404);
  const [empresa] = await comFaturamentoDoTime(sessao, r.rows);
  const socios = await cliente.queryObject(SOCIOS, [cnpj.slice(0, 8), ADMINISTRAM]);
  const contato = await cliente.queryObject("SELECT email, telefone_1, telefone_2 FROM pulse.contatos WHERE cnpj = $1", [cnpj]);
  return { empresa, contato: contato.rows[0] ?? null, socios: socios.rows, oportunidades: await oportunidadesDaEmpresa(sessao, cnpj) };
}

async function responder(pedido: Pedido, sessao: SupabaseClient) {
  const cliente = await baseDaReceita().connect();
  try {
    if (pedido.modo === "total") return await total(cliente, pedido);
    if (pedido.modo === "cnaes") return await cnaes(cliente, pedido);
    if (pedido.modo === "ficha") return await ficha(cliente, pedido, sessao);
    return await pagina(cliente, pedido, sessao);
  } finally {
    cliente.release();
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sessao = await exigirLeitura(req);
    return json(await comPrazo(responder(await lerPedido(req), sessao)), 200);
  } catch (erro) {
    if (erro instanceof Recusa) return json({ error: erro.message }, erro.status);
    // Só o nome do erro: a mensagem do driver pode trazer o endereço da VPS.
    console.error("empresas-receita: base indisponível", (erro as Error)?.name);
    return json({ error: "A base da Receita está indisponível agora." }, 503);
  }
});
