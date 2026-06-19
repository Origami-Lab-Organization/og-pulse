import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// FUNC-J1 — Reenvio do convite de primeiro acesso (PÚBLICO / sem autenticação).
//
// Cenário: funcionário convidado que não concluiu o primeiro acesso (não tem
// sessão válida) e perdeu/não usou a credencial temporária. Esta função gera uma
// nova credencial temporária, reenvia o convite e reinicia o TTL.
//
// Segurança:
// - Sempre responde genérico ({ ok: true }) — nunca revela se a conta existe ou
//   está pendente (evita enumeração).
// - Só age quando o funcionário existe E está com must_change_password = true.
// - Endpoint público: considerar rate limiting / captcha no futuro contra abuso.
// - Logs sem dados pessoais ou credenciais (apenas marcadores de fluxo).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestFirstAccessBody {
  email: string;
  loginUrl: string;
}

function generateTempPassword(length = 12): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const all = uppercase + lowercase + numbers;
  let credential = "";
  credential += uppercase[Math.floor(Math.random() * uppercase.length)];
  credential += lowercase[Math.floor(Math.random() * lowercase.length)];
  credential += numbers[Math.floor(Math.random() * numbers.length)];
  for (let i = 3; i < length; i++) {
    credential += all[Math.floor(Math.random() * all.length)];
  }
  return credential.split("").sort(() => Math.random() - 0.5).join("");
}

// Destino do primeiro acesso a partir do loginUrl do app (FUNC-J1).
function firstAccessRedirect(loginUrl: string): string {
  try {
    const url = new URL(loginUrl);
    url.pathname = "/primeiro-acesso";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return (loginUrl || "").replace(/\/login\/?$/, "") + "/primeiro-acesso";
  }
}

const genericOk = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, loginUrl }: RequestFirstAccessBody = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "campo obrigatório ausente" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const normalized = email.trim().toLowerCase();

    // Só funcionários com convite pendente (must_change_password = true).
    const { data: employee, error: empError } = await adminClient
      .from("employees")
      .select("id, nome, email, auth_id, tenant_id, must_change_password")
      .ilike("email", normalized)
      .eq("must_change_password", true)
      .limit(1)
      .maybeSingle();

    // Resposta genérica: não revela existência/estado da conta.
    if (empError || !employee || !employee.auth_id) {
      console.log("request-first-access: sem convite pendente elegivel");
      return genericOk();
    }

    // Nova credencial temporária — invalida a anterior.
    const newTempPassword = generateTempPassword();

    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(
      employee.auth_id,
      { password: newTempPassword },
    );
    if (updateAuthError) {
      console.error("request-first-access: falha ao atualizar credencial de auth");
      return genericOk();
    }

    // Reinicia o TTL do convite (FUNC-J1).
    await adminClient
      .from("employees")
      .update({ must_change_password: true, invited_at: new Date().toISOString() })
      .eq("id", employee.id);

    // Nome da empresa para personalizar o convite (fallback no template).
    const { data: tenant } = await adminClient
      .from("tenants")
      .select("name")
      .eq("id", employee.tenant_id)
      .maybeSingle();

    // Magic link (FUNC-J1): leva direto à tela de primeiro acesso já autenticado.
    // Fallback para credencial temporária se a geração falhar.
    let actionLink: string | undefined;
    try {
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: employee.email,
        options: { redirectTo: firstAccessRedirect(loginUrl || `${supabaseUrl}/login`) },
      });
      if (linkError) {
        console.error("request-first-access: nao foi possivel gerar o link, usando fallback");
      } else {
        actionLink = linkData?.properties?.action_link ?? undefined;
      }
    } catch (_e) {
      console.error("request-first-access: geracao de link falhou, usando fallback");
    }

    // Reutiliza o template oficial de convite (send-invite-email).
    const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-invite-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: employee.email,
        nome: employee.nome,
        tempPassword: newTempPassword,
        loginUrl: loginUrl || `${supabaseUrl}/login`,
        companyName: tenant?.name ?? undefined,
        actionLink,
      }),
    });

    if (!sendResponse.ok) {
      console.error("request-first-access: falha no envio do convite");
    }

    return genericOk();
  } catch (error: unknown) {
    console.error("request-first-access: erro inesperado:", error instanceof Error ? error.message : "unknown");
    return genericOk();
  }
};

serve(handler);
