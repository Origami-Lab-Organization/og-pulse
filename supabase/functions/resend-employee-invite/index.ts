import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResendInviteRequest {
  employeeId: string;
  loginUrl: string;
}

const generateTempPassword = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Acrescenta o e-mail ao link de acesso (?email=...) para pré-preencher o login (FUNC-J1).
function buildAccessUrl(loginUrl: string, email: string): string {
  try {
    const url = new URL(loginUrl);
    url.searchParams.set("email", email);
    return url.toString();
  } catch {
    const separator = loginUrl.includes("?") ? "&" : "?";
    return `${loginUrl}${separator}email=${encodeURIComponent(email)}`;
  }
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

const handler = async (req: Request): Promise<Response> => {
  console.log("Resend employee invite function called");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with user's token to verify permissions
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Get the current employee to find tenant
    const { data: currentEmployee, error: currentEmpError } = await supabaseUser
      .from("employees")
      .select("tenant_id")
      .eq("auth_id", user.id)
      .single();

    if (currentEmpError || !currentEmployee) {
      throw new Error("Current employee not found");
    }

    // Check if user is admin
    const { data: roleData } = await supabaseUser
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("tenant_id", currentEmployee.tenant_id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      throw new Error("Only admins can resend invites");
    }

    const body: ResendInviteRequest = await req.json();
    const { employeeId, loginUrl } = body;

    if (!employeeId || !loginUrl) {
      throw new Error("Missing required fields: employeeId, loginUrl");
    }

    console.log("Resending invite for employee:", employeeId);

    // Get the employee to resend invite
    const { data: employee, error: empError } = await supabaseAdmin
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .eq("tenant_id", currentEmployee.tenant_id)
      .single();

    if (empError || !employee) {
      throw new Error("Employee not found or not in your tenant");
    }

    if (employee.status !== "aguardando_confirmacao") {
      throw new Error("Can only resend invite to employees awaiting confirmation");
    }

    if (!employee.auth_id) {
      throw new Error("Employee has no auth account");
    }

    // Generate new temporary password
    const newTempPassword = generateTempPassword();

    // Update user's password in Supabase Auth
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      employee.auth_id,
      { password: newTempPassword }
    );

    if (updateAuthError) {
      console.error("Error updating auth password:", updateAuthError);
      throw new Error("Failed to update password");
    }

    // Update employee record — reinicia o TTL de 7 dias do convite (FUNC-J1)
    const { error: updateEmpError } = await supabaseAdmin
      .from("employees")
      .update({
        must_change_password: true,
        invited_at: new Date().toISOString(),
      })
      .eq("id", employeeId);

    if (updateEmpError) {
      console.error("Error updating employee:", updateEmpError);
      throw new Error("Failed to update employee record");
    }

    // Nome da empresa para personalizar o convite (fallback "Origami Pulse").
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", currentEmployee.tenant_id)
      .maybeSingle();
    const companyName = tenant?.name ?? "Origami Pulse";
    const accessUrl = buildAccessUrl(loginUrl, employee.email);

    // Magic link (FUNC-J1): leva direto à tela de primeiro acesso já autenticado.
    let actionLink: string | undefined;
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: employee.email,
        options: { redirectTo: firstAccessRedirect(loginUrl) },
      });
      if (linkError) {
        console.error("resend: nao foi possivel gerar o link, usando fallback");
      } else {
        actionLink = linkData?.properties?.action_link ?? undefined;
      }
    } catch (_e) {
      console.error("resend: geracao de link falhou, usando fallback");
    }

    const passwordless = Boolean(actionLink);
    const ctaLink = actionLink || accessUrl;
    const ctaLabel = passwordless ? "Definir minha senha e acessar" : "Acessar o Origami Pulse";
    const credentialsBlock = passwordless
      ? `<p style="margin-bottom: 20px;">Clique no botão abaixo para criar sua senha e acessar — não é preciso digitar nenhuma senha temporária.</p>`
      : `<div style="background-color: #F6F7EB; border: 1px solid #DEE0D0; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <p style="margin: 0 0 10px 0;"><strong>E-mail:</strong> ${employee.email}</p>
              <p style="margin: 0;"><strong>Senha temporária:</strong> <code style="font-family: 'JetBrains Mono','Courier New',monospace; background-color: #E9F7F0; color: #063D2B; padding: 4px 10px; border-radius: 4px;">${newTempPassword}</code></p>
            </div>`;
    const infoBlock = passwordless
      ? `<strong>Este link é pessoal e tem validade limitada.</strong> Se expirar, use "Reenviar e-mail de primeiro acesso" na tela de login.`
      : `<strong>Você precisará criar uma nova senha no primeiro acesso.</strong> Este convite é válido por 7 dias.`;

    // Send new invite email
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");

    if (!resendApiKey || !resendFromEmail) {
      throw new Error("Email configuration missing");
    }

    const resend = new Resend(resendApiKey);

    const { error: emailError } = await resend.emails.send({
      from: resendFromEmail,
      to: [employee.email],
      subject: `Novo convite de acesso ao Origami Pulse · ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Novo Convite de Acesso</title>
        </head>
        <body style="font-family: 'Inter','Segoe UI',Tahoma,sans-serif; line-height: 1.6; color: #252525; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #FBFBF7;">
          <div style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #ECEDE1; box-shadow: 0 1px 2px rgba(37,37,37,0.07);">
            <div style="height: 4px; background-color: #0E895D;"></div>
            <div style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #252525; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.01em;">Origami <span style="color: #0E895D;">Pulse</span></h1>
                <p style="color: #6F7167; margin-top: 5px; font-size: 13px;">Convite de acesso · ${companyName}</p>
              </div>

              <h2 style="color: #252525; margin-bottom: 20px;">Olá, ${employee.nome}!</h2>

              <p style="margin-bottom: 20px; color: #3A3A36;">Um novo convite de acesso foi gerado para você no Origami Pulse da <strong>${companyName}</strong>.</p>

              ${credentialsBlock}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${ctaLink}" style="display: inline-block; background-color: #0E895D; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">${ctaLabel}</a>
              </div>

              <div style="background-color: #E9F7F0; border: 1px solid #93DDBC; color: #063D2B; padding: 14px; border-radius: 8px; margin-top: 20px; font-size: 14px;">
                ${infoBlock}
              </div>
            </div>
          </div>

          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
            Este é um email automático, por favor não responda.
          </p>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error("Failed to send invite email");
    }

    console.log("Invite resent successfully for:", employee.email);

    return new Response(
      JSON.stringify({ success: true, message: "Invite resent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in resend-employee-invite:", errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
