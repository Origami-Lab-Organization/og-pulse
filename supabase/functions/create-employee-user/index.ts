import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateEmployeeRequest {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  cpf: string;
  dataAdmissao: string;
  isGerente: boolean;
  status: string;
  salarioMensal: number;
  beneficios: number;
  encargos: number;
  tipoContratacao: string;
  jornadaMensal: number;
  salarioLiquido: number;
  fgts: number;
  inssEmpresa: number;
  decimoTerceiro: number;
  ferias: number;
  proLabore: number;
  tenantId: string;
  loginUrl: string;
}

function generateTempPassword(length = 12): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const all = uppercase + lowercase + numbers;
  
  let password = "";
  // Ensure at least one of each required type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  // Fill the rest randomly
  for (let i = 3; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting create-employee-user function");
    
    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Use getUser to verify the token and get user info
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      console.error("Error verifying user token:", userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = userData.user.id;
    console.log("Authenticated user:", userId);

    const body: CreateEmployeeRequest = await req.json();
    console.log("Request body:", { ...body, loginUrl: body.loginUrl ? "[REDACTED]" : undefined });
    
    const {
      nome,
      email,
      telefone,
      cargo,
      cpf,
      dataAdmissao,
      isGerente,
      status,
      salarioMensal,
      beneficios,
      encargos,
      tipoContratacao,
      jornadaMensal,
      salarioLiquido,
      fgts,
      inssEmpresa,
      decimoTerceiro,
      ferias,
      proLabore,
      tenantId,
      loginUrl,
    } = body;

    // Verify the requesting user is admin of the tenant
    const { data: isAdmin, error: adminCheckError } = await adminClient.rpc('has_role', {
      _user_id: userId,
      _tenant_id: tenantId,
      _role: 'admin'
    });

    console.log("Admin check result:", { isAdmin, adminCheckError });

    if (adminCheckError) {
      console.error("Error checking admin role:", adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!isAdmin) {
      console.error("User is not admin");
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar funcionários' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if email already exists in employees table (same tenant)
    const { data: existingEmployeeInTenant } = await adminClient
      .from('employees')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', email)
      .maybeSingle();

    if (existingEmployeeInTenant) {
      console.error("Employee already exists in this tenant:", email);
      return new Response(
        JSON.stringify({ error: 'Este email já está cadastrado nesta empresa' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if the user already exists in another tenant
    const { data: existingEmployee } = await adminClient
      .from('employees')
      .select('auth_id, email')
      .eq('email', email)
      .not('auth_id', 'is', null)
      .limit(1)
      .maybeSingle();

    let authUserId: string;
    let tempPassword: string | null = null;
    let isExistingUser = false;

    if (existingEmployee?.auth_id) {
      // User already exists in another tenant - reuse their auth_id
      console.log("Email already exists in another tenant, reusing auth_id:", existingEmployee.auth_id);
      authUserId = existingEmployee.auth_id;
      isExistingUser = true;
    } else {
      // Create new user in Supabase Auth
      tempPassword = generateTempPassword();
      console.log("Generated temp password for new user:", email);

      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm since we're inviting
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${authError.message}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      authUserId = authUser.user.id;
      console.log("New auth user created:", authUserId);
    }

    // Create employee record with all new fields
    const { data: employee, error: employeeError } = await adminClient
      .from('employees')
      .insert({
        nome,
        email,
        telefone,
        cargo,
        cpf,
        data_admissao: dataAdmissao,
        is_gerente: isGerente,
        status,
        salario_mensal: salarioMensal,
        beneficios,
        encargos,
        tipo_contratacao: tipoContratacao || 'CLT',
        jornada_mensal: jornadaMensal || 176,
        salario_liquido: salarioLiquido || 0,
        fgts: fgts || 0,
        inss_empresa: inssEmpresa || 0,
        decimo_terceiro: decimoTerceiro || 0,
        ferias: ferias || 0,
        pro_labore: proLabore || 0,
        tenant_id: tenantId,
        auth_id: authUserId,
        must_change_password: !isExistingUser, // Only require change for new users
        temp_password: tempPassword, // null for existing users
      })
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee:', employeeError);
      // Rollback: delete the auth user we just created (only if it was a new user)
      if (!isExistingUser) {
        await adminClient.auth.admin.deleteUser(authUserId);
      }
      return new Response(
        JSON.stringify({ error: `Erro ao criar funcionário: ${employeeError.message}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Employee created:", employee.id);

    // Create user role for this tenant
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: authUserId,
        tenant_id: tenantId,
        role: isGerente ? 'admin' : 'user',
      });

    if (roleError) {
      console.error('Error creating user role:', roleError);
      // Note: We don't rollback here as the employee was created successfully
    }

    console.log("User role created");

    // Send invite email only for new users
    let emailSent = false;
    let emailError = null;
    
    if (!isExistingUser && tempPassword) {
      try {
        console.log("Attempting to send invite email to:", email);
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-invite-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: email,
            nome,
            tempPassword,
            loginUrl,
          }),
        });

        const emailResult = await emailResponse.json();
        console.log("Email response:", { status: emailResponse.status, result: emailResult });

        if (!emailResponse.ok) {
          emailError = emailResult.error || 'Erro ao enviar email';
          console.error('Error sending invite email:', emailError);
        } else {
          emailSent = true;
          console.log("Invite email sent successfully");
        }
      } catch (error: unknown) {
        emailError = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error calling send-invite-email:', error);
      }
    } else if (isExistingUser) {
      console.log("Skipping invite email - user already exists and can use existing credentials");
    }

    console.log('Employee created successfully:', employee.id, 'Email sent:', emailSent);

    return new Response(
      JSON.stringify({ 
        success: true, 
        employee,
        emailSent,
        emailError,
        isExistingUser,
        message: isExistingUser
          ? 'Funcionário criado com sucesso. O usuário já possui acesso e pode usar suas credenciais existentes.'
          : (emailSent 
            ? 'Funcionário criado e convite enviado com sucesso' 
            : `Funcionário criado. ${emailError ? `Erro no envio do email: ${emailError}` : 'Email não enviado.'}`)
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error('Error in create-employee-user:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
