// Enfileira a transcrição de uma gravação de reunião do OneDrive (ADR-0039).
//
// A URL pré-autenticada da gravação vale por si só e mora em
// `meeting_transcription_sources`, que só a service role alcança — gravar ali exige
// servidor. A autorização continua na RLS: o insert vai com o token da pessoa.
//
// Pedir de novo uma gravação em 'falhou' (tipicamente URL expirada) devolve o trabalho
// para a fila com a URL nova, depois de conferir a mesma regra da policy.
//
// A URL NUNCA É REGISTRADA nem devolvida ao cliente (.harness/patterns/logging.md).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// A VM baixa esta URL: sem restrição de destino, a função viraria porta de SSRF.
const HOSTS_PERMITIDOS = [
  ".sharepoint.com",
  ".onedrive.com",
  ".1drv.com",
  ".microsoft.com",
  ".office.com",
];

const VALIDADE_MAXIMA_MS = 24 * 60 * 60 * 1000;
const TAMANHO_MAXIMO_LINK = 2000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS = {
  PENDENTE: "pendente",
  FALHOU: "falhou",
} as const;

const PG_UNIQUE_VIOLATION = "23505";

interface Entrada {
  projectId: string;
  icalUid: string | null;
  eventSubject: string;
  occurredAt: string | null;
  recordingDriveId: string;
  recordingItemId: string;
  recordingWebUrl: string | null;
  downloadUrl: string;
  expiresAt: string;
}

interface Solicitante {
  userId: string;
  employeeId: string;
  tenantId: string;
}

type Cliente = ReturnType<typeof createClient>;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function textoObrigatorio(valor: unknown, maximo = 400): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  if (!limpo || limpo.length > maximo) return null;
  return limpo;
}

function uuidValido(valor: unknown): string | null {
  return typeof valor === "string" && UUID_RE.test(valor) ? valor : null;
}

function hostPermitido(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return url.protocol === "https:" && HOSTS_PERMITIDOS.some((sufixo) => host.endsWith(sufixo));
}

function urlDaMicrosoft(valor: unknown): string | null {
  const bruto = typeof valor === "string" ? valor.trim() : "";
  if (!bruto || bruto.length > TAMANHO_MAXIMO_LINK) return null;
  try {
    return hostPermitido(new URL(bruto)) ? bruto : null;
  } catch {
    return null;
  }
}

/** Instante ISO no futuro, dentro da validade máxima. */
function expiracaoValida(valor: unknown): string | null {
  const instante = Date.parse(typeof valor === "string" ? valor : "");
  if (Number.isNaN(instante)) return null;

  const agora = Date.now();
  if (instante <= agora || instante > agora + VALIDADE_MAXIMA_MS) return null;
  return new Date(instante).toISOString();
}

function instanteOpcional(valor: unknown): string | null {
  const instante = Date.parse(typeof valor === "string" ? valor : "");
  return Number.isNaN(instante) ? null : new Date(instante).toISOString();
}

/** Devolve a entrada validada ou a mensagem do primeiro problema encontrado. */
function lerEntrada(body: Record<string, unknown>): Entrada | string {
  const projectId = uuidValido(body.projectId);
  if (!projectId) return "Projeto inválido.";

  const eventSubject = textoObrigatorio(body.eventSubject);
  if (!eventSubject) return "Título da reunião é obrigatório.";

  const recordingDriveId = textoObrigatorio(body.recordingDriveId);
  const recordingItemId = textoObrigatorio(body.recordingItemId);
  if (!recordingDriveId || !recordingItemId) {
    return "A gravação precisa vir com drive e item — um sem o outro não resolve no Graph.";
  }

  const downloadUrl = urlDaMicrosoft(body.downloadUrl);
  if (!downloadUrl) return "Endereço da gravação inválido.";

  const expiresAt = expiracaoValida(body.expiresAt);
  if (!expiresAt) return "Validade do endereço da gravação inválida.";

  return {
    projectId,
    icalUid: textoObrigatorio(body.icalUid, 500),
    eventSubject,
    occurredAt: instanteOpcional(body.occurredAt),
    recordingDriveId,
    recordingItemId,
    recordingWebUrl: urlDaMicrosoft(body.recordingWebUrl),
    downloadUrl,
    expiresAt,
  };
}

async function lerCorpo(req: Request): Promise<Entrada | string> {
  try {
    return lerEntrada(await req.json());
  } catch {
    return "Corpo da requisição inválido";
  }
}

/** Tenant e autor saem do servidor, não do corpo. */
async function identificarSolicitante(
  admin: Cliente,
  userId: string,
  projectId: string,
): Promise<Solicitante | Response> {
  const { data: projeto } = await admin
    .from("projects")
    .select("tenant_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!projeto) return jsonResponse({ error: "Projeto não encontrado." }, 404);

  const { data: funcionario } = await admin
    .from("employees")
    .select("id")
    .eq("auth_id", userId)
    .eq("tenant_id", projeto.tenant_id)
    .maybeSingle();
  if (!funcionario) {
    return jsonResponse({ error: "Sem cadastro de colaborador neste tenant." }, 403);
  }

  return { userId, employeeId: funcionario.id, tenantId: projeto.tenant_id };
}

async function gravarOrigem(admin: Cliente, transcricaoId: string, entrada: Entrada) {
  return await admin.from("meeting_transcription_sources").upsert({
    transcription_id: transcricaoId,
    download_url: entrada.downloadUrl,
    expires_at: entrada.expiresAt,
  });
}

function semPermissao() {
  return jsonResponse(
    { error: "Você não tem permissão para pedir transcrição neste projeto." },
    403,
  );
}

function falhaAoEnviar(etapa: string, codigo: string | undefined) {
  console.error(`transcription-enqueue: ${etapa}`, codigo);
  return jsonResponse({ error: "Não foi possível enviar a gravação para transcrição." }, 500);
}

/** Por que uma gravação já enviada não pode voltar para a fila, ou null se pode. */
function motivoDeRecusa(
  existente: { project_id: string; status: string } | null,
  projectId: string,
): string | null {
  if (!existente) return "Não foi possível enviar a gravação.";
  if (existente.project_id !== projectId) return "Essa gravação já foi enviada em outro projeto.";
  if (existente.status !== STATUS.FALHOU) return "Essa gravação já foi enviada para transcrição.";
  return null;
}

async function reenviar(admin: Cliente, quem: Solicitante, entrada: Entrada): Promise<Response> {
  const { data: existente } = await admin
    .from("meeting_transcriptions")
    .select("id, project_id, status")
    .eq("tenant_id", quem.tenantId)
    .eq("recording_item_id", entrada.recordingItemId)
    .maybeSingle();

  const recusa = motivoDeRecusa(existente, entrada.projectId);
  if (recusa) return jsonResponse({ error: recusa }, 409);

  const { data: podePedir } = await admin.rpc("can_request_meeting_transcription", {
    _user_id: quem.userId,
    _project_id: entrada.projectId,
  });
  if (podePedir !== true) return semPermissao();

  // Segredo antes do status: o worker não pode pegar o trabalho com a URL velha.
  const { error: origemError } = await gravarOrigem(admin, existente.id, entrada);
  if (origemError) return falhaAoEnviar("origem do reenvio não gravada", origemError.code);

  const { error: filaError } = await admin
    .from("meeting_transcriptions")
    .update({
      status: STATUS.PENDENTE,
      attempts: 0,
      last_error: null,
      claimed_by: null,
      claimed_at: null,
      finished_at: null,
    })
    .eq("id", existente.id)
    .eq("status", STATUS.FALHOU);
  if (filaError) return falhaAoEnviar("reenvio recusado", filaError.code);

  return jsonResponse({ id: existente.id, status: STATUS.PENDENTE }, 200);
}

async function enviar(
  userClient: Cliente,
  admin: Cliente,
  quem: Solicitante,
  entrada: Entrada,
): Promise<Response> {
  // Sem `.select()`: devolver a linha exigiria a policy de leitura, e pedir transcrição não
  // depende de poder ler o texto dela.
  const id = crypto.randomUUID();
  const { error: insertError } = await userClient.from("meeting_transcriptions").insert({
    id,
    tenant_id: quem.tenantId,
    project_id: entrada.projectId,
    ical_uid: entrada.icalUid,
    event_subject: entrada.eventSubject,
    occurred_at: entrada.occurredAt,
    recording_drive_id: entrada.recordingDriveId,
    recording_item_id: entrada.recordingItemId,
    recording_web_url: entrada.recordingWebUrl,
    requested_by: quem.employeeId,
  });

  if (insertError?.code === PG_UNIQUE_VIOLATION) return await reenviar(admin, quem, entrada);
  if (insertError) {
    console.error("transcription-enqueue: insert recusado", insertError.code);
    return semPermissao();
  }

  const { error: sourceError } = await gravarOrigem(admin, id, entrada);
  if (sourceError) {
    // Sem a URL a linha viraria trabalho eternamente pendente.
    await admin.from("meeting_transcriptions").delete().eq("id", id);
    return falhaAoEnviar("origem não gravada", sourceError.code);
  }

  return jsonResponse({ id, status: STATUS.PENDENTE }, 201);
}

async function atender(req: Request): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Não autorizado" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return jsonResponse({ error: "Token inválido" }, 401);

  const entrada = await lerCorpo(req);
  if (typeof entrada === "string") return jsonResponse({ error: entrada }, 400);

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const quem = await identificarSolicitante(admin, user.id, entrada.projectId);
  if (quem instanceof Response) return quem;

  return await enviar(userClient, admin, quem, entrada);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  try {
    return await atender(req);
  } catch (error: unknown) {
    // Mensagem do erro não vai para o cliente: pode carregar detalhe interno.
    console.error(
      "transcription-enqueue: falha inesperada",
      error instanceof Error ? error.name : "desconhecida",
    );
    return jsonResponse({ error: "Erro ao enviar a gravação para transcrição." }, 500);
  }
});
