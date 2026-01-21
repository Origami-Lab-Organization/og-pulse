import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateEmployeeRequest {
  nome: string;
  email: string;
  telefone?: string;
  cargo: string;
  cpf?: string;
  dataAdmissao: string;
  isGerente: boolean;
  status: string;
  salarioMensal: number;
  beneficios: number;
  encargos: number;
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
    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with user's token to verify they're admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Create admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateEmployeeRequest = await req.json();
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
      tenantId,
      loginUrl,
    } = body;

    // Verify the requesting user is admin of the tenant
    const { data: isAdmin } = await adminClient.rpc('has_role', {
      _user_id: userId,
      _tenant_id: tenantId,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only admins can create employees' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Create user in Supabase Auth
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

    // Create employee record
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
        tenant_id: tenantId,
        auth_id: authUser.user.id,
        must_change_password: true,
        temp_password: tempPassword, // Store for reference (will be cleared on first login)
      })
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee:', employeeError);
      // Rollback: delete the auth user we just created
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      return new Response(
        JSON.stringify({ error: `Erro ao criar funcionário: ${employeeError.message}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create user role (default: user)
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        tenant_id: tenantId,
        role: isGerente ? 'admin' : 'user',
      });

    if (roleError) {
      console.error('Error creating user role:', roleError);
      // Note: We don't rollback here as the employee was created successfully
    }

    // Send invite email
    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-invite-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          to: email,
          nome,
          tempPassword,
          loginUrl,
        }),
      });

      if (!emailResponse.ok) {
        const emailError = await emailResponse.json();
        console.error('Error sending invite email:', emailError);
        // Don't fail the entire operation if email fails
      }
    } catch (emailError) {
      console.error('Error calling send-invite-email:', emailError);
    }

    console.log('Employee created successfully:', employee.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        employee,
        message: 'Funcionário criado e convite enviado com sucesso' 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in create-employee-user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
