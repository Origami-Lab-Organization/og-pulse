import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateEmployeeRequest {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  cpf: string;
  dataAdmissao: string;
  isGerente: boolean;
  systemRole: "admin" | "manager" | "user";
  alocaEmProjetos?: boolean;
  status: string;
  salarioMensal: number;
  beneficios: number;
  encargos: number;
  tipoContratacao: string;
  jornadaMensal: number;
  jornadaDiaria?: number;
  salarioLiquido: number;
  fgts: number;
  inssEmpresa: number;
  decimoTerceiro: number;
  ferias: number;
  proLabore: number;
  // New cost fields
  bolsaAuxilio: number;
  valorContratoPj: number;
  dividendos: number;
  provisao13: number;
  provisaoFerias: number;
  provisaoRecesso: number;
  totalMonthlyCostEstimated: number;
  totalAnnualCostEstimated: number;
  breakdownJson: Record<string, unknown> | null;
  dataNascimento: string | null;
  fotoUrl: string | null;
  tenantId: string;
  loginUrl: string;
  // Dados bancários / PIX (opcionais)
  pixKeyType?: string | null;
  pixKey?: string | null;
  bankName?: string | null;
  bankAgency?: string | null;
  bankAccount?: string | null;
  bankAccountType?: string | null;
  candidateId?: string | null;
  // Contrato de experiência (CLT Art. 445 §único) — só relevante quando tipoContratacao = 'CLT'
  contratoExperiencia?: boolean;
  experienciaPeriodo1Fim?: string | null;
  experienciaProrrogado?: boolean;
  experienciaPeriodo2Fim?: string | null;
}

const PUBLIC_APP_ORIGIN = "https://origamipulse.com.br";

// Deriva a URL de destino do primeiro acesso a partir do loginUrl do app (FUNC-J1).
function firstAccessRedirect(_loginUrl: string): string {
  // Links de Auth abertos fora do preview precisam cair no domínio público do
  // produto. `window.location.origin` no preview gera URLs *.lovable.app e, em
  // alguns clientes de e-mail, o Auth também pode cair no Site URL padrão.
  try {
    const url = new URL(PUBLIC_APP_ORIGIN);
    url.pathname = "/primeiro-acesso";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return `${PUBLIC_APP_ORIGIN}/primeiro-acesso`;
  }
}


const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting create-employee-user function");

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate the JWT against the auth server (same pattern as resend-employee-invite)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } =
      await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Error verifying user:", userError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = user.id;
    console.log("Authenticated user");

    // Create admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateEmployeeRequest = await req.json();
    console.log("Request body:", {
      ...body,
      loginUrl: body.loginUrl ? "[REDACTED]" : undefined,
    });

    const {
      nome,
      email,
      telefone,
      cargo,
      cpf,
      dataAdmissao,
      isGerente,
      systemRole,
      alocaEmProjetos,
      status,
      salarioMensal,
      beneficios,
      encargos,
      tipoContratacao,
      jornadaMensal,
      jornadaDiaria,
      salarioLiquido,
      fgts,
      inssEmpresa,
      decimoTerceiro,
      ferias,
      proLabore,
      // New cost fields
      bolsaAuxilio,
      valorContratoPj,
      dividendos,
      provisao13,
      provisaoFerias,
      provisaoRecesso,
      totalMonthlyCostEstimated,
      totalAnnualCostEstimated,
      breakdownJson,
      dataNascimento,
      fotoUrl,
      tenantId,
      loginUrl,
      pixKeyType,
      pixKey,
      bankName,
      bankAgency,
      bankAccount,
      bankAccountType,
      contratoExperiencia,
      experienciaPeriodo1Fim,
      experienciaProrrogado,
      experienciaPeriodo2Fim,
      candidateId,
    } = body;

    // Verify the requesting user is admin of the tenant
    const { data: isAdmin, error: adminCheckError } = await adminClient.rpc(
      "has_role",
      {
        _user_id: userId,
        _tenant_id: tenantId,
        _role: "admin",
      },
    );

    console.log("Admin check result:", { isAdmin, adminCheckError });

    if (adminCheckError) {
      console.error("Error checking admin role:", adminCheckError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (!isAdmin) {
      console.error("User is not admin");
      return new Response(
        JSON.stringify({
          error: "Apenas administradores podem criar funcionários",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Check if email already exists in employees table (same tenant)
    const { data: existingEmployeeInTenant } = await adminClient
      .from("employees")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .maybeSingle();

    if (existingEmployeeInTenant) {
      console.error("Employee already exists in this tenant:", email);
      return new Response(
        JSON.stringify({
          error: "Este email já está cadastrado nesta empresa",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Check if the user already exists in another tenant
    const { data: existingEmployee } = await adminClient
      .from("employees")
      .select("auth_id, email")
      .eq("email", email)
      .not("auth_id", "is", null)
      .limit(1)
      .maybeSingle();

    let authUserId: string;
    let isExistingUser = false;
    const redirectTo = firstAccessRedirect(loginUrl);

    if (existingEmployee?.auth_id) {
      // User already exists in another tenant - reuse their auth_id (sem novo convite).
      console.log(
        "Email already exists in another tenant, reusing auth_id:",
        existingEmployee.auth_id,
      );
      authUserId = existingEmployee.auth_id;
      isExistingUser = true;
    } else {
      // Novo funcionário: convite via SMTP do Auth do Supabase (não usa mais Resend).
      // `inviteUserByEmail` cria o usuário e envia o e-mail do template "Invite user"
      // configurado no Auth, contendo o link que autentica e cai em /primeiro-acesso.
      const { data: invited, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(email, {
          redirectTo,
        });

      if (inviteError || !invited?.user) {
        console.error("Error inviting user via Auth SMTP:", inviteError);
        return new Response(
          JSON.stringify({
            error: `Erro ao enviar convite: ${inviteError?.message ?? "unknown"}`,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      authUserId = invited.user.id;
      console.log("New auth user invited via SMTP:", authUserId);
    }

    // Create employee record with all new fields
    const { data: employee, error: employeeError } = await adminClient
      .from("employees")
      .insert({
        nome,
        email,
        telefone,
        cargo,
        cpf,
        data_admissao: dataAdmissao,
        is_gerente: isGerente,
        status: "aguardando_confirmacao", // Always start as pending until first login
        salario_mensal: salarioMensal,
        system_role: systemRole || "user",
        aloca_em_projetos: alocaEmProjetos ?? true,
        beneficios,
        encargos,
        tipo_contratacao: tipoContratacao || "CLT",
        jornada_mensal: jornadaMensal || 176,
        jornada_diaria: jornadaDiaria || 8,
        salario_liquido: salarioLiquido || 0,
        fgts: fgts || 0,
        inss_empresa: inssEmpresa || 0,
        decimo_terceiro: decimoTerceiro || 0,
        ferias: ferias || 0,
        pro_labore: proLabore || 0,
        // New cost fields
        bolsa_auxilio: bolsaAuxilio || 0,
        valor_contrato_pj: valorContratoPj || 0,
        dividendos: dividendos || 0,
        provisao_13: provisao13 || 0,
        provisao_ferias: provisaoFerias || 0,
        provisao_recesso: provisaoRecesso || 0,
        total_monthly_cost_estimated: totalMonthlyCostEstimated || 0,
        total_annual_cost_estimated: totalAnnualCostEstimated || 0,
        breakdown_json: breakdownJson || null,
        data_nascimento: dataNascimento || null,
        foto_url: fotoUrl || null,
        pix_key_type: pixKeyType || null,
        pix_key: pixKey || null,
        bank_name: bankName || null,
        bank_agency: bankAgency || null,
        bank_account: bankAccount || null,
        bank_account_type: bankAccountType || null,
        contrato_experiencia: contratoExperiencia || false,
        experiencia_periodo1_fim: experienciaPeriodo1Fim || null,
        experiencia_prorrogado: experienciaProrrogado || false,
        experiencia_periodo2_fim: experienciaPeriodo2Fim || null,
        tenant_id: tenantId,
        auth_id: authUserId,
        must_change_password: !isExistingUser, // Only require change for new users
        // Marca o envio do convite para validar o TTL de 7 dias no primeiro acesso (FUNC-J1).
        invited_at: !isExistingUser ? new Date().toISOString() : null,
        candidate_id: candidateId || null,
      })
      .select()
      .single();

    if (employeeError) {
      console.error("Error creating employee:", employeeError);
      // Rollback: delete the auth user we just created (only if it was a new user)
      if (!isExistingUser) {
        await adminClient.auth.admin.deleteUser(authUserId);
      }
      return new Response(
        JSON.stringify({
          error: `Erro ao criar funcionário: ${employeeError.message}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    console.log("Employee created:", employee.id);

    // Create user role for this tenant based on systemRole
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: authUserId,
      tenant_id: tenantId,
      role: systemRole || "user", // Use systemRole directly
    });

    if (roleError) {
      console.error("Error creating user role:", roleError);
      // Note: We don't rollback here as the employee was created successfully
    }

    console.log("User role created");

    if (isExistingUser) {
      console.log(
        "Skipping invite email - user already exists and can use existing credentials",
      );
    }


    console.log("Employee created successfully:", employee.id);

    return new Response(
      JSON.stringify({
        success: true,
        employee,
        emailSent: !isExistingUser, // Email scheduled for new users
        isExistingUser,
        message: isExistingUser
          ? "Funcionário criado com sucesso. O usuário já possui acesso e pode usar suas credenciais existentes."
          : "Funcionário criado com sucesso. O convite será enviado por email.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: unknown) {
    console.error("Error in create-employee-user:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);
