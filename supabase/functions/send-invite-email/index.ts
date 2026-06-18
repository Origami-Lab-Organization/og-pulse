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

    const { to, nome, tempPassword, loginUrl, companyName }: InviteEmailRequest = await req.json();
    console.log("Email request received for:", to);

    const company = companyName?.trim() || "Origami Pulse";
    const accessUrl = buildAccessUrl(loginUrl, to);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; background: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
          .header { background: #111827; color: #ffffff; padding: 28px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; }
          .header p { margin: 6px 0 0; color: #9ca3af; font-size: 13px; }
          .content { padding: 32px; }
          .credentials { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .credential-item { margin: 10px 0; }
          .label { font-weight: 600; color: #6b7280; font-size: 13px; }
          .value { font-family: 'Courier New', monospace; background: #eef2ff; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 4px; font-size: 15px; user-select: all; }
          .button { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; }
          .button-wrap { text-align: center; margin: 28px 0; }
          .info { background: #eff6ff; border: 1px solid #bfdbfe; padding: 14px; border-radius: 8px; margin-top: 20px; font-size: 14px; }
          .muted { color: #6b7280; font-size: 13px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>Origami Pulse</h1>
              <p>Convite de acesso · ${company}</p>
            </div>
            <div class="content">
              <p>Olá <strong>${nome}</strong>,</p>
              <p>Você foi convidado(a) para acessar o <strong>Origami Pulse</strong> da <strong>${company}</strong>. Use a senha temporária abaixo para entrar:</p>

              <div class="credentials">
                <div class="credential-item">
                  <div class="label">E-mail</div>
                  <div class="value">${to}</div>
                </div>
                <div class="credential-item">
                  <div class="label">Senha temporária</div>
                  <div class="value">${tempPassword}</div>
                </div>
              </div>

              <div class="button-wrap">
                <a href="${accessUrl}" class="button">Acessar o Origami Pulse</a>
              </div>

              <div class="info">
                <strong>Você precisará criar uma nova senha no primeiro acesso.</strong>
                Este convite é válido por 7 dias.
              </div>

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
