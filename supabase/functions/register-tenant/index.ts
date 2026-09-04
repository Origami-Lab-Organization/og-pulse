import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, adminName, cpf, phone, position, email, password, cnpj, segment, employeeCount } = await req.json();

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if email already exists
    const { data: existingEmployee } = await adminClient
      .from('employees')
      .select('id, auth_id')
      .eq('email', email)
      .maybeSingle();

    let authUserId!: string;
    let isExistingUser = false;

    if (existingEmployee?.auth_id) {
      const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !signInData.user) {
        return new Response(
          JSON.stringify({ error: 'Este e-mail já está cadastrado. Verifique a senha ou faça login.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUserId = existingEmployee.auth_id;
      isExistingUser = true;
    }

    // 1. Create tenant with new fields
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({
        name: companyName,
        cnpj: cnpj || null,
        segment: segment || null,
        employee_count: employeeCount || null,
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar empresa. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1.1 Seed default holidays
    const defaultHolidays = [
      { tenant_id: tenant.id, name: 'Confraternização Universal', holiday_type: 'fixed', fixed_day: 1, fixed_month: 1 },
      { tenant_id: tenant.id, name: 'Tiradentes', holiday_type: 'fixed', fixed_day: 21, fixed_month: 4 },
      { tenant_id: tenant.id, name: 'Dia do Trabalho', holiday_type: 'fixed', fixed_day: 1, fixed_month: 5 },
      { tenant_id: tenant.id, name: 'Independência do Brasil', holiday_type: 'fixed', fixed_day: 7, fixed_month: 9 },
      { tenant_id: tenant.id, name: 'Nossa Senhora Aparecida', holiday_type: 'fixed', fixed_day: 12, fixed_month: 10 },
      { tenant_id: tenant.id, name: 'Finados', holiday_type: 'fixed', fixed_day: 2, fixed_month: 11 },
      { tenant_id: tenant.id, name: 'Proclamação da República', holiday_type: 'fixed', fixed_day: 15, fixed_month: 11 },
      { tenant_id: tenant.id, name: 'Natal', holiday_type: 'fixed', fixed_day: 25, fixed_month: 12 },
      { tenant_id: tenant.id, name: 'Carnaval (Segunda)', holiday_type: 'floating', specific_date: '2025-03-03', reference_year: 2025 },
      { tenant_id: tenant.id, name: 'Carnaval (Terça)', holiday_type: 'floating', specific_date: '2025-03-04', reference_year: 2025 },
      { tenant_id: tenant.id, name: 'Sexta-feira Santa', holiday_type: 'floating', specific_date: '2025-04-18', reference_year: 2025 },
      { tenant_id: tenant.id, name: 'Corpus Christi', holiday_type: 'floating', specific_date: '2025-06-19', reference_year: 2025 },
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
    }

    // 2. Create auth user (only if new)
    if (!isExistingUser) {
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        await adminClient.from('tenants').delete().eq('id', tenant.id);

        const errMsg = authError.message?.toLowerCase() || '';
        if (errMsg.includes('already') || errMsg.includes('duplicate') || errMsg.includes('exists')) {
          return new Response(
            JSON.stringify({ error: 'Este e-mail já está cadastrado. Tente fazer login.' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: 'Erro ao criar usuário. Tente novamente.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUserId = authUser.user.id;
    }

    // 3. Create employee record with new fields
    const { data: employee, error: employeeError } = await adminClient
      .from('employees')
      .insert({
        nome: adminName,
        email,
        cargo: position || 'Administrador',
        cpf: cpf || '00000000000',
        telefone: phone || '00000000000',
        data_admissao: new Date().toISOString().split('T')[0],
        is_gerente: true,
        tenant_id: tenant.id,
        auth_id: authUserId,
        must_change_password: false,
        system_role: 'admin',
      })
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee:', employeeError);
      if (!isExistingUser) {
        await adminClient.auth.admin.deleteUser(authUserId);
      }
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar funcionário. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Assign admin role
    // O papel passa a ser gravado no modelo novo: perfil do tenant, não papel global
    // (PUL-206). O perfil é resolvido pelo nome, e o tenant nasce com os quatro padrão
    // (trigger em `tenants`), então a busca sempre encontra.
    const nomeDoPerfil =
      'admin' === "admin" ? "Admin" : 'admin' === "manager" ? "Gerente" : 'admin' === "rh" ? "RH" : "Colaborador";

    const { data: perfil } = await adminClient
      .from("tenant_roles")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("name", nomeDoPerfil)
      .maybeSingle();

    const { error: roleError } = await adminClient.from("user_tenant_roles").insert({
      user_id: authUserId,
      tenant_id: tenant.id,
      role_id: perfil?.id ?? null,
    });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      await adminClient.from('employees').delete().eq('id', employee.id);
      if (!isExistingUser) {
        await adminClient.auth.admin.deleteUser(authUserId);
      }
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao atribuir permissões. Tente novamente.' }),
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
      JSON.stringify({ error: 'Erro interno do servidor. Tente novamente mais tarde.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
