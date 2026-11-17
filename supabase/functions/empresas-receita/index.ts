// empresas-receita — uma página da base da Receita, que mora na VPS (ADR-0053, US-0001/US-0002).
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
// Corpo: { ordem: 'fit' | 'nome' | 'funcionarios' | 'idade', crescente: boolean, pagina: number }
// Resposta: { total, carregada_em, linhas[] } — o mesmo formato que a tela já lê.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

async function exigirLeitura(req: Request): Promise<void> {
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
}

interface Pedido {
  ordem: string;
  pagina: number;
}

async function lerPedido(req: Request): Promise<Pedido> {
  const corpo = await req.json().catch(() => ({})) as Record<string, unknown>;
  const ordem = `${corpo.ordem ?? "fit"}:${corpo.crescente === true ? "asc" : "desc"}`;
  const pagina = Number(corpo.pagina ?? 0);
  if (!ORDENS[ordem]) throw new Recusa("Ordem desconhecida.", 400);
  if (!Number.isInteger(pagina) || pagina < 0 || pagina > ULTIMA_PAGINA) {
    throw new Recusa("A lista vai até as 10 mil primeiras empresas. Use os filtros.", 400);
  }
  return { ordem: ORDENS[ordem], pagina };
}

async function consultar({ ordem, pagina }: Pedido) {
  const cliente = await baseDaReceita().connect();
  try {
    const linhas = await cliente.queryObject(
      `SELECT e.cnpj, e.razao_social, e.nome_fantasia, e.cnae_principal, c.descricao AS cnae_descricao,
            e.municipio, e.uf, e.data_inicio_atividade::text AS data_inicio_atividade, e.funcionarios,
            e.divida_total::float8 AS divida_total, e.divida_ajuizada::float8 AS divida_ajuizada,
            e.fit_previo, e.fit_frente, e.faturamento_estimado::float8 AS faturamento_estimado
       FROM (SELECT * FROM pulse.empresas e ORDER BY ${ordem} LIMIT $1 OFFSET $2) e
       LEFT JOIN public.cnaes c ON c.codigo = e.cnae_principal
      ORDER BY ${ordem}`,
      [POR_PAGINA, pagina * POR_PAGINA],
    );
    const base = await cliente.queryObject<{ total: number; carregada_em: Date }>(
      "SELECT total, carregada_em FROM pulse.base WHERE id",
    );
    const [linhaDaBase] = base.rows;
    return { total: linhaDaBase?.total ?? null, carregada_em: linhaDaBase?.carregada_em ?? null, linhas: linhas.rows };
  } finally {
    cliente.release();
  }
}

const buscarPagina = (pedido: Pedido) => comPrazo(consultar(pedido));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await exigirLeitura(req);
    return json(await buscarPagina(await lerPedido(req)), 200);
  } catch (erro) {
    if (erro instanceof Recusa) return json({ error: erro.message }, erro.status);
    // Só o nome do erro: a mensagem do driver pode trazer o endereço da VPS.
    console.error("empresas-receita: base indisponível", (erro as Error)?.name);
    return json({ error: "A base da Receita está indisponível agora." }, 503);
  }
});
