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
//   pagina (padrão): { ordem, crescente, pagina, filtros, busca? } → { carregada_em, total_da_base, linhas[] (com relacao e parceiro), relacao_indisponivel }
//   total:           { modo: 'total', filtros, busca? }            → { total, limitado }  (conta até 100 mil)
//   cnaes:           { modo: 'cnaes', termo }                      → { cnaes: [{ codigo, descricao }] }
//   ficha:           { modo: 'ficha', cnpj }                       → { empresa, contato, socios[], oportunidades[], relacao, historico, parceiro }  (US-0007, US-0019, US-0051)
// A página e o total vêm separados: a lista aparece sem esperar a contagem.
// `busca` (US-0005): só números, a partir de 5, procura o começo do CNPJ e ignora os filtros
// (os 14 de uma filial acham a matriz); outro texto, a partir de 3 letras, procura no nome e
// no nome inteiro da cidade.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { ESCONDIDAS_POR_PADRAO, PARCEIRO, raizDoCnpj, RELACOES, relacaoDaEmpresa } from "../_shared/relacao.ts";
import type { DadosDaRelacao, DecisaoDaRelacao, RelacaoDaEmpresa } from "../_shared/relacaoTipos.ts";

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
// US-0014: o fit de cada serviço tem coluna e índice próprios; "fit" sem serviço é a maior nota.
const SERVICOS_DO_FIT = ["studio", "lei_do_bem", "captacao", "consultoria"] as const;
const SERVICO_DO_FIT_VALIDO = new Set<string>(SERVICOS_DO_FIT);
const FITS_MINIMOS = new Set([0, 40, 60, 80]);
const colunaDoFit = (servico: string | null) => (servico && SERVICO_DO_FIT_VALIDO.has(servico) ? `e.fit_${servico}` : "e.fit_previo");
const ordensDoFit = (servico: string | null) => ({
  [`fit${servico ? `_${servico}` : ""}:desc`]: `${colunaDoFit(servico)} DESC, e.funcionarios DESC NULLS LAST, e.cnpj DESC`,
  [`fit${servico ? `_${servico}` : ""}:asc`]: `${colunaDoFit(servico)} ASC, e.funcionarios ASC NULLS FIRST, e.cnpj ASC`,
});

const ORDENS: Record<string, string> = {
  ...ordensDoFit(null),
  ...Object.assign({}, ...SERVICOS_DO_FIT.map(ordensDoFit)),
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
  // Capital social (18/11/2026): zero é "não declarado" e fica no fim, com os nulos.
  "capital:desc": "nullif(e.capital_social, 0) DESC NULLS LAST, e.cnpj DESC",
  "capital:asc": "nullif(e.capital_social, 0) ASC NULLS LAST, e.cnpj ASC",
  // Relação com a Origami (US-0019): grupo_relacao vem calculado na página (1 = cliente ativo …
  // 4 = abordada sem sucesso, 5 = sem relação); dentro do grupo, pelo fit.
  "relacao:desc": "e.grupo_relacao ASC, e.fit_previo DESC, e.funcionarios DESC NULLS LAST, e.cnpj DESC",
  "relacao:asc": "e.grupo_relacao DESC, e.fit_previo DESC, e.funcionarios DESC NULLS LAST, e.cnpj DESC",
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
/** Distância máxima de Formiga, em km inteiros, escolhida pela pessoa (US-0040); 0 = qualquer. */
const DISTANCIA_MAXIMA = 3300;
/** CNAEs escolhidos, somando os incluídos e os tirados (US-0041). */
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
  /** Atividades tiradas da lista, só pela principal (US-0041). */
  semSetores: string[];
  semRamos: string[];
  semCnaes: string[];
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
  /** Relação com a Origami (US-0019). */
  relacoes: string[];
  /** O serviço cujo fit ordena e filtra (US-0014); nulo = a maior nota. */
  servicoDoFit: string | null;
  /** Nota mínima no fit desse serviço; 0 = qualquer. */
  fitMinimo: number;
  /** Raízes de CNPJ com as relações marcadas, calculadas antes da consulta; nulo sem filtro. */
  raizes: string[] | null;
  /** Sem filtro de relação: raízes descartadas ou em "Não agora", fora da lista (US-0010). */
  escondidas: string[] | null;
}

const RELACAO_VALIDA = new Set<string>([...RELACOES.map((r) => r.valor), PARCEIRO]);

function listaDe(valor: unknown, aceito: (v: string) => boolean, nome: string): string[] {
  if (valor === undefined) return [];
  if (!Array.isArray(valor) || !valor.every((v) => typeof v === "string" && aceito(v))) {
    throw new Recusa(`Filtro inválido: ${nome}.`, 400);
  }
  return [...new Set(valor as string[])];
}

const chaveDe = (mapa: Record<string, unknown>) => (v: string) => Object.hasOwn(mapa, v);

const ehCnae = (v: string) => /^\d{2,7}$/.test(v);
const ehRamo = (v: string) => /^\d{2}$/.test(v);
const ehSetor = (v: string) => SETORES.has(v);

function lerAtividade(f: Record<string, unknown>) {
  const cnaes = listaDe(f.cnaes, ehCnae, "CNAE");
  const semCnaes = listaDe(f.semCnaes, ehCnae, "CNAE tirado");
  if (cnaes.length + semCnaes.length > MAX_CNAES) throw new Recusa(`Escolha até ${MAX_CNAES} CNAEs.`, 400);
  return {
    setores: listaDe(f.setores, ehSetor, "setor"),
    ramos: listaDe(f.ramos, ehRamo, "ramo"),
    cnaes,
    secundaria: f.secundaria === true,
    semSetores: listaDe(f.semSetores, ehSetor, "setor tirado"),
    semRamos: listaDe(f.semRamos, ehRamo, "ramo tirado"),
    semCnaes,
  };
}

/** Inteiro de 0 a 3.300 km (US-0040); continua parâmetro, nunca texto de SQL. */
function lerDistancia(valor: unknown): number {
  const km = Number(valor ?? 0);
  if (!Number.isInteger(km) || km < 0 || km > DISTANCIA_MAXIMA) throw new Recusa("Filtro inválido: distância de Formiga.", 400);
  return km;
}

function lerFiltros(valor: unknown): Filtros {
  const f = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  const capitalMinimo = Number(f.capitalMinimo ?? 0);
  const distanciaMaxima = lerDistancia(f.distanciaMaxima);
  const divida = String(f.divida ?? "qualquer");
  if (!CAPITAIS.has(capitalMinimo)) throw new Recusa("Filtro inválido: capital social.", 400);
  if (!Object.hasOwn(DIVIDAS, divida)) throw new Recusa("Filtro inválido: dívida ativa.", 400);
  const servicoDoFit = f.servicoDoFit == null ? null : String(f.servicoDoFit);
  const fitMinimo = Number(f.fitMinimo ?? 0);
  if (servicoDoFit !== null && !SERVICO_DO_FIT_VALIDO.has(servicoDoFit)) throw new Recusa("Filtro inválido: serviço do fit.", 400);
  if (!FITS_MINIMOS.has(fitMinimo)) throw new Recusa("Filtro inválido: fit mínimo.", 400);
  return {
    servicoDoFit,
    fitMinimo,
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
    relacoes: listaDe(f.relacoes, (v) => RELACAO_VALIDA.has(v), "relação com a Origami"),
    raizes: null,
    escondidas: null,
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

/**
 * Atividades tiradas da lista (US-0041): sempre pela atividade principal, mesmo com a
 * secundária ligada. O coalesce evita que coluna nula vire "desconhecido" e suma da lista.
 */
function semAtividade(f: Filtros, c: Condicoes) {
  if (f.semSetores.length) c.e(`NOT (coalesce(e.secao, '') = ANY(${c.param(f.semSetores)}::text[]))`);
  if (f.semRamos.length) c.e(`NOT (coalesce(e.divisao, '') = ANY(${c.param(f.semRamos)}::text[]))`);
  if (f.semCnaes.length) {
    const codigos = codigosDe(`${c.param(f.semCnaes.map((p) => `${p}%`))}::text[]`);
    c.e(`NOT (coalesce(e.cnae_principal, '') = ANY(${codigos}::bpchar[]))`);
  }
}

function condicoes(f: Filtros, inicio: number, extra?: (c: Condicoes) => string) {
  const c = new Condicoes(inicio);
  if (extra) c.e(extra(c));
  const { principal, completa } = atividade(f, c);
  completa.forEach((parte) => c.e(parte));
  semAtividade(f, c);
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
  if (f.fitMinimo > 0) c.e(`${colunaDoFit(f.servicoDoFit)} >= ${c.param(f.fitMinimo)}`);
  if (f.raizes) c.e(f.raizes.length ? `e.cnpj_basico = ANY(${c.param(f.raizes)}::bpchar[])` : "false");
  if (f.escondidas?.length) c.e(`NOT (e.cnpj_basico = ANY(${c.param(f.escondidas)}::bpchar[]))`);
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
  | {
    modo: "pagina";
    ordem: string;
    porFaturamento: boolean;
    porRelacao: boolean;
    crescente: boolean;
    pagina: number;
    filtros: Filtros;
    busca: Busca | null;
  }
  | { modo: "total"; filtros: Filtros; busca: Busca | null }
  | { modo: "cnaes"; termo: string }
  | { modo: "ficha"; cnpj: string };

function lerNumeroDaPagina(corpo: Record<string, unknown>): number {
  const pagina = Number(corpo.pagina ?? 0);
  if (!Number.isInteger(pagina) || pagina < 0 || pagina > ULTIMA_PAGINA) {
    throw new Recusa("A lista vai até as 10 mil primeiras empresas. Use os filtros.", 400);
  }
  return pagina;
}

function lerPagina(corpo: Record<string, unknown>, filtros: Filtros, busca: Busca | null): Pedido {
  // Ordem por fit com um serviço escolhido: a coluna dele (US-0014).
  const nome = (corpo.ordem ?? "fit") === "fit" && filtros.servicoDoFit ? `fit_${filtros.servicoDoFit}` : corpo.ordem ?? "fit";
  const ordem = `${nome}:${corpo.crescente === true ? "asc" : "desc"}`;
  if (!ORDENS[ordem]) throw new Recusa("Ordem desconhecida.", 400);
  const pagina = lerNumeroDaPagina(corpo);
  const porFaturamento = corpo.ordem === "faturamento";
  const porRelacao = corpo.ordem === "relacao";
  return { modo: "pagina", ordem: ORDENS[ordem], porFaturamento, porRelacao, crescente: corpo.crescente === true, pagina, filtros, busca };
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
function empresasDaPagina(p: Extract<Pedido, { modo: "pagina" }>, where: string, pelaSecundaria: string, poucas: boolean, rel: SqlDaRelacao): string {
  const colunas = `e.*, ${pelaSecundaria} AS pela_secundaria, ${rel.grupo} AS grupo_relacao`;
  if (p.porRelacao && !poucas) return porRelacaoEmDuasPartes(p, where, colunas, rel);
  if (poucas) {
    return `WITH filtradas AS MATERIALIZED (SELECT ${colunas} FROM pulse.empresas e ${where})
            SELECT * FROM filtradas e ORDER BY ${p.ordem} LIMIT $1 OFFSET $2`;
  }
  if (!p.porFaturamento) {
    return `SELECT ${colunas} FROM pulse.empresas e ${where} ORDER BY ${p.ordem} LIMIT $1 OFFSET $2`;
  }
  return porFaturamentoEmDuasPartes(p, where, colunas);
}

function porFaturamentoEmDuasPartes(p: Extract<Pedido, { modo: "pagina" }>, where: string, colunas: string): string {
  const ate = "($1::int + $2::int)";
  const estimadas = `SELECT ${colunas} FROM pulse.empresas e ${e_(where, SO_ESTIMADAS)} ORDER BY ${p.ordem} LIMIT ${ate}`;
  const piso = `SELECT ${colunas} FROM pulse.empresas e ${e_(where, "e.faturamento_base = 'piso'")} ORDER BY e.cnpj ${p.crescente ? "ASC" : "DESC"} LIMIT ${ate}`;
  const comPiso = !p.filtros.faturamentos.length || p.filtros.faturamentos.includes(FAIXA_DO_PISO);
  const partes = comPiso ? `(${estimadas}) UNION ALL (${piso})` : `(${estimadas})`;
  return `SELECT * FROM (${partes}) e ORDER BY ${p.ordem} LIMIT $1 OFFSET $2`;
}

/** Grupo da relação de cada empresa, em SQL, a partir das raízes de cada relação (parâmetros). */
interface SqlDaRelacao {
  grupo: string;
  /** Condição "tem relação com a Origami". */
  comRelacao: string;
  valores: unknown[];
}

const SEM_RELACAO = 5;

/** Fora da ordem por relação, o grupo é constante e não pesa na consulta. */
function sqlDaRelacao(relacoes: Map<string, RelacaoDaEmpresa> | null, porRelacao: boolean, inicio: number): SqlDaRelacao {
  if (!porRelacao) return { grupo: String(SEM_RELACAO), comRelacao: "false", valores: [] };
  const todas = [...(relacoes ?? new Map<string, RelacaoDaEmpresa>())];
  const grupos = RELACOES.map((r) => todas.filter(([, x]) => x.relacao === r.valor).map(([raiz]) => raiz));
  const param = (i: number) => "$" + String(inicio + i);
  const casos = grupos.map((_, i) => `WHEN e.cnpj_basico = ANY(${param(i)}::bpchar[]) THEN ${i + 1}`).join(" ");
  return {
    grupo: `CASE ${casos} ELSE ${SEM_RELACAO} END`,
    comRelacao: `e.cnpj_basico = ANY(${param(grupos.length)}::bpchar[])`,
    valores: [...grupos, grupos.flat()],
  };
}

/**
 * Por relação, sem um filtro que pegue poucas (US-0019): as empresas com relação são poucas e
 * saem pelo índice de cnpj_basico; as outras, pelo índice do fit. Como no faturamento, a parte
 * sem relação traz só até o fim da página, e o sentido da ordem decide qual parte vem antes.
 */
function porRelacaoEmDuasPartes(p: Extract<Pedido, { modo: "pagina" }>, where: string, colunas: string, rel: SqlDaRelacao): string {
  const ate = "($1::int + $2::int)";
  const comRelacao = `SELECT ${colunas} FROM pulse.empresas e ${e_(where, rel.comRelacao)}`;
  const semRelacao = `SELECT ${colunas} FROM pulse.empresas e ${e_(where, `NOT (${rel.comRelacao})`)}
    ORDER BY e.fit_previo DESC, e.funcionarios DESC NULLS LAST, e.cnpj DESC LIMIT ${ate}`;
  return `SELECT * FROM ((${comRelacao}) UNION ALL (${semRelacao})) e ORDER BY ${p.ordem} LIMIT $1 OFFSET $2`;
}

type LinhaDaPagina = Record<string, unknown> & { cnpj: string };

interface RegistroDoFaturamento {
  company_id: string;
  valor: number | null;
  base: string | null;
  informado_por: string | null;
  informado_em: string;
}

interface DoTimeNaEmpresa {
  id: string;
  cnpj: string;
  faturamento_anual: number | null;
  faturamento_anual_base: string | null;
  funcionarios_informados: number | null;
  /** US-0054: faixa do LinkedIn informada pelo time ("201-500"); não convive com o número exato. */
  funcionarios_faixa: string | null;
  /** US-0056: faixa, origem, confiança e fonte do que o time informou (só para a tela). */
  faturamento_min: number | null;
  faturamento_max: number | null;
  faturamento_confianca: string | null;
  faturamento_fonte: string | null;
  funcionarios_min: number | null;
  funcionarios_max: number | null;
  funcionarios_base: string | null;
  funcionarios_confianca: string | null;
  funcionarios_fonte: string | null;
  regime_tributario: string | null;
  regime_tributario_ano: number | null;
}

function comODoTime(l: LinhaDaPagina, t: DoTimeNaEmpresa | undefined, historico: Map<string, RegistroDoFaturamento[]>): LinhaDaPagina {
  if (!t) return l;
  const registros = (historico.get(t.id) ?? []).map(({ company_id: _, ...r }) => ({ ...r, valor: r.valor == null ? null : Number(r.valor) }));
  const faturamento = t.faturamento_anual == null
    ? {}
    : { faturamento_informado: Number(t.faturamento_anual), faturamento_informado_base: t.faturamento_anual_base };
  return {
    ...l,
    ...faturamento,
    funcionarios_informados: t.funcionarios_informados,
    funcionarios_faixa: t.funcionarios_faixa,
    faturamento_min: t.faturamento_min == null ? null : Number(t.faturamento_min),
    faturamento_max: t.faturamento_max == null ? null : Number(t.faturamento_max),
    faturamento_confianca: t.faturamento_confianca,
    faturamento_fonte: t.faturamento_fonte,
    funcionarios_min: t.funcionarios_min,
    funcionarios_max: t.funcionarios_max,
    funcionarios_base: t.funcionarios_base,
    funcionarios_confianca: t.funcionarios_confianca,
    funcionarios_fonte: t.funcionarios_fonte,
    regime_tributario: t.regime_tributario,
    regime_tributario_ano: t.regime_tributario_ano,
    faturamento_historico: registros,
  };
}

/**
 * O que o time informou na Prospecção prevalece sobre a base: o faturamento (US-0006), o único
 * jeito de acertar quem fatura muito acima da média do ramo, e os funcionários confirmados
 * (US-0020), que a tela usa no lugar da RAIS e no faturamento estimado; e o regime tributário
 * da BrasilAPI, que limita a estimativa no Lucro Presumido (US-0018), com o histórico de quem
 * informou o faturamento e quando, do mais novo para o mais antigo. Lido com a sessão da
 * pessoa, então a RLS só deixa ver as empresas do tenant dela. Falha aqui não derruba a lista.
 */
async function comFaturamentoDoTime(sessao: SupabaseClient, linhas: LinhaDaPagina[]): Promise<LinhaDaPagina[]> {
  if (!linhas.length) return linhas;
  const { data, error } = await sessao
    .from("prospect_companies")
    .select("id, cnpj, faturamento_anual, faturamento_anual_base, funcionarios_informados, funcionarios_faixa, faturamento_min, faturamento_max, faturamento_confianca, faturamento_fonte, funcionarios_min, funcionarios_max, funcionarios_base, funcionarios_confianca, funcionarios_fonte, regime_tributario, regime_tributario_ano")
    .in("cnpj", linhas.map((l) => l.cnpj.trim()))
    .or("faturamento_anual.not.is.null,funcionarios_informados.not.is.null,funcionarios_faixa.not.is.null,regime_tributario.not.is.null");
  if (error || !data) return linhas;
  const empresas = data as DoTimeNaEmpresa[];
  const doTime = new Map(empresas.map((r) => [r.cnpj, r]));
  const historico = await historicoDoFaturamento(sessao, empresas.map((r) => r.id));
  return linhas.map((l) => comODoTime(l, doTime.get(l.cnpj.trim()), historico));
}

// Últimas mudanças por empresa: o histórico raramente passa disso, e a lista só usa a primeira.
const REGISTROS_POR_EMPRESA = 10;

/** Quem informou o faturamento e quando (US-0018). Falha aqui só tira o histórico. */
async function historicoDoFaturamento(sessao: SupabaseClient, ids: string[]): Promise<Map<string, RegistroDoFaturamento[]>> {
  const porEmpresa = new Map<string, RegistroDoFaturamento[]>();
  if (!ids.length) return porEmpresa;
  const { data, error } = await sessao
    .from("prospect_company_faturamentos")
    .select("company_id, valor, base, informado_por, informado_em")
    .in("company_id", ids)
    .order("informado_em", { ascending: false });
  if (error || !data) return porEmpresa;
  for (const r of data as RegistroDoFaturamento[]) {
    const lista = porEmpresa.get(r.company_id) ?? [];
    if (lista.length < REGISTROS_POR_EMPRESA) porEmpresa.set(r.company_id, [...lista, r]);
  }
  return porEmpresa;
}

// ---------- relação com a Origami (US-0019) ----------

// O PostgREST devolve no máximo mil linhas por vez: lê de mil em mil.
const LOTE = 1000;

// deno-lint-ignore no-explicit-any
async function todas<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: any[] | null; error: unknown }>): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += LOTE) {
    const { data, error } = await consulta(de, de + LOTE - 1); // harness-ok: paginação, cada volta lê o lote seguinte
    if (error) throw error;
    linhas.push(...((data ?? []) as T[]));
    if (!data || data.length < LOTE) return linhas;
  }
}

interface EmpresaDoTenant { id: string; cnpj: string | null; client_id: string | null }
interface ClienteDoTenant { id: string; cnpj: string | null }
interface OportunidadeDoTenant {
  id: string; company_id: string; title: string | null; stage: string; owner_id: string | null;
  discard_reason: string | null; closed_at: string | null; discarded_at: string | null; won_on: string | null; created_at: string;
}
interface ProjetoDoTenant {
  id: string; name: string; status: string; client_id: string | null; prospect_id: string | null;
  start_date: string | null; end_date: string | null;
}

interface DecisaoDoTenant extends DecisaoDaRelacao { cnpj_raiz: string }

/** Parceiro e "Cliente antes do Pulse" (US-0051), pela raiz do CNPJ. */
interface MarcaDoTenant { cnpj_raiz: string; parceiro: boolean; cliente_antes_do_pulse: number | null }

const dia = (valor: string | null | undefined) => (valor ? valor.slice(0, 10) : null);

/** Lê clientes, empresas da Prospecção, oportunidades, projetos, decisões e marcas do tenant, com a RLS da pessoa. */
async function lerDoTenant(sessao: SupabaseClient) {
  const [empresas, clientes, oportunidades, projetos, decisoes, marcas] = await Promise.all([
    todas<EmpresaDoTenant>((de, ate) => sessao.from("prospect_companies").select("id, cnpj, client_id").not("cnpj", "is", null).range(de, ate)),
    todas<ClienteDoTenant>((de, ate) => sessao.from("clients").select("id, cnpj").not("cnpj", "is", null).range(de, ate)),
    todas<OportunidadeDoTenant>((de, ate) =>
      sessao.from("prospects")
        .select("id, company_id, title, stage, owner_id, discard_reason, closed_at, discarded_at, won_on, created_at")
        .range(de, ate)
    ),
    todas<ProjetoDoTenant>((de, ate) => sessao.from("projects").select("id, name, status, client_id, prospect_id, start_date, end_date").range(de, ate)),
    todas<DecisaoDoTenant>((de, ate) =>
      sessao.from("prospect_decisoes_da_base")
        .select("id, cnpj_raiz, decisao, motivo, texto, voltar_em, prospect_id, decidida_por, decidida_em")
        .is("desfeita_em", null)
        .range(de, ate)
    ),
    todas<MarcaDoTenant>((de, ate) =>
      sessao.from("prospect_marcas_da_empresa").select("cnpj_raiz, parceiro, cliente_antes_do_pulse").range(de, ate)
    ),
  ]);
  return { empresas, clientes, oportunidades, projetos, decisoes, marcas };
}

type DoTenant = Awaited<ReturnType<typeof lerDoTenant>>;

function dataDaOportunidade(o: OportunidadeDoTenant): string | null {
  return dia(o.closed_at ?? o.discarded_at ?? o.won_on ?? o.created_at);
}

/**
 * Junta tudo pela raiz do CNPJ: a base só tem matrizes, e o cliente pode estar cadastrado com o
 * CNPJ de uma filial (hipótese da US-0019). A ordem importa: clientes e empresas antes das
 * oportunidades, e elas antes dos projetos, que chegam pelo cliente ou pela oportunidade.
 */
class Agrupador {
  private readonly porRaiz = new Map<string, DadosDaRelacao>();
  private readonly projetosVistos = new Set<string>();
  private readonly raizDaEmpresa = new Map<string, string>();
  private readonly raizesDoCliente = new Map<string, Set<string>>();
  private readonly raizDaOportunidade = new Map<string, string>();

  private dados(raiz: string): DadosDaRelacao {
    const d = this.porRaiz.get(raiz) ?? { cliente: false, projetos: [], oportunidades: [] };
    this.porRaiz.set(raiz, d);
    return d;
  }

  private ligarCliente(clienteId: string, raiz: string) {
    this.raizesDoCliente.set(clienteId, (this.raizesDoCliente.get(clienteId) ?? new Set()).add(raiz));
    this.dados(raiz).cliente = true;
  }

  cliente(c: ClienteDoTenant) {
    const raiz = raizDoCnpj(c.cnpj);
    if (raiz) this.ligarCliente(c.id, raiz);
  }

  empresa(e: EmpresaDoTenant) {
    const raiz = raizDoCnpj(e.cnpj);
    if (!raiz) return;
    this.raizDaEmpresa.set(e.id, raiz);
    if (e.client_id) this.ligarCliente(e.client_id, raiz);
  }

  oportunidade(o: OportunidadeDoTenant) {
    const raiz = this.raizDaEmpresa.get(o.company_id);
    if (!raiz) return;
    this.raizDaOportunidade.set(o.id, raiz);
    const { id, title, stage, owner_id, discard_reason } = o;
    this.dados(raiz).oportunidades.push({ id, title, stage, owner_id, discard_reason, data: dataDaOportunidade(o) });
  }

  projeto(p: ProjetoDoTenant) {
    const raizes = new Set(this.raizesDoCliente.get(p.client_id ?? "") ?? []);
    const pelaOportunidade = this.raizDaOportunidade.get(p.prospect_id ?? "");
    if (pelaOportunidade) raizes.add(pelaOportunidade);
    const projeto = { id: p.id, name: p.name, status: p.status, data: dia(p.end_date ?? p.start_date) };
    raizes.forEach((raiz) => this.anotarProjeto(raiz, projeto));
  }

  /** Descartada ou "Não agora" (US-0010): uma valendo por empresa. */
  decisao({ cnpj_raiz, ...decisao }: DecisaoDoTenant) {
    this.dados(cnpj_raiz).decisao = decisao;
  }

  /** Parceiro e "Cliente antes do Pulse" (US-0051). */
  marca({ cnpj_raiz, parceiro, cliente_antes_do_pulse }: MarcaDoTenant) {
    const d = this.dados(cnpj_raiz);
    d.parceiro = parceiro;
    d.antesDoPulse = cliente_antes_do_pulse;
  }

  private anotarProjeto(raiz: string, projeto: DadosDaRelacao["projetos"][number]) {
    const chave = `${raiz}:${projeto.id}`;
    if (this.projetosVistos.has(chave)) return;
    this.projetosVistos.add(chave);
    this.dados(raiz).projetos.push(projeto);
  }

  resultado(): Map<string, DadosDaRelacao> {
    return this.porRaiz;
  }
}

function agrupar({ empresas, clientes, oportunidades, projetos, decisoes, marcas }: DoTenant): Map<string, DadosDaRelacao> {
  const g = new Agrupador();
  clientes.forEach((c) => g.cliente(c));
  empresas.forEach((e) => g.empresa(e));
  oportunidades.forEach((o) => g.oportunidade(o));
  projetos.forEach((p) => g.projeto(p));
  decisoes.forEach((d) => g.decisao(d));
  marcas.forEach((m) => g.marca(m));
  return g.resultado();
}

async function dadosDaRelacao(sessao: SupabaseClient): Promise<Map<string, DadosDaRelacao>> {
  return agrupar(await lerDoTenant(sessao));
}

/** A relação calculada de cada raiz e as raízes marcadas como Parceiro (US-0051). */
interface RelacoesDoTenant {
  porRaiz: Map<string, RelacaoDaEmpresa>;
  parceiros: Set<string>;
}

function relacoesPorRaiz(dados: Map<string, DadosDaRelacao>): RelacoesDoTenant {
  const hoje = new Date();
  const porRaiz = new Map<string, RelacaoDaEmpresa>();
  const parceiros = new Set<string>();
  for (const [raiz, d] of dados) {
    const r = relacaoDaEmpresa(d, hoje);
    if (r) porRaiz.set(raiz, r);
    if (d.parceiro) parceiros.add(raiz);
  }
  return { porRaiz, parceiros };
}

/** A relação de todas as empresas do tenant; nulo se a leitura falhar (cenário 9). */
async function relacoesSeguras(sessao: SupabaseClient): Promise<RelacoesDoTenant | null> {
  try {
    return relacoesPorRaiz(await dadosDaRelacao(sessao));
  } catch {
    return null;
  }
}

/**
 * Com o filtro de relação, a lista de raízes entra na consulta da VPS (índice de cnpj_basico).
 * Sem os dados do tenant, o filtro não acha ninguém, e a resposta avisa (cenário 9). Sem filtro
 * de relação, as descartadas e as em "Não agora" saem da lista (US-0010).
 */
function comRaizes(filtros: Filtros, relacoes: RelacoesDoTenant | null): Filtros {
  if (!filtros.relacoes.length) return { ...filtros, escondidas: escondidas(relacoes) };
  if (!relacoes) return { ...filtros, raizes: [] };
  const marcadas = new Set(filtros.relacoes);
  const pelaRelacao = [...relacoes.porRaiz].filter(([, r]) => marcadas.has(r.relacao)).map(([raiz]) => raiz);
  // "Parceiro" (US-0051) soma as empresas marcadas às das relações escolhidas.
  const parceiros = marcadas.has(PARCEIRO) ? [...relacoes.parceiros] : [];
  return { ...filtros, raizes: [...new Set([...pelaRelacao, ...parceiros])] };
}

function escondidas(relacoes: RelacoesDoTenant | null): string[] | null {
  if (!relacoes) return null;
  return [...relacoes.porRaiz].filter(([, r]) => ESCONDIDAS_POR_PADRAO.has(r.relacao)).map(([raiz]) => raiz);
}

/** A relação e a marca Parceiro de cada linha da página; sem os dados, a lista aparece sem elas. */
function comRelacao(linhas: LinhaDaPagina[], relacoes: RelacoesDoTenant | null): LinhaDaPagina[] {
  if (!relacoes) return linhas;
  return linhas.map((l) => {
    const raiz = l.cnpj.slice(0, 8);
    return { ...l, relacao: relacoes.porRaiz.get(raiz) ?? null, parceiro: relacoes.parceiros.has(raiz) };
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

async function pagina(cliente: Cliente, pedidoOriginal: Extract<Pedido, { modo: "pagina" }>, sessao: SupabaseClient) {
  const relacoes = await relacoesSeguras(sessao);
  const pedido = { ...pedidoOriginal, filtros: comRaizes(pedidoOriginal.filtros, relacoes) };
  const { ordem, pagina, filtros, busca } = pedido;
  const { where, valores, pelaSecundaria } = condicoesDaBusca(filtros, busca, 3);
  const poucas = await saoPoucas(cliente, pedido);
  const rel = sqlDaRelacao(relacoes?.porRaiz ?? null, pedido.porRelacao, 3 + valores.length);
  const linhas = await cliente.queryObject(
    `SELECT e.cnpj, e.razao_social, e.nome_fantasia, e.cnae_principal, c.descricao AS cnae_descricao,
          e.municipio, e.uf, e.data_inicio_atividade::text AS data_inicio_atividade, e.capital_social::float8 AS capital_social, e.distancia_km, e.funcionarios,
          e.funcionarios_rais, e.funcionarios_estimados,
          e.divida_total::float8 AS divida_total, e.divida_ajuizada::float8 AS divida_ajuizada,
          e.fit_previo, e.fit_frente, e.fit_studio, e.fit_lei_do_bem, e.fit_captacao, e.fit_consultoria, e.faturamento_estimado::float8 AS faturamento_estimado, e.faturamento_base, e.pela_secundaria,
          e.natureza_juridica
     FROM (${empresasDaPagina(pedido, where, pelaSecundaria, poucas, rel)}) e
     LEFT JOIN public.cnaes c ON c.codigo = e.cnae_principal
    ORDER BY ${ordem}`,
    [POR_PAGINA, pagina * POR_PAGINA, ...valores, ...rel.valores],
  );
  const base = await lerBase(cliente);
  const comDoTime = await comFaturamentoDoTime(sessao, linhas.rows as LinhaDaPagina[]);
  return {
    carregada_em: base?.carregada_em ?? null,
    total_da_base: base?.total ?? null,
    linhas: comRelacao(comDoTime, relacoes),
    relacao_indisponivel: relacoes === null,
  };
}

// A contagem para em 100 mil: a lista navega só até 10 mil, e contar 2 milhões passaria de 2 s.
const TETO_DA_CONTAGEM = 100_000;

async function total(cliente: Cliente, pedido: Extract<Pedido, { modo: "total" }>, sessao: SupabaseClient) {
  // Sempre: sem filtro de relação, o total já desconta as descartadas e as em "Não agora".
  const relacoes = await relacoesSeguras(sessao);
  const filtros = comRaizes(pedido.filtros, relacoes);
  // Sem outro filtro, o total é o da base menos as escondidas: contar 2 milhões passaria de 2 s.
  if (!condicoesDaBusca({ ...filtros, escondidas: null }, pedido.busca, 2).where) {
    const base = await lerBase(cliente);
    return { total: base?.total == null ? null : Number(base.total) - (filtros.escondidas?.length ?? 0), limitado: false };
  }
  const { where, valores } = condicoesDaBusca(filtros, pedido.busca, 2);
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
    e.funcionarios_rais, e.funcionarios_estimados,
    e.divida_total::float8 AS divida_total, e.divida_em_cobranca::float8 AS divida_em_cobranca,
    e.divida_ajuizada::float8 AS divida_ajuizada, e.inscricoes_divida, e.tem_email, e.tem_telefone,
    e.fit_previo, e.fit_frente, e.fit_studio, e.fit_lei_do_bem, e.fit_captacao, e.fit_consultoria, e.faturamento_estimado::float8 AS faturamento_estimado, e.faturamento_base
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

/** Relação e histórico da empresa (US-0019, cenário 7); falha aqui não derruba a ficha. */
async function relacaoDaFicha(sessao: SupabaseClient, cnpj: string) {
  try {
    const dados = (await dadosDaRelacao(sessao)).get(cnpj.slice(0, 8)) ?? { cliente: false, projetos: [], oportunidades: [] };
    return { relacao: relacaoDaEmpresa(dados, new Date()), historico: dados, parceiro: !!dados.parceiro, relacao_indisponivel: false };
  } catch {
    return { relacao: null, historico: null, parceiro: false, relacao_indisponivel: true };
  }
}

// US-0053: empresa do Pulse que a Base não tem (ME, EPP, filial, órgão público, baixada): a ficha
// sai do que o Pulse guarda — a consulta da Receita (`receita`), o retrato da Base (`base_*`) e a
// relação, que já é calculada com dados do Pulse.
const COLUNAS_DO_PULSE =
  "cnpj, name, razao_social, nome_fantasia, capital_social, data_abertura, situacao_cadastral, receita, filiais, " +
  "base_funcionarios, base_divida_ajuizada, base_distancia_km, base_faturamento_estimado, base_faturamento_base";

type Cnae = { codigo: string; descricao: string | null };
type ReceitaGuardada = {
  cnaePrincipal?: Cnae | null;
  cnaesSecundarios?: Cnae[];
  naturezaJuridica?: string | null;
  endereco?: { municipio?: string | null; uf?: string | null };
  email?: string | null;
  telefones?: string[];
};

function empresaDoPulse(e: Record<string, unknown>, cnpj: string): LinhaDaPagina {
  const r = (e.receita ?? {}) as ReceitaGuardada;
  const secundarias = r.cnaesSecundarios ?? [];
  return {
    cnpj,
    razao_social: e.razao_social ?? e.name,
    nome_fantasia: e.nome_fantasia ?? e.name,
    cnae_principal: r.cnaePrincipal?.codigo ?? null,
    cnae_descricao: r.cnaePrincipal?.descricao ?? null,
    cnaes_secundarios: secundarias.map((c) => c.codigo),
    secundarias,
    natureza_juridica: null,
    natureza_descricao: r.naturezaJuridica ?? null,
    capital_social: e.capital_social ?? null,
    data_inicio_atividade: e.data_abertura ?? null,
    municipio: r.endereco?.municipio ?? null,
    uf: r.endereco?.uf ?? null,
    distancia_km: e.base_distancia_km ?? null,
    funcionarios: e.base_funcionarios ?? null,
    unidades_com_funcionarios: null,
    filiais_ativas: Array.isArray(e.filiais) ? e.filiais.length : 0,
    socios: 0,
    divida_total: null,
    divida_em_cobranca: null,
    divida_ajuizada: e.base_divida_ajuizada ?? null,
    inscricoes_divida: null,
    tem_email: !!r.email,
    tem_telefone: (r.telefones ?? []).length > 0,
    faturamento_estimado: e.base_faturamento_estimado ?? null,
    faturamento_base: e.base_faturamento_base ?? null,
    situacao_cadastral: e.situacao_cadastral ?? null,
    so_no_pulse: true,
  };
}

async function fichaDoPulse(sessao: SupabaseClient, cnpj: string) {
  const { data, error } = await sessao
    .from("prospect_companies")
    .select(COLUNAS_DO_PULSE)
    .or(`cnpj.eq.${cnpj},filiais.cs.{${cnpj}}`)
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Recusa("Empresa não encontrada na base.", 404);
  const e = data as Record<string, unknown>;
  const r = (e.receita ?? {}) as ReceitaGuardada;
  const [empresa] = await comFaturamentoDoTime(sessao, [empresaDoPulse(e, cnpj)]);
  const telefones = r.telefones ?? [];
  const temContato = !!r.email || telefones.length > 0;
  return {
    empresa,
    contato: temContato ? { email: r.email ?? null, telefone_1: telefones[0] ?? null, telefone_2: telefones[1] ?? null } : null,
    socios: [],
    oportunidades: await oportunidadesDaEmpresa(sessao, cnpj),
    ...(await relacaoDaFicha(sessao, cnpj)),
  };
}

async function ficha(cliente: Cliente, { cnpj }: Extract<Pedido, { modo: "ficha" }>, sessao: SupabaseClient) {
  const r = await cliente.queryObject<LinhaDaPagina>(FICHA, [cnpj]);
  if (!r.rows.length) return await fichaDoPulse(sessao, cnpj);
  const [empresa] = await comFaturamentoDoTime(sessao, r.rows);
  const socios = await cliente.queryObject(SOCIOS, [cnpj.slice(0, 8), ADMINISTRAM]);
  const contato = await cliente.queryObject("SELECT email, telefone_1, telefone_2 FROM pulse.contatos WHERE cnpj = $1", [cnpj]);
  return {
    empresa,
    contato: contato.rows[0] ?? null,
    socios: socios.rows,
    oportunidades: await oportunidadesDaEmpresa(sessao, cnpj),
    ...(await relacaoDaFicha(sessao, cnpj)),
  };
}

async function responder(pedido: Pedido, sessao: SupabaseClient) {
  const cliente = await baseDaReceita().connect();
  try {
    if (pedido.modo === "total") return await total(cliente, pedido, sessao);
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
