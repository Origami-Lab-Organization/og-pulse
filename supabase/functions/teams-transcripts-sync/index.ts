// teams-transcripts-sync — traz a transcrição do Teams para a aba Reuniões do projeto
// (ADR-0052). Chamada pelo cron de 10 em 10 minutos, com a chave de serviço, para todas as
// reuniões vinculadas; e pelo botão "Buscar transcrições agora", com a sessão de quem pode
// pedir transcrição no projeto, só para as reuniões daquele projeto.
//
// Credencial própria do app "Pulse — Transcrições" (client credentials), com
// OnlineMeetingTranscript.Read.All limitada pela application access policy do Teams. Só
// importa transcrição de reunião vinculada em `project_online_meetings`, e só a do
// organizador que vinculou. Contrato e configuração: .harness/integrations/teams-transcricao.md.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ehChamadaDeServico } from "../_shared/chamadaDeServico.ts";
import { duracaoEmSegundos, lerVtt, textoCorrido } from "../_shared/transcricaoTeams.ts";

const GRAPH = "https://graph.microsoft.com/v1.0";
const DIAS_RELIDOS = 3;
const PAGINAS_POR_ORGANIZADOR = 5;
const IMPORTACOES_POR_CHAMADA = 15;
const TEMPO_MS = 20000;
const FORMATO_COM_VOZ = "text/vtt";
const FORMATO_SEM_VOZ = "application/vnd.microsoft.graph.transcript+text";
const SEM_ATRIBUICAO_DE_VOZ = "SpeakerAttributionNotAllowed";
const ACESSO_A_TRANSCRICAO_DESLIGADO = "GraphAccessToTranscriptsDisabled";
const SEM_POLITICA_DE_ACESSO = "No application access policy";
const FALHA_DE_TOKEN = "token";
const PG_UNIQUE_VIOLATION = "23505";

// deno-lint-ignore no-explicit-any -- cliente sem tipos gerados, como nas outras funções
type Supabase = ReturnType<typeof createClient<any>>;

interface Vinculo {
  id: string;
  tenant_id: string;
  project_id: string;
  online_meeting_id: string;
  organizer_entra_id: string;
  ical_uid: string | null;
  event_subject: string;
  registered_by: string;
}

interface TranscricaoGraph {
  id: string;
  meetingId: string;
  createdDateTime: string | null;
  endDateTime?: string | null;
  transcriptContentUrl: string;
}

interface Credenciais {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

class FalhaGraph extends Error {
  constructor(public readonly status: number, public readonly codigo: string) {
    super(`graph ${status} ${codigo}`);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function credenciais(): Credenciais | null {
  const tenantId = Deno.env.get("MICROSOFT_TENANT_ID");
  const clientId = Deno.env.get("MICROSOFT_TRANSCRIPTS_CLIENT_ID");
  const clientSecret = Deno.env.get("MICROSOFT_TRANSCRIPTS_CLIENT_SECRET");
  return tenantId && clientId && clientSecret ? { tenantId, clientId, clientSecret } : null;
}

// ── Graph ─────────────────────────────────────────────────────────────────────

async function tokenDoApp(c: Credenciais): Promise<string> {
  const resposta = await fetch(`https://login.microsoftonline.com/${c.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    signal: AbortSignal.timeout(TEMPO_MS),
  });
  if (!resposta.ok) throw new FalhaGraph(resposta.status, FALHA_DE_TOKEN);
  return (await resposta.json()).access_token;
}

/** Só o código do erro — o corpo pode trazer dado da reunião. */
async function codigoDoErro(resposta: Response): Promise<string> {
  try {
    const corpo = await resposta.json();
    const erro = corpo?.error ?? {};
    return erro.innerError?.code ?? erro.innererror?.code ?? erro.message ?? erro.code ?? "";
  } catch {
    return "";
  }
}

async function graph(token: string, url: string, accept = "application/json"): Promise<Response> {
  // O token do app só vai para o Graph, nunca para URL que veio de resposta sem conferir.
  if (!url.startsWith(`${GRAPH}/`)) throw new FalhaGraph(0, "url_fora_do_graph");
  const resposta = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: accept },
    signal: AbortSignal.timeout(TEMPO_MS),
  });
  if (!resposta.ok) throw new FalhaGraph(resposta.status, await codigoDoErro(resposta));
  return resposta;
}

function inicioDaJanela(): string {
  return new Date(Date.now() - DIAS_RELIDOS * 86400000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function transcricoesDoOrganizador(token: string, oid: string): Promise<TranscricaoGraph[]> {
  const itens: TranscricaoGraph[] = [];
  let url: string | undefined =
    `${GRAPH}/users/${oid}/onlineMeetings/getAllTranscripts(meetingOrganizerUserId='${oid}',startDateTime=${inicioDaJanela()})`;
  for (let pagina = 0; url && pagina < PAGINAS_POR_ORGANIZADOR; pagina++) {
    const corpo = await (await graph(token, url)).json();
    itens.push(...(corpo.value ?? []));
    url = corpo["@odata.nextLink"];
  }
  return itens;
}

/** Com o nome de quem falou; se o tenant proibir a atribuição, sem. */
async function conteudo(token: string, transcricao: TranscricaoGraph): Promise<string> {
  try {
    return await (await graph(token, transcricao.transcriptContentUrl, FORMATO_COM_VOZ)).text();
  } catch (erro) {
    if (!(erro instanceof FalhaGraph) || erro.codigo !== SEM_ATRIBUICAO_DE_VOZ) throw erro;
    return await (await graph(token, transcricao.transcriptContentUrl, FORMATO_SEM_VOZ)).text();
  }
}

/** Frase para a tela (fica em `project_online_meetings.last_error`). */
function mensagemPara(erro: unknown): string {
  const codigo = erro instanceof FalhaGraph ? erro.codigo : "";
  if (codigo === ACESSO_A_TRANSCRICAO_DESLIGADO) {
    return "O acesso às transcrições está desligado no Teams da empresa. Avise quem administra o Microsoft 365.";
  }
  if (codigo.includes(SEM_POLITICA_DE_ACESSO)) {
    return "O Microsoft 365 ainda não liberou o Pulse para ler as reuniões deste organizador. Avise quem administra o Microsoft 365.";
  }
  if (codigo === FALHA_DE_TOKEN) {
    return "O Pulse não conseguiu se autenticar na Microsoft. Avise quem cuida do sistema.";
  }
  return "Não foi possível consultar as transcrições agora. O Pulse tenta de novo em 10 minutos.";
}

// ── Pulse ─────────────────────────────────────────────────────────────────────

/** Todas as reuniões vinculadas (cron) ou só as de um projeto (botão da tela). */
async function vinculos(supabase: Supabase, projectId: string | null): Promise<Vinculo[]> {
  let consulta = supabase
    .from("project_online_meetings")
    .select("id, tenant_id, project_id, online_meeting_id, organizer_entra_id, ical_uid, event_subject, registered_by");
  if (projectId) consulta = consulta.eq("project_id", projectId);
  const { data, error } = await consulta;
  if (error) throw new Error("vinculos");
  return data ?? [];
}

function porOrganizador(lista: Vinculo[]): Map<string, Vinculo[]> {
  const mapa = new Map<string, Vinculo[]>();
  for (const vinculo of lista) {
    mapa.set(vinculo.organizer_entra_id, [...(mapa.get(vinculo.organizer_entra_id) ?? []), vinculo]);
  }
  return mapa;
}

/** Chaves "projeto|transcrição" já importadas, para não buscar conteúdo à toa. */
async function jaImportadas(supabase: Supabase, projetos: string[]): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("meeting_transcriptions")
    .select("project_id, source_transcript_id")
    .in("project_id", projetos)
    .not("source_transcript_id", "is", null);
  if (error) throw new Error("importadas");
  return new Set((data ?? []).map((linha) => `${linha.project_id}|${linha.source_transcript_id}`));
}

async function gravar(supabase: Supabase, vinculo: Vinculo, transcricao: TranscricaoGraph, texto: string) {
  const falas = lerVtt(texto);
  const { error } = await supabase.from("meeting_transcriptions").insert({
    tenant_id: vinculo.tenant_id,
    project_id: vinculo.project_id,
    source: "teams",
    status: "concluida",
    ical_uid: vinculo.ical_uid,
    event_subject: vinculo.event_subject,
    occurred_at: transcricao.createdDateTime,
    online_meeting_id: transcricao.meetingId,
    source_transcript_id: transcricao.id,
    finished_at: transcricao.endDateTime ?? new Date().toISOString(),
    duration_seconds: duracaoEmSegundos(falas),
    transcript_text: falas.length ? textoCorrido(falas) : texto.trim(),
    segments: falas,
    requested_by: vinculo.registered_by,
  });
  // Outra execução chegou antes: idempotência, não erro.
  if (error && error.code !== PG_UNIQUE_VIOLATION) throw new Error(`gravar ${error.code}`);
}

async function marcar(supabase: Supabase, lista: Vinculo[], erro: string | null) {
  await supabase
    .from("project_online_meetings")
    .update({ last_checked_at: new Date().toISOString(), last_error: erro })
    .in("id", lista.map((vinculo) => vinculo.id));
}

interface Orcamento {
  restante: number;
}

async function importarDoOrganizador(
  supabase: Supabase,
  token: string,
  oid: string,
  lista: Vinculo[],
  orcamento: Orcamento,
): Promise<number> {
  const transcricoes = await transcricoesDoOrganizador(token, oid);
  const importadas = await jaImportadas(supabase, [...new Set(lista.map((v) => v.project_id))]);
  let novas = 0;

  for (const transcricao of transcricoes) {
    const destinos = lista.filter(
      (v) => v.online_meeting_id === transcricao.meetingId && !importadas.has(`${v.project_id}|${transcricao.id}`),
    );
    if (!destinos.length || orcamento.restante <= 0) continue;

    const texto = await conteudo(token, transcricao);
    for (const vinculo of destinos) {
      await gravar(supabase, vinculo, transcricao, texto);
      novas++;
    }
    orcamento.restante--;
  }
  return novas;
}

async function sincronizar(supabase: Supabase, c: Credenciais, projectId: string | null) {
  const grupos = porOrganizador(await vinculos(supabase, projectId));
  if (grupos.size === 0) return { organizadores: 0, importadas: 0 };

  const token = await tokenDoApp(c);
  const orcamento: Orcamento = { restante: IMPORTACOES_POR_CHAMADA };
  let importadas = 0;

  for (const [oid, lista] of grupos) {
    try {
      importadas += await importarDoOrganizador(supabase, token, oid, lista, orcamento);
      await marcar(supabase, lista, null);
    } catch (erro) {
      console.error("teams-transcripts-sync: organizador não sincronizado", erro instanceof FalhaGraph ? erro.status : "pulse");
      await marcar(supabase, lista, mensagemPara(erro));
    }
  }
  return { organizadores: grupos.size, importadas };
}

// ── Quem chama ────────────────────────────────────────────────────────────────

async function projetoDoCorpo(req: Request): Promise<string | null> {
  try {
    const corpo = await req.json();
    return typeof corpo?.projectId === "string" && UUID_RE.test(corpo.projectId) ? corpo.projectId : null;
  } catch {
    return null;
  }
}

/**
 * Pela tela, vale a mesma regra de pedir transcrição (`can_request_meeting_transcription`) e
 * a busca fica restrita ao projeto. Devolve o projeto, ou a resposta de recusa.
 */
async function projetoDaPessoa(req: Request, supabase: Supabase): Promise<string | Response> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const pessoa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await pessoa.auth.getUser();
  if (!user) return json({ error: "Não autorizado" }, 401);

  const projectId = await projetoDoCorpo(req);
  if (!projectId) return json({ error: "Projeto inválido." }, 400);

  const { data: pode } = await supabase.rpc("can_request_meeting_transcription", {
    _user_id: user.id,
    _project_id: projectId,
  });
  return pode === true
    ? projectId
    : json({ error: "Você não tem permissão para buscar transcrições deste projeto." }, 403);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const escopo = (await ehChamadaDeServico(req)) ? null : await projetoDaPessoa(req, supabase);
  if (escopo instanceof Response) return escopo;

  const c = credenciais();
  if (!c) return json({ situacao: "nao_configurado" });

  try {
    return json({ situacao: "ok", ...(await sincronizar(supabase, c, escopo)) });
  } catch (erro) {
    console.error("teams-transcripts-sync: falha", erro instanceof FalhaGraph ? erro.status : (erro as Error).message);
    return json({ situacao: "falhou" }, 500);
  }
});
