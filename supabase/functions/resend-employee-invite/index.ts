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

    // Update employee record with new temp password
    const { error: updateEmpError } = await supabaseAdmin
      .from("employees")
      .update({
        temp_password: newTempPassword,
        must_change_password: true,
      })
      .eq("id", employeeId);

    if (updateEmpError) {
      console.error("Error updating employee:", updateEmpError);
      throw new Error("Failed to update employee record");
    }

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
      subject: "Novo Convite de Acesso - OG Pulse",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Novo Convite de Acesso</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a1a1a; margin: 0; font-size: 28px;">OG Pulse</h1>
              <p style="color: #666; margin-top: 5px;">Gestão de Equipes</p>
            </div>
            
            <h2 style="color: #333; margin-bottom: 20px;">Olá, ${employee.nome}!</h2>
            
            <p style="margin-bottom: 20px;">Um novo convite de acesso foi gerado para você no OG Pulse.</p>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${employee.email}</p>
              <p style="margin: 0;"><strong>Senha temporária:</strong> <code style="background-color: #e9ecef; padding: 2px 8px; border-radius: 4px;">${newTempPassword}</code></p>
            </div>
            
            <p style="margin-bottom: 25px;">Use estas credenciais para acessar o sistema:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600;">Acessar Sistema</a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <strong>Importante:</strong> Por segurança, você será solicitado a criar uma nova senha no primeiro acesso.
            </p>
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
