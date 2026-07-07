import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// FUNC-J1 — Reenvio do convite de primeiro acesso (PÚBLICO / sem autenticação).
//
// Usa o SMTP do próprio Auth do Supabase (mesmo caminho do reset de senha).
// Não depende mais do Resend nem gera senha temporária: envia um link de
// recuperação que autentica o funcionário e cai em /primeiro-acesso, onde ele
// define a senha via updateUser({ password }).
//
// Segurança:
// - Sempre responde genérico ({ ok: true }) — nunca revela se a conta existe ou
//   está pendente (evita enumeração).
// - Só age quando o funcionário existe E está com must_change_password = true.
// - Endpoint público: considerar rate limiting / captcha no futuro contra abuso.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestFirstAccessBody {
  email: string;
  loginUrl: string;
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
      .select("id, email, auth_id, must_change_password")
      .ilike("email", normalized)
      .eq("must_change_password", true)
      .limit(1)
      .maybeSingle();

    if (empError || !employee || !employee.auth_id) {
      console.log("request-first-access: sem convite pendente elegivel");
      return genericOk();
    }

    const redirectTo = firstAccessRedirect(loginUrl || `${supabaseUrl}/login`);

    // Envia link de recuperação via SMTP do Auth. Mesmo canal que já entrega o
    // reset de senha — não passa mais pelo Resend. O link autentica e redireciona
    // para /primeiro-acesso, onde o funcionário define a senha.
    const { error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: employee.email,
      options: { redirectTo },
    });

    if (linkError) {
      console.error("request-first-access: falha ao gerar/enviar link de acesso");
      return genericOk();
    }

    // Reinicia o TTL do convite (FUNC-J1).
    await adminClient
      .from("employees")
      .update({ must_change_password: true, invited_at: new Date().toISOString() })
      .eq("id", employee.id);

    console.log("request-first-access: link de primeiro acesso enviado via SMTP do Auth");
    return genericOk();
  } catch (error: unknown) {
    console.error("request-first-access: erro inesperado:", error instanceof Error ? error.message : "unknown");
    return genericOk();
  }
};

serve(handler);
