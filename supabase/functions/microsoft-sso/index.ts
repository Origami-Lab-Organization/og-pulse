import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6";

/**
 * Troca uma prova de identidade do Microsoft Entra ID por uma sessão do Supabase.
 *
 * Existe porque o provider Azure do Supabase Auth não está disponível no backend
 * gerenciado pelo Lovable Cloud (ver ADR-0016). O front obtém a prova pela MSAL
 * e esta função a valida antes de emitir a sessão.
 *
 * ESTA FUNÇÃO É A PORTA DE ENTRADA DO SISTEMA. Qualquer relaxamento na validação
 * vira bypass de autenticação para qualquer funcionário, inclusive admin. As
 * checagens abaixo não são redundantes:
 *
 *   1. assinatura verificada contra o JWKS do Entra ID — nunca só decodificar;
 *   2. `aud` igual ao NOSSO client id, senão uma credencial emitida para outro
 *      app seria aceita;
 *   3. `iss` e `tid` iguais ao NOSSO tenant, senão qualquer tenant Microsoft do
 *      mundo entraria;
 *   4. expiração — garantida pelo jwtVerify;
 *   5. o e-mail precisa corresponder a funcionário existente e não bloqueado.
 *      Esta função NUNCA cria usuário.
 *
 * client id e tenant id vêm do ambiente, jamais do corpo da requisição. Nenhum
 * material de credencial é registrado em log — só códigos de erro.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Status que impedem acesso, espelhando o AuthContext do front. */
const BLOCKED_STATUSES = ["bloqueado", "arquivado"];
/** Convite ainda não confirmado — o login por SSO o ativa. */
const PENDING_STATUS = "aguardando_confirmacao";

interface RequestBody {
  idToken?: string;
}

interface EntraClaims {
  email?: string;
  preferred_username?: string;
  tid?: string;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const tenantId = Deno.env.get("MICROSOFT_TENANT_ID");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!clientId || !tenantId || !supabaseUrl || !serviceRoleKey) {
    console.error("microsoft-sso: ambiente incompleto");
    return jsonResponse({ error: "Integração não configurada." }, 500);
  }

  let idToken: string;
  try {
    const body = (await req.json()) as RequestBody;
    if (!body.idToken || typeof body.idToken !== "string") {
      return jsonResponse({ error: "Credencial ausente." }, 400);
    }
    idToken = body.idToken;
  } catch {
    return jsonResponse({ error: "Corpo inválido." }, 400);
  }

  // ── 1. Validação criptográfica ─────────────────────────────────────────────
  let claims: EntraClaims;
  try {
    const jwks = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),
    );

    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      audience: clientId,
    });

    claims = payload as EntraClaims;
  } catch (error) {
    // Só o código do erro (ex.: ERR_JWT_EXPIRED). Nada do conteúdo recebido.
    const code = (error as { code?: string }).code ?? "verificacao_falhou";
    console.error("microsoft-sso: identidade rejeitada:", code);
    return jsonResponse({ error: "Não foi possível validar sua identidade." }, 401);
  }

  // `tid` reforça o tenant além do issuer — os dois precisam bater.
  if (claims.tid !== tenantId) {
    console.error("microsoft-sso: tid fora do tenant esperado");
    return jsonResponse({ error: "Conta fora da organização." }, 403);
  }

  const email = (claims.email ?? claims.preferred_username ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    console.error("microsoft-sso: identidade sem e-mail utilizavel");
    return jsonResponse({ error: "Sua conta Microsoft não expôs um e-mail." }, 400);
  }

  // ── 2. O e-mail precisa ser de funcionário apto ────────────────────────────
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id, status, auth_id, must_change_password")
    .eq("email", email)
    .maybeSingle();

  if (employeeError) {
    console.error("microsoft-sso: erro ao buscar funcionario:", employeeError.message);
    return jsonResponse({ error: "Falha ao verificar seu acesso." }, 500);
  }

  // Mensagem específica não é enumeração: chegar aqui exige uma credencial
  // assinada pelo tenant da empresa, então quem pergunta já é de dentro.
  if (!employee || !employee.auth_id) {
    return jsonResponse(
      { error: "Não encontramos um funcionário ativo com este e-mail no Pulse." },
      403,
    );
  }

  if (BLOCKED_STATUSES.includes(employee.status)) {
    return jsonResponse(
      { error: "Seu acesso está bloqueado. Fale com o administrador." },
      403,
    );
  }

  // ── 3. Emissão da sessão ───────────────────────────────────────────────────
  // `magiclink` exige usuário existente — não cria conta nova nem por acidente.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const oneTimeHash = link?.properties?.hashed_token;
  if (linkError || !oneTimeHash) {
    console.error("microsoft-sso: falha ao emitir sessao:", linkError?.message);
    return jsonResponse({ error: "Falha ao iniciar sua sessão." }, 500);
  }

  // Quem entra por SSO não precisa de senha; exigir troca prenderia a pessoa
  // numa tela para criar credencial que ela nunca vai usar.
  if (employee.must_change_password || employee.status === PENDING_STATUS) {
    const { error: updateError } = await admin
      .from("employees")
      .update({
        must_change_password: false,
        ...(employee.status === PENDING_STATUS ? { status: "ativo" } : {}),
      })
      .eq("id", employee.id);

    if (updateError) {
      // Não impede o login: a sessão é válida e o pior caso é uma tela extra.
      console.error("microsoft-sso: falha ao normalizar funcionario:", updateError.message);
    }
  }

  return jsonResponse({ tokenHash: oneTimeHash }, 200);
});
