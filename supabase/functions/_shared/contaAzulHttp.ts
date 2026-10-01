import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { FalhaContaAzul } from "./contaAzul.ts";
import { MotivoFalha } from "./contaAzulTipos.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** `DOMException.name` de `AbortSignal.timeout`. */
const ERRO_DE_TEMPO = "TimeoutError";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CAPACIDADE_GERIR = "integracoes:gerir";

export class Recusa extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export const clienteAdmin = (): SupabaseClient =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

/** Valida a sessão aqui dentro (verify_jwt desligado, como nas outras funções). */
export async function usuarioDaSessao(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Recusa("Não autenticado.", 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Recusa("Sessão inválida.", 401);
  return data.user.id;
}

export async function corpoDe(req: Request): Promise<Record<string, unknown>> {
  const corpo = await req.json().catch(() => ({}));
  return corpo && typeof corpo === "object" ? (corpo as Record<string, unknown>) : {};
}

export function tenantDe(corpo: Record<string, unknown>): string {
  const id = typeof corpo.tenant_id === "string" ? corpo.tenant_id : "";
  if (!UUID.test(id)) throw new Recusa("Empresa inválida.", 400);
  return id;
}

export async function exigirCapacidade(admin: SupabaseClient, userId: string, tenantId: string): Promise<void> {
  const { data, error } = await admin.rpc("has_capability", {
    _user_id: userId,
    _tenant_id: tenantId,
    _capability: CAPACIDADE_GERIR,
  });
  if (error) throw new Recusa("Não foi possível conferir sua permissão.", 500);
  if (data !== true) throw new Recusa("Você não tem permissão para gerir as integrações desta empresa.", 403);
}

const STATUS_DA_FALHA: Record<MotivoFalha, number> = {
  [MotivoFalha.Reconectar]: 409,
  [MotivoFalha.Limite]: 429,
  [MotivoFalha.Indisponivel]: 502,
  [MotivoFalha.Recusado]: 502,
  [MotivoFalha.Configuracao]: 503,
};

export function respostaDeErro(funcao: string, erro: unknown): Response {
  if (erro instanceof Recusa) return json({ error: erro.message }, erro.status);
  if (erro instanceof FalhaContaAzul) return json({ error: erro.message, motivo: erro.motivo }, STATUS_DA_FALHA[erro.motivo]);
  if (erro instanceof DOMException && erro.name === ERRO_DE_TEMPO) {
    return json({ error: "O Conta Azul demorou demais para responder. Tente de novo." }, 504);
  }
  // Só o nome do erro: mensagem e corpo podem carregar token ou código de autorização.
  console.error(`${funcao}: falha inesperada`, (erro as Error)?.name);
  return json({ error: "Não foi possível falar com o Conta Azul agora." }, 502);
}
