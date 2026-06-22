import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  to: string;
  nome: string;
  tempPassword: string;
  loginUrl: string;
  companyName?: string;
  // Magic link (FUNC-J1): quando presente, o e-mail leva o usuário DIRETO à tela
  // de primeiro acesso já autenticado, sem senha temporária. Sem ele, cai no
  // fallback de senha temporária + login.
  actionLink?: string;
}

// Acrescenta o e-mail do convidado ao link de acesso (?email=...) para que a
// tela de login já chegue pré-preenchida (FUNC-J1).
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting send-invite-email function with Resend");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("RESEND_API_KEY não configurada");
    }

    const resend = new Resend(resendApiKey);

    const { to, nome, tempPassword, loginUrl, companyName, actionLink }: InviteEmailRequest = await req.json();
    console.log("Email request received for:", to);

    const company = companyName?.trim() || "Origami Pulse";
    const passwordless = Boolean(actionLink);
    // Passwordless: link mágico leva direto à tela de primeiro acesso, autenticado.
    // Fallback: link de login com e-mail pré-preenchido + senha temporária no corpo.
    const ctaLink = actionLink || buildAccessUrl(loginUrl, to);
    const ctaLabel = passwordless ? "Definir minha senha e acessar" : "Acessar o Origami Pulse";

    const introBlock = passwordless
      ? `<p>Você foi convidado(a) para acessar o <strong>Origami Pulse</strong> da <strong>${company}</strong>. Clique no botão abaixo para criar sua senha pessoal e entrar — não é preciso digitar nenhuma senha temporária.</p>`
      : `<p>Você foi convidado(a) para acessar o <strong>Origami Pulse</strong> da <strong>${company}</strong>. Use a senha temporária abaixo para entrar:</p>
              <div class="credentials">
                <div class="credential-item">
                  <div class="label">E-mail</div>
                  <div class="value">${to}</div>
                </div>
                <div class="credential-item">
                  <div class="label">Senha temporária</div>
                  <div class="value">${tempPassword}</div>
                </div>
              </div>`;

    const infoBlock = passwordless
      ? `<div class="info"><strong>Este link é pessoal e tem validade limitada.</strong> Se ele expirar, use "Reenviar e-mail de primeiro acesso" na tela de login.</div>`
      : `<div class="info"><strong>Você precisará criar uma nova senha no primeiro acesso.</strong> Este convite é válido por 7 dias.</div>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
        <style>
          /* Origami UI — tokens do Design System (origami-ds.html) */
          body { font-family: 'Inter', 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #252525; background: #FBFBF7; margin: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 24px; }
          .card { background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #ECEDE1; box-shadow: 0 1px 2px rgba(37,37,37,0.07); }
          .accent-bar { height: 4px; background: #0E895D; }
          .header { padding: 28px 32px 8px; text-align: center; }
          .brand { margin: 0; font-size: 22px; font-weight: 800; color: #252525; letter-spacing: -0.01em; }
          .brand .accent { color: #0E895D; }
          .header p { margin: 6px 0 0; color: #6F7167; font-size: 13px; }
          .content { padding: 16px 32px 32px; }
          .content p { color: #3A3A36; }
          .credentials { background: #F6F7EB; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #DEE0D0; }
          .credential-item { margin: 10px 0; }
          .label { font-weight: 600; color: #6F7167; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
          .value { font-family: 'JetBrains Mono', 'Courier New', monospace; background: #E9F7F0; color: #063D2B; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 4px; font-size: 15px; }
          .button { display: inline-block; background: #0E895D; color: #FFFFFF !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; }
          .button-wrap { text-align: center; margin: 28px 0; }
          .info { background: #E9F7F0; border: 1px solid #93DDBC; color: #063D2B; padding: 14px; border-radius: 8px; margin-top: 20px; font-size: 14px; }
          .muted { color: #6F7167; font-size: 13px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="accent-bar"></div>
            <div class="header">
              <h1 class="brand">Origami <span class="accent">Pulse</span></h1>
              <p>Convite de acesso · ${company}</p>
            </div>
            <div class="content">
              <p>Olá <strong>${nome}</strong>,</p>
              ${introBlock}

              <div class="button-wrap">
                <a href="${ctaLink}" class="button">${ctaLabel}</a>
              </div>

              ${infoBlock}

              <p class="muted">
                Se você não esperava este convite, pode ignorar este e-mail.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: Deno.env.get("RESEND_FROM_EMAIL") || "Origami Pulse <noreply@resend.dev>",
      to: [to],
      subject: `Seu convite de acesso ao Origami Pulse · ${company}`,
      html: htmlContent,
    });

    console.log("Email sent successfully via Resend:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Email enviado com sucesso", data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-invite-email:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
