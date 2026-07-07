import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// FUNC-J1 — Reenvio de convite por administrador (via UI de funcionários).
//
// Migrado para usar o SMTP do próprio Auth do Supabase (mesmo canal do reset).
// Não usa mais Resend nem gera senha temporária: envia um link de recuperação
// que autentica o funcionário e cai em /primeiro-acesso.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResendInviteRequest {
  employeeId: string;
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

const handler = async (req: Request): Promise<Response> => {
  console.log("Resend employee invite function called");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with user's token to verify permissions
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for privileged operations
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

    const { data: employee, error: empError } = await supabaseAdmin
      .from("employees")
      .select("id, email, auth_id, status, tenant_id")
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

    const redirectTo = firstAccessRedirect(loginUrl);

    // Envia link de acesso via SMTP do Auth (mesmo canal do reset de senha).
    // Type `recovery` funciona para usuários existentes e envia via SMTP configurado.
    const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: employee.email,
      options: { redirectTo },
    });

    if (linkError) {
      console.error("Error sending invite via Auth SMTP:", linkError);
      throw new Error(`Failed to send invite email: ${linkError.message}`);
    }

    // Reinicia o TTL de 7 dias do convite (FUNC-J1).
    const { error: updateEmpError } = await supabaseAdmin
      .from("employees")
      .update({
        must_change_password: true,
        invited_at: new Date().toISOString(),
      })
      .eq("id", employeeId);

    if (updateEmpError) {
      console.error("Error updating employee invited_at:", updateEmpError);
    }

    console.log("Invite resent via Auth SMTP for:", employee.email);

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
