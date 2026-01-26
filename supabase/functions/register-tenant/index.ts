import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, adminName, email, password } = await req.json();

    // Validate required fields
    if (!companyName || !adminName || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Todos os campos são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Senha deve ter pelo menos 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if email already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === email);
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'Este email já está cadastrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Create tenant
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({ name: companyName })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar empresa' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Create auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      // Rollback: delete tenant
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create employee record
    const { data: employee, error: employeeError } = await adminClient
      .from('employees')
      .insert({
        nome: adminName,
        email,
        cargo: 'Administrador',
        data_admissao: new Date().toISOString().split('T')[0],
        is_gerente: true,
        tenant_id: tenant.id,
        auth_id: authUser.user.id,
        must_change_password: false,
      })
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee:', employeeError);
      // Rollback: delete auth user and tenant
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar funcionário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Assign admin role
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        tenant_id: tenant.id,
        role: 'admin',
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      // Rollback: delete employee, auth user, and tenant
      await adminClient.from('employees').delete().eq('id', employee.id);
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao atribuir permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Empresa cadastrada com sucesso',
        tenantId: tenant.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
