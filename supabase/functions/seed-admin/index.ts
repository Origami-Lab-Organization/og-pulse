import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Gate behind a shared secret token so this bootstrap function isn't callable by anyone.
    const token = req.headers.get('x-seed-token');
    const expected = Deno.env.get('SEED_SECRET_TOKEN');
    if (!expected || token !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const adminEmail = Deno.env.get('SEED_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('SEED_ADMIN_PASSWORD');
    const tenantName = Deno.env.get('SEED_ADMIN_TENANT') ?? 'Origami Lab';

    if (!adminEmail || !adminPassword) {
      return new Response(JSON.stringify({ error: 'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be configured as secrets.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if admin already exists
    const { data: existingEmployee } = await adminClient
      .from('employees')
      .select('id')
      .eq('email', adminEmail)
      .single();

    if (existingEmployee) {
      return new Response(
        JSON.stringify({ message: 'Admin já existe no sistema' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. Create tenant
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({ name: tenantName })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      throw new Error(`Erro ao criar tenant: ${tenantError.message}`);
    }

    console.log('Tenant created:', tenant.id);

    // 2. Create auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      // Rollback tenant
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      throw new Error(`Erro ao criar usuário: ${authError.message}`);
    }

    console.log('Auth user created:', authUser.user.id);

    // 3. Create employee record
    const { data: employee, error: employeeError } = await adminClient
      .from('employees')
      .insert({
        nome: 'Administrador',
        email: adminEmail,
        cargo: 'Administrador',
        data_admissao: new Date().toISOString().split('T')[0],
        is_gerente: true,
        status: 'ativo',
        salario_mensal: 0,
        beneficios: 0,
        encargos: 0,
        tenant_id: tenant.id,
        auth_id: authUser.user.id,
        must_change_password: false, // Admin doesn't need to change password
      })
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee:', employeeError);
      // Rollback
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      throw new Error(`Erro ao criar funcionário: ${employeeError.message}`);
    }

    console.log('Employee created:', employee.id);

    // 4. Create admin role
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        tenant_id: tenant.id,
        role: 'admin',
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
      // Note: We don't rollback here as the main records were created
    }

    console.log('Admin role created');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Administrador criado com sucesso!',
        email: adminEmail,
        tenant: tenantName,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in seed-admin:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
