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
    
    const { to, nome, tempPassword, loginUrl }: InviteEmailRequest = await req.json();
    console.log("Email request received for:", to);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .credential-item { margin: 10px 0; }
          .label { font-weight: bold; color: #6b7280; }
          .value { font-family: monospace; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bem-vindo ao Sistema!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${nome}</strong>,</p>
            <p>Você foi cadastrado em nosso sistema. Abaixo estão suas credenciais de acesso:</p>
            
            <div class="credentials">
              <div class="credential-item">
                <div class="label">Email:</div>
                <div class="value">${to}</div>
              </div>
              <div class="credential-item">
                <div class="label">Senha temporária:</div>
                <div class="value">${tempPassword}</div>
              </div>
            </div>
            
            <a href="${loginUrl}" class="button">Acessar o Sistema</a>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Por segurança, você será obrigado a alterar sua senha no primeiro acesso.
            </div>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              Se você não solicitou este cadastro, por favor ignore este email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: Deno.env.get("RESEND_FROM_EMAIL") || "Propulsr <noreply@resend.dev>",
      to: [to],
      subject: "Bem-vindo! Suas credenciais de acesso",
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
