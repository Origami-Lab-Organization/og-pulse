// Enfileira a transcrição de uma gravação de reunião do OneDrive (ADR-0039).
//
// Por que esta função existe, se o cliente já fala com o Postgres:
//
//   A URL pré-autenticada da gravação (`@microsoft.graph.downloadUrl`) é o que permite ao
//   worker na VM baixar o arquivo sem nunca receber credencial do Graph. Ela vale por si
//   só — quem tem a string abre a gravação. Por isso mora em
//   `meeting_transcription_sources`, que não tem policy nenhuma: só service role alcança.
//   Gravar ali exige servidor, e é isto aqui.
//
// A AUTORIZAÇÃO CONTINUA NA RLS. O insert da transcrição vai com o token da pessoa, não
// com service role: quem decide se ela pode pedir transcrição naquele projeto é a policy
// (`transcricao:solicitar` + alcance ao projeto). O service role entra só depois, para o
// segredo — e para desfazer, se o segredo não gravar.
//
// A URL NUNCA É REGISTRADA nem devolvida ao cliente (.harness/patterns/logging.md).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// A VM vai buscar esta URL. Sem restrição de destino, um corpo malicioso faria a VM
// baixar o que o cliente quisesse — a função viraria porta de SSRF para dentro da nossa
// rede. Só hosts de onde o Graph serve arquivo.
const HOSTS_PERMITIDOS = [
  ".sharepoint.com",
  ".onedrive.com",
  ".1drv.com",
  ".microsoft.com",
  ".office.com",
];

// Validade máxima aceita. O Graph entrega URL de vida curta; prazo longo demais no corpo
// indica cliente inventando valor, não gravação real.
const VALIDADE_MAXIMA_MS = 24 * 60 * 60 * 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Entrada {
  projectId: string;
  icalUid: string | null;
  eventSubject: string;
  occurredAt: string | null;
  recordingDriveId: string;
  recordingItemId: string;
  downloadUrl: string;
  expiresAt: string;
}

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

/** Só https e só host de onde o Graph serve arquivo. Ver HOSTS_PERMITIDOS. */
function urlDeGravacaoValida(valor: unknown): string | null {
  const bruto = typeof valor === "string" ? valor.trim() : "";
  if (!bruto) return null;

  let url: URL;
  try {
    url = new URL(bruto);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  const permitido = HOSTS_PERMITIDOS.some((sufixo) => host.endsWith(sufixo));
  return permitido ? bruto : null;
}

/** Instante ISO no futuro, dentro da validade máxima. */
function expiracaoValida(valor: unknown): string | null {
  const texto = typeof valor === "string" ? valor : "";
  const instante = Date.parse(texto);
  if (Number.isNaN(instante)) return null;

  const agora = Date.now();
  if (instante <= agora || instante > agora + VALIDADE_MAXIMA_MS) return null;
  return new Date(instante).toISOString();
}

/** Devolve a entrada validada ou a mensagem do primeiro problema encontrado. */
function lerEntrada(body: Record<string, unknown>): Entrada | string {
  const projectId = typeof body.projectId === "string" && UUID_RE.test(body.projectId)
    ? body.projectId
    : null;
  if (!projectId) return "Projeto inválido.";

  const eventSubject = textoObrigatorio(body.eventSubject);
  if (!eventSubject) return "Título da reunião é obrigatório.";

  const recordingDriveId = textoObrigatorio(body.recordingDriveId);
  const recordingItemId = textoObrigatorio(body.recordingItemId);
  if (!recordingDriveId || !recordingItemId) {
    return "A gravação precisa vir com drive e item — um sem o outro não resolve no Graph.";
  }

  const downloadUrl = urlDeGravacaoValida(body.downloadUrl);
  if (!downloadUrl) return "Endereço da gravação inválido.";

  const expiresAt = expiracaoValida(body.expiresAt);
  if (!expiresAt) return "Validade do endereço da gravação inválida.";

  const occurredAt = typeof body.occurredAt === "string" && !Number.isNaN(Date.parse(body.occurredAt))
    ? new Date(body.occurredAt).toISOString()
    : null;

  return {
    projectId,
    icalUid: textoObrigatorio(body.icalUid, 500),
    eventSubject,
    occurredAt,
    recordingDriveId,
    recordingItemId,
    downloadUrl,
    expiresAt,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Token inválido" }, 401);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Corpo da requisição inválido" }, 400);
    }

    const entrada = lerEntrada(body);
    if (typeof entrada === "string") {
      return jsonResponse({ error: entrada }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Tenant e autor saem do servidor, não do corpo: o cliente não escolhe em que tenant
    // grava nem em nome de quem pede.
    const { data: projeto } = await adminClient
      .from("projects")
      .select("tenant_id")
      .eq("id", entrada.projectId)
      .maybeSingle();

    if (!projeto) {
      return jsonResponse({ error: "Projeto não encontrado." }, 404);
    }

    const { data: solicitante } = await adminClient
      .from("employees")
      .select("id")
      .eq("auth_id", user.id)
      .eq("tenant_id", projeto.tenant_id)
      .maybeSingle();

    if (!solicitante) {
      return jsonResponse({ error: "Sem cadastro de colaborador neste tenant." }, 403);
    }

    // Insert com o token da pessoa: a policy decide. Erro aqui é falta de permissão ou
    // gravação já enfileirada — nunca mascarar com service role.
    const { data: transcricao, error: insertError } = await userClient
      .from("meeting_transcriptions")
      .insert({
        tenant_id: projeto.tenant_id,
        project_id: entrada.projectId,
        ical_uid: entrada.icalUid,
        event_subject: entrada.eventSubject,
        occurred_at: entrada.occurredAt,
        recording_drive_id: entrada.recordingDriveId,
        recording_item_id: entrada.recordingItemId,
        requested_by: solicitante.id,
      })
      .select("id, status")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return jsonResponse({ error: "Essa gravação já foi enfileirada." }, 409);
      }
      console.error("transcription-enqueue: insert recusado", insertError.code);
      return jsonResponse(
        { error: "Você não tem permissão para pedir transcrição neste projeto." },
        403,
      );
    }

    // O segredo, com service role. Fora do alcance de qualquer policy.
    const { error: sourceError } = await adminClient
      .from("meeting_transcription_sources")
      .insert({
        transcription_id: transcricao.id,
        download_url: entrada.downloadUrl,
        expires_at: entrada.expiresAt,
      });

    if (sourceError) {
      // Sem a URL o worker não tem como baixar: a linha viraria job eternamente pendente.
      // Melhor desfazer e devolver erro do que deixar lixo na fila.
      await adminClient.from("meeting_transcriptions").delete().eq("id", transcricao.id);
      console.error("transcription-enqueue: origem não gravada", sourceError.code);
      return jsonResponse({ error: "Não foi possível enfileirar a transcrição." }, 500);
    }

    return jsonResponse({ id: transcricao.id, status: transcricao.status }, 201);
  } catch (error: unknown) {
    // Mensagem do erro não vai para o cliente: pode carregar detalhe interno.
    console.error("transcription-enqueue: falha inesperada", error instanceof Error ? error.name : "desconhecida");
    return jsonResponse({ error: "Erro ao enfileirar a transcrição." }, 500);
  }
});
