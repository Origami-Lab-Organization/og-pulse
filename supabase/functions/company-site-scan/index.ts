// company-site-scan — lê o site oficial da empresa e grava o que ela publica sobre si
// (redes, WhatsApp, telefones, e-mails genéricos, pistas de sistema). Contrato e regras de
// segurança (SSRF): .harness/integrations/site-da-empresa.md

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEMPO_MS = 8000;
const MAX_BYTES = 1_500_000;
const MAX_SALTOS = 3;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WEBMAIL = new Set([
  "gmail.com", "hotmail.com", "outlook.com", "live.com", "yahoo.com", "yahoo.com.br",
  "bol.com.br", "uol.com.br", "terra.com.br", "ig.com.br", "icloud.com", "globo.com",
  "msn.com", "r7.com", "zipmail.com.br",
]);

// Pistas de sistema: o gancho da frente de software sob medida e integração.
const SISTEMAS: Array<[string, RegExp]> = [
  ["TOTVS", /\btotvs\b|\bprotheus\b|\bdatasul\b|\brm\s+totvs\b/i],
  ["SAP", /\bsap\b(?![a-z])|s\/4\s?hana|\bsap\s+business\s+one\b/i],
  ["Senior", /\bsenior\s+sistemas\b/i],
  ["Sankhya", /\bsankhya\b/i],
  ["Oracle", /\boracle\b|\bjd\s?edwards\b/i],
  ["Microsoft Dynamics", /\bdynamics\s*(365|ax|nav)\b/i],
  ["Omie", /\bomie\b/i],
  ["Bling", /\bbling\b/i],
];

const SINAIS: Array<[string, RegExp]> = [
  ["MES / chão de fábrica", /\bmes\b(?=[^a-z])|manufacturing execution|ch[aã]o de f[aá]brica/i],
  ["Indústria 4.0", /ind[uú]stria\s*4[.,]0/i],
  ["Automação industrial", /automa[cç][aã]o\s+industrial|\bplc\b|\bscada\b/i],
  ["Portal do fornecedor", /portal\s+(do|de)\s+fornecedor/i],
  ["Vagas de TI", /(desenvolvedor|analista\s+de\s+sistemas|engenheiro\s+de\s+software|\bdevops\b)/i],
  ["Trabalhe conosco", /trabalhe\s+conosco|carreiras|vagas/i],
  ["P&D / inovação", /pesquisa\s+e\s+desenvolvimento|\bp&d\b|\bp\s?d\s?&?\s?i\b|centro\s+de\s+inova[cç][aã]o/i],
  ["Certificação ISO", /\biso\s?9001\b|\biso\s?14001\b|\biatf\s?16949\b/i],
  ["Exportação", /exporta[cç][aã]o|export(s|ing)?\b/i],
];

const PAGINAS_EXTRAS = /(contato|fale-?conosco|contact|sobre|quem-?somos|about|trabalhe-?conosco|carreiras)/i;

interface Achados {
  url: string;
  redes: { linkedin: string | null; instagram: string | null; facebook: string | null; youtube: string | null };
  whatsapp: string[];
  telefones: string[];
  emails: string[];
  sistemas: string[];
  sinais: string[];
  paginas: string[];
}

class Recusa extends Error {
  constructor(message: string, readonly status = 422) {
    super(message);
  }
}

// ── Rede: o que pode ser buscado ──────────────────────────────────────────────

// Faixas IPv4 que não são internet pública: [primeiro octeto, segundo mínimo, segundo máximo].
const FAIXAS_V4: Array<[number, number, number]> = [
  [0, 0, 255], [10, 0, 255], [127, 0, 255], [169, 254, 254], [172, 16, 31],
  [192, 168, 168], [100, 64, 127],
];
const PREFIXOS_V6 = ["fc", "fd", "fe80", "::ffff:"];
const V6_LOCAIS = new Set(["::1", "::"]);

function ipv4Privado(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a >= 224) return true;
  return FAIXAS_V4.some(([primeiro, min, max]) => a === primeiro && b >= min && b <= max);
}

function ipPrivado(ip: string): boolean {
  if (!ip.includes(":")) return ipv4Privado(ip);
  const v6 = ip.toLowerCase();
  return V6_LOCAIS.has(v6) || PREFIXOS_V6.some((p) => v6.startsWith(p));
}

const PROTOCOLOS = new Set(["http:", "https:"]);
const PORTAS = new Set(["", "80", "443"]);
const NOME_INTERNO = /\.(local|internal|lan|home|corp)$/;

function exigirFormato(url: URL): void {
  if (!PROTOCOLOS.has(url.protocol)) throw new Recusa("Só endereços http ou https.");
  if (url.username || url.password) throw new Recusa("Endereço com usuário ou senha não é aceito.");
  if (!PORTAS.has(url.port)) throw new Recusa("Porta não permitida.");
}

function hostInterno(host: string): boolean {
  return host === "localhost" || !host.includes(".") || NOME_INTERNO.test(host);
}

async function ipsDe(host: string): Promise<string[]> {
  const [v4, v6] = await Promise.all([
    Deno.resolveDns(host, "A").catch(() => [] as string[]),
    Deno.resolveDns(host, "AAAA").catch(() => [] as string[]),
  ]);
  return [...v4, ...v6];
}

async function exigirUrlPublica(url: URL): Promise<void> {
  exigirFormato(url);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostInterno(host)) throw new Recusa("Endereço interno não é aceito.");
  const literal = /^[\d.]+$/.test(host) || host.includes(":");
  const ips = literal ? [host] : await ipsDe(host);
  if (ips.length === 0) throw new Recusa("O endereço do site não existe (DNS não resolveu).");
  if (ips.some(ipPrivado)) throw new Recusa("Endereço interno não é aceito.");
}

async function lerCorpo(resposta: Response): Promise<string> {
  const leitor = resposta.body?.getReader();
  if (!leitor) return "";
  const partes: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await leitor.read(); // harness-ok: cada read devolve o próximo trecho do corpo
    if (done || !value) break;
    partes.push(value);
    total += value.length;
  }
  await leitor.cancel().catch(() => undefined);
  const junto = new Uint8Array(Math.min(total, MAX_BYTES));
  let pos = 0;
  for (const parte of partes) {
    const cabe = parte.subarray(0, junto.length - pos);
    junto.set(cabe, pos);
    pos += cabe.length;
    if (pos >= junto.length) break;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(junto);
}

async function pedir(url: URL): Promise<Response> {
  await exigirUrlPublica(url);
  return fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(TEMPO_MS),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OrigamiPulse/1.0; +https://origamipulse.com.br)", Accept: "text/html" },
  });
}

const ehRedirecionamento = (r: Response) => r.status >= 300 && r.status < 400;

async function destinoDe(resposta: Response, atual: URL): Promise<URL> {
  const destino = resposta.headers.get("location");
  await resposta.body?.cancel();
  if (!destino) throw new Recusa("O site redirecionou sem destino.");
  return new URL(destino, atual);
}

async function htmlDe(resposta: Response): Promise<string> {
  if (!resposta.ok) throw new Recusa(`O site respondeu ${resposta.status}.`);
  if (!(resposta.headers.get("content-type") ?? "").includes("text/html")) {
    throw new Recusa("O endereço não é uma página de site.");
  }
  return lerCorpo(resposta);
}

// Redirecionamento seguido à mão: cada salto passa de novo pela checagem de rede.
async function buscarHtml(inicial: URL): Promise<{ url: URL; html: string }> {
  let atual = inicial;
  for (let salto = 0; salto <= MAX_SALTOS; salto++) {
    const resposta = await pedir(atual); // harness-ok: URL muda a cada salto
    if (!ehRedirecionamento(resposta)) return { url: atual, html: await htmlDe(resposta) };
    atual = await destinoDe(resposta, atual); // harness-ok: destino do salto atual
  }
  throw new Recusa("Redirecionamentos demais.");
}

// ── Leitura do HTML ───────────────────────────────────────────────────────────

function links(html: string, base: URL): URL[] {
  const saida: URL[] = [];
  for (const m of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    try {
      saida.push(new URL(m[1].trim(), base));
    } catch {
      // href quebrado: ignora
    }
  }
  return saida;
}

function textoVisivel(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function perfil(u: URL, dominio: RegExp, invalidos: RegExp): string | null {
  if (!dominio.test(u.hostname)) return null;
  const caminho = u.pathname.replace(/\/+$/, "");
  if (!caminho || caminho === "/" || invalidos.test(caminho)) return null;
  return `https://${u.hostname.replace(/^m\./, "www.")}${caminho}`;
}

const unicos = (itens: string[]) => [...new Set(itens.filter(Boolean))];

function telefonesBr(texto: string): string[] {
  const achados = texto.match(/(?:\+?55\s?)?\(?\b[1-9]{2}\)?\s?(?:9\s?)?\d{4}[-.\s]?\d{4}\b/g) ?? [];
  return unicos(
    achados
      .map((t) => t.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""))
      .filter((d) => d.length === 10 || d.length === 11)
      .map((d) => (d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`)),
  ).slice(0, 6);
}

// E-mail GENÉRICO da empresa (contato@, comercial@...). Caixa com nome de pessoa fica de fora.
const EMAIL_GENERICO = /^(contato|comercial|vendas|atendimento|sac|faleconosco|fale|info|rh|compras|suprimentos|financeiro|marketing|ouvidoria|adm|administrativo|diretoria|inovacao)/i;

function emailsDaEmpresa(texto: string, dominioSite: string): string[] {
  const achados = texto.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [];
  return unicos(
    achados
      .map((e) => e.toLowerCase())
      .filter((e) => e.endsWith(dominioSite) && EMAIL_GENERICO.test(e)),
  ).slice(0, 6);
}

function analisar(paginas: Array<{ url: URL; html: string }>, principal: URL): Achados {
  const todos = paginas.flatMap((p) => links(p.html, p.url));
  const texto = paginas.map((p) => textoVisivel(p.html)).join(" ");
  const dominio = principal.hostname.replace(/^www\./, "");
  const primeiro = (f: (u: URL) => string | null) => todos.map(f).find(Boolean) ?? null;
  const whatsapp = unicos(
    todos
      .filter((u) => /(^|\.)wa\.me$|api\.whatsapp\.com$|web\.whatsapp\.com$/.test(u.hostname))
      .map((u) => (u.pathname.replace(/\D/g, "") || u.searchParams.get("phone") || "").replace(/\D/g, ""))
      .filter((d) => d.length >= 10),
  ).slice(0, 3);
  const telLinks = todos.filter((u) => u.protocol === "tel:").map((u) => u.pathname);
  return {
    url: principal.toString(),
    redes: {
      linkedin: primeiro((u) => perfil(u, /(^|\.)linkedin\.com$/, /^\/(share|shareArticle|sharing)/i)),
      instagram: primeiro((u) => perfil(u, /(^|\.)instagram\.com$/, /^\/(p|reel|explore|share)\//i)),
      facebook: primeiro((u) => perfil(u, /(^|\.)facebook\.com$/, /^\/(sharer|share|dialog)/i)),
      youtube: primeiro((u) => perfil(u, /(^|\.)youtube\.com$/, /^\/(watch|embed|shorts)/i)),
    },
    whatsapp,
    telefones: telefonesBr(`${telLinks.join(" ")} ${texto}`),
    emails: emailsDaEmpresa(`${todos.filter((u) => u.protocol === "mailto:").map((u) => u.pathname).join(" ")} ${texto}`, dominio),
    sistemas: SISTEMAS.filter(([, re]) => re.test(texto)).map(([nome]) => nome),
    sinais: SINAIS.filter(([, re]) => re.test(texto)).map(([nome]) => nome),
    paginas: paginas.map((p) => p.url.toString()),
  };
}

// ── Empresa: de onde vem a URL e onde grava ───────────────────────────────────

function urlDaEmpresa(empresa: { website: string | null; receita: { email?: string | null } | null }): URL {
  const site = empresa.website?.trim();
  if (site) return new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`);
  const dominio = empresa.receita?.email?.split("@")[1]?.toLowerCase();
  if (dominio && !WEBMAIL.has(dominio)) return new URL(`https://${dominio}`);
  throw new Recusa("A empresa não tem site cadastrado nem e-mail com domínio próprio na Receita. Informe o Site.");
}

async function lerSite(inicial: URL): Promise<Achados> {
  const home = await buscarHtml(inicial);
  const extras = [...new Set(
    links(home.html, home.url)
      .filter((u) => u.hostname === home.url.hostname && PAGINAS_EXTRAS.test(u.pathname))
      .map((u) => `${u.origin}${u.pathname}`),
  )].slice(0, 2);
  const paginas = [home];
  for (const extra of extras) {
    const pagina = await buscarHtml(new URL(extra)).catch(() => null); // harness-ok: páginas diferentes a cada volta
    if (pagina) paginas.push(pagina);
  }
  return analisar(paginas, home.url);
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// deno-lint-ignore no-explicit-any -- cliente sem tipos gerados, como nas outras funções
type Supabase = ReturnType<typeof createClient<any>>;

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

async function companyIdDe(req: Request): Promise<string> {
  const corpo = await req.json().catch(() => ({}));
  const id = typeof corpo?.company_id === "string" ? corpo.company_id : "";
  if (!UUID.test(id)) throw new Recusa("company_id inválido.", 400);
  return id;
}

interface EmpresaLida {
  id: string;
  website: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  receita: { email?: string | null } | null;
}

// Lida sob a RLS: sem prospeccao:ler, a empresa "não existe" para quem chama.
async function lerEmpresa(supabase: Supabase, id: string): Promise<EmpresaLida> {
  const { data, error } = await supabase
    .from("prospect_companies")
    .select("id, website, linkedin_url, instagram_url, receita")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Recusa("Não foi possível ler a empresa.", 500);
  if (!data) throw new Recusa("Empresa não encontrada.", 404);
  return data as EmpresaLida;
}

const LINKEDIN_DUPLICADO = "23505";

async function gravar(supabase: Supabase, empresa: EmpresaLida, achados: Achados): Promise<void> {
  const { error } = await supabase
    .from("prospect_companies")
    .update({
      site_scan: achados,
      site_scan_em: new Date().toISOString(),
      website: empresa.website ?? achados.url,
      linkedin_url: empresa.linkedin_url ?? achados.redes.linkedin,
      instagram_url: empresa.instagram_url ?? achados.redes.instagram,
    })
    .eq("id", empresa.id);
  if (!error) return;
  if (error.code === LINKEDIN_DUPLICADO) throw new Recusa("O LinkedIn do site já está em outra empresa cadastrada.", 409);
  throw new Recusa("Não foi possível gravar o que o site trouxe.", 500);
}

function respostaDeErro(erro: unknown): Response {
  if (erro instanceof Recusa) return json({ error: erro.message }, erro.status);
  if (erro instanceof DOMException && erro.name === "TimeoutError") {
    return json({ error: "O site demorou demais para responder." }, 504);
  }
  // Sem URL nem corpo no log: pode ser dado de cadastro.
  console.error("company-site-scan: falha inesperada", (erro as Error)?.name);
  return json({ error: "Não foi possível ler o site agora." }, 502);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const supabase = await clienteDoUsuario(req);
    const empresa = await lerEmpresa(supabase, await companyIdDe(req));
    const achados = await lerSite(urlDaEmpresa(empresa));
    await gravar(supabase, empresa, achados);
    return json({ achados }, 200);
  } catch (erro) {
    return respostaDeErro(erro);
  }
});
