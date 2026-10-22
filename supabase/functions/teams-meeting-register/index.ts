// Vincula uma reunião do Teams ao projeto, para a transcrição dela vir sozinha (ADR-0052).
//
// O organizador sai de um id token do Entra validado aqui, e o e-mail dele precisa ser o do
// funcionário logado: a sincronização só traz transcrição das reuniões desse organizador,
// então ninguém consegue puxar para o próprio projeto a reunião de outra pessoa.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validarIdTokenEntra, type IdentidadeEntra } from "../_shared/identidadeEntra.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PG_UNIQUE_VIOLATION = "23505";

interface Entrada {
  projectId: string;
  onlineMeetingId: string;
  joinWebUrl: string | null;
  icalUid: string | null;
  eventSubject: string;
  startsAt: string | null;
  endsAt: string | null;
  isSeries: boolean;
  idToken: string;
}

interface Funcionario {
  id: string;
  email: string;
  tenantId: string;
}

type Cliente = ReturnType<typeof createClient>;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function texto(valor: unknown, maximo: number): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo && limpo.length <= maximo ? limpo : null;
}

function instante(valor: unknown): string | null {
  const ms = Date.parse(typeof valor === "string" ? valor : "");
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

function lerEntrada(body: Record<string, unknown>): Entrada | string {
  const projectId = typeof body.projectId === "string" && UUID_RE.test(body.projectId) ? body.projectId : null;
  if (!projectId) return "Projeto inválido.";

  const onlineMeetingId = texto(body.onlineMeetingId, 1000);
  if (!onlineMeetingId) return "Reunião do Teams inválida.";

  const eventSubject = texto(body.eventSubject, 400);
  if (!eventSubject) return "Título da reunião é obrigatório.";

  const idToken = texto(body.idToken, 20000);
  if (!idToken) return "Credencial da Microsoft ausente.";

  return {
    projectId,
    onlineMeetingId,
    joinWebUrl: texto(body.joinWebUrl, 2000),
    icalUid: texto(body.icalUid, 500),
    eventSubject,
    startsAt: instante(body.startsAt),
    endsAt: instante(body.endsAt),
    isSeries: body.isSeries === true,
    idToken,
  };
}

async function lerCorpo(req: Request): Promise<Entrada | string> {
  try {
    return lerEntrada(await req.json());
  } catch {
    return "Corpo da requisição inválido.";
  }
}

async function funcionarioDoProjeto(
  admin: Cliente,
  userId: string,
  projectId: string,
): Promise<Funcionario | Response> {
  const { data: projeto } = await admin.from("projects").select("tenant_id").eq("id", projectId).maybeSingle();
  if (!projeto) return jsonResponse({ error: "Projeto não encontrado." }, 404);

  const { data: funcionario } = await admin
    .from("employees")
    .select("id, email")
    .eq("auth_id", userId)
    .eq("tenant_id", projeto.tenant_id)
    .maybeSingle();
  if (!funcionario?.email) {
    return jsonResponse({ error: "Sem cadastro de colaborador neste tenant." }, 403);
  }
  return { id: funcionario.id, email: funcionario.email.trim().toLowerCase(), tenantId: projeto.tenant_id };
}

/** A mesma regra da policy de pedir transcrição (`can_request_meeting_transcription`). */
async function semPermissao(admin: Cliente, userId: string, projectId: string): Promise<Response | null> {
  const { data: podePedir } = await admin.rpc("can_request_meeting_transcription", {
    _user_id: userId,
    _project_id: projectId,
  });
  return podePedir === true
    ? null
    : jsonResponse({ error: "Você não tem permissão para trazer transcrições a este projeto." }, 403);
}

async function identidadeConferida(entrada: Entrada, funcionario: Funcionario): Promise<IdentidadeEntra | Response> {
  const identidade = await validarIdTokenEntra(
    entrada.idToken,
    Deno.env.get("MICROSOFT_CLIENT_ID") ?? "",
    Deno.env.get("MICROSOFT_TENANT_ID") ?? "",
  );
  if (!identidade) return jsonResponse({ error: "Não foi possível validar sua conta Microsoft." }, 401);
  if (identidade.email !== funcionario.email) {
    return jsonResponse({ error: "A conta Microsoft conectada não é a sua conta do Pulse." }, 403);
  }
  return identidade;
}

async function vincular(admin: Cliente, entrada: Entrada, funcionario: Funcionario, oid: string) {
  const { error } = await admin.from("project_online_meetings").insert({
    tenant_id: funcionario.tenantId,
    project_id: entrada.projectId,
    online_meeting_id: entrada.onlineMeetingId,
    organizer_entra_id: oid,
    join_web_url: entrada.joinWebUrl,
    ical_uid: entrada.icalUid,
    event_subject: entrada.eventSubject,
    starts_at: entrada.startsAt,
    ends_at: entrada.endsAt,
    is_series: entrada.isSeries,
    registered_by: funcionario.id,
  });
  if (!error || error.code === PG_UNIQUE_VIOLATION) {
    return jsonResponse({ ok: true }, error ? 200 : 201);
  }
  console.error("teams-meeting-register: vínculo não gravado", error.code);
  return jsonResponse({ error: "Não foi possível vincular a reunião ao projeto." }, 500);
}

async function atender(req: Request): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Não autorizado" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return jsonResponse({ error: "Token inválido" }, 401);

  const entrada = await lerCorpo(req);
  if (typeof entrada === "string") return jsonResponse({ error: entrada }, 400);

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const funcionario = await funcionarioDoProjeto(admin, user.id, entrada.projectId);
  if (funcionario instanceof Response) return funcionario;

  const recusa = await semPermissao(admin, user.id, entrada.projectId);
  if (recusa) return recusa;

  const identidade = await identidadeConferida(entrada, funcionario);
  if (identidade instanceof Response) return identidade;

  return await vincular(admin, entrada, funcionario, identidade.oid);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405);

  try {
    return await atender(req);
  } catch (error: unknown) {
    console.error(
      "teams-meeting-register: falha inesperada",
      error instanceof Error ? error.name : "desconhecida",
    );
    return jsonResponse({ error: "Erro ao vincular a reunião ao projeto." }, 500);
  }
});
