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
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    let authUserId!: string;
    let isExistingUser = false;

    if (existingUser) {
      // User exists - verify password by attempting sign in
      const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !signInData.user) {
        return new Response(
          JSON.stringify({ error: 'Email já cadastrado. Verifique a senha ou faça login para adicionar uma nova empresa.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUserId = existingUser.id;
      isExistingUser = true;
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

    // 1.1 Seed default holidays for the new tenant
    const defaultHolidays = [
      // Fixed holidays
      { tenant_id: tenant.id, name: 'Confraternização Universal', holiday_type: 'fixed', fixed_day: 1, fixed_month: 1 },
      { tenant_id: tenant.id, name: 'Tiradentes', holiday_type: 'fixed', fixed_day: 21, fixed_month: 4 },
      { tenant_id: tenant.id, name: 'Dia do Trabalho', holiday_type: 'fixed', fixed_day: 1, fixed_month: 5 },
      { tenant_id: tenant.id, name: 'Independência do Brasil', holiday_type: 'fixed', fixed_day: 7, fixed_month: 9 },
      { tenant_id: tenant.id, name: 'Nossa Senhora Aparecida', holiday_type: 'fixed', fixed_day: 12, fixed_month: 10 },
      { tenant_id: tenant.id, name: 'Finados', holiday_type: 'fixed', fixed_day: 2, fixed_month: 11 },
      { tenant_id: tenant.id, name: 'Proclamação da República', holiday_type: 'fixed', fixed_day: 15, fixed_month: 11 },
      { tenant_id: tenant.id, name: 'Natal', holiday_type: 'fixed', fixed_day: 25, fixed_month: 12 },
      // Floating holidays 2025
      { tenant_id: tenant.id, name: 'Carnaval (Segunda)', holiday_type: 'floating', specific_date: '2025-03-03', reference_year: 2025 },
      { tenant_id: tenant.id, name: 'Carnaval (Terça)', holiday_type: 'floating', specific_date: '2025-03-04', reference_year: 2025 },
      { tenant_id: tenant.id, name: 'Sexta-feira Santa', holiday_type: 'floating', specific_date: '2025-04-18', reference_year: 2025 },
      { tenant_id: tenant.id, name: 'Corpus Christi', holiday_type: 'floating', specific_date: '2025-06-19', reference_year: 2025 },
      // Floating holidays 2026
      { tenant_id: tenant.id, name: 'Carnaval (Segunda)', holiday_type: 'floating', specific_date: '2026-02-16', reference_year: 2026 },
      { tenant_id: tenant.id, name: 'Carnaval (Terça)', holiday_type: 'floating', specific_date: '2026-02-17', reference_year: 2026 },
      { tenant_id: tenant.id, name: 'Sexta-feira Santa', holiday_type: 'floating', specific_date: '2026-04-03', reference_year: 2026 },
      { tenant_id: tenant.id, name: 'Corpus Christi', holiday_type: 'floating', specific_date: '2026-06-04', reference_year: 2026 },
    ];

    const { error: holidaysError } = await adminClient
      .from('company_holidays')
      .insert(defaultHolidays);

    if (holidaysError) {
      console.error('Error seeding holidays:', holidaysError);
      // Non-critical error, continue with registration
    }

    // 2. Create auth user (only if new user)
    if (!isExistingUser) {
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

      authUserId = authUser.user.id;
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
        auth_id: authUserId,
        must_change_password: false,
      })
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee:', employeeError);
      // Rollback: delete auth user (only if new) and tenant
      if (!isExistingUser) {
        await adminClient.auth.admin.deleteUser(authUserId);
      }
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
        user_id: authUserId,
        tenant_id: tenant.id,
        role: 'admin',
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      // Rollback: delete employee, auth user (only if new), and tenant
      await adminClient.from('employees').delete().eq('id', employee.id);
      if (!isExistingUser) {
        await adminClient.auth.admin.deleteUser(authUserId);
      }
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
