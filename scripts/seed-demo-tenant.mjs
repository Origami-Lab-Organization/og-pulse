/**
 * Seed Demo Tenant
 * Usage: node scripts/seed-demo-tenant.mjs <SERVICE_ROLE_KEY>
 *
 * Get your service role key at:
 * https://supabase.com/dashboard/project/vkriobpmolgopbbpqeky/settings/api
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vkriobpmolgopbbpqeky.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Passe a service role key como argumento:');
  console.error('   node scripts/seed-demo-tenant.mjs eyJ...');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_ADMIN_EMAIL   = 'demo.admin@ogpulse.com.br';
const DEMO_MANAGER_EMAIL = 'demo.gerente@ogpulse.com.br';
const DEMO_USER_EMAIL    = 'demo.colaborador@ogpulse.com.br';
const DEMO_PASSWORD      = 'Demo@2024!';
const TENANT_NAME        = 'Pulse Demo Consultoria';

async function run() {
  console.log('🚀 Iniciando seed do tenant de demonstração...\n');

  // ── Idempotency check ────────────────────────────────────────────────────
  const { data: existing } = await db
    .from('employees')
    .select('id')
    .eq('email', DEMO_ADMIN_EMAIL)
    .maybeSingle();

  if (existing) {
    console.log('⚠️  Tenant demo já existe! Credenciais:');
    printCredentials();
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 1. TENANT
  // ═══════════════════════════════════════════════════════════════════════
  console.log('1/14 Criando tenant...');
  const { data: tenant, error: tenantErr } = await db
    .from('tenants')
    .insert({ name: TENANT_NAME, segment: 'Consultoria & Tecnologia', employee_count: '11-50' })
    .select().single();
  if (tenantErr) throw new Error(`tenant: ${tenantErr.message}`);
  const tid = tenant.id;
  console.log(`   ✓ Tenant: ${TENANT_NAME} (${tid})`);

  // ── Holidays ─────────────────────────────────────────────────────────────
  console.log('2/14 Inserindo feriados...');
  await db.from('company_holidays').insert([
    { tenant_id: tid, name: 'Confraternização Universal', holiday_type: 'fixed', fixed_day: 1,  fixed_month: 1  },
    { tenant_id: tid, name: 'Tiradentes',                 holiday_type: 'fixed', fixed_day: 21, fixed_month: 4  },
    { tenant_id: tid, name: 'Dia do Trabalho',            holiday_type: 'fixed', fixed_day: 1,  fixed_month: 5  },
    { tenant_id: tid, name: 'Independência do Brasil',    holiday_type: 'fixed', fixed_day: 7,  fixed_month: 9  },
    { tenant_id: tid, name: 'Nossa Senhora Aparecida',    holiday_type: 'fixed', fixed_day: 12, fixed_month: 10 },
    { tenant_id: tid, name: 'Finados',                    holiday_type: 'fixed', fixed_day: 2,  fixed_month: 11 },
    { tenant_id: tid, name: 'Proclamação da República',   holiday_type: 'fixed', fixed_day: 15, fixed_month: 11 },
    { tenant_id: tid, name: 'Natal',                      holiday_type: 'fixed', fixed_day: 25, fixed_month: 12 },
    { tenant_id: tid, name: 'Carnaval (Segunda)', holiday_type: 'floating', specific_date: '2026-02-16', reference_year: 2026 },
    { tenant_id: tid, name: 'Carnaval (Terça)',   holiday_type: 'floating', specific_date: '2026-02-17', reference_year: 2026 },
    { tenant_id: tid, name: 'Sexta-feira Santa',  holiday_type: 'floating', specific_date: '2026-04-03', reference_year: 2026 },
    { tenant_id: tid, name: 'Corpus Christi',     holiday_type: 'floating', specific_date: '2026-06-04', reference_year: 2026 },
  ]);
  console.log('   ✓ 12 feriados inseridos');

  // ── Financial settings ────────────────────────────────────────────────────
  console.log('3/14 Configurações financeiras...');
  await db.from('financial_settings').insert({
    tenant_id: tid,
    taxes_percent: 8.65,
    commission_percent: 5,
    admin_expenses_percent: 12,
    net_margin_percent: 20,
    gross_margin_target_percent: 45,
  });
  console.log('   ✓ Configurações financeiras inseridas');

  // ═══════════════════════════════════════════════════════════════════════
  // 2. AUTH USERS + EMPLOYEES
  // ═══════════════════════════════════════════════════════════════════════
  console.log('4/14 Criando usuários auth...');

  const createAuthUser = async (email) => {
    const { data, error } = await db.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true });
    if (error) throw new Error(`auth user ${email}: ${error.message}`);
    return data.user.id;
  };

  const adminAuthId   = await createAuthUser(DEMO_ADMIN_EMAIL);
  const managerAuthId = await createAuthUser(DEMO_MANAGER_EMAIL);
  const userAuthId    = await createAuthUser(DEMO_USER_EMAIL);
  console.log('   ✓ 3 usuários auth criados');

  // CLT charges calculator
  const clt = (salary) => {
    const fgts            = salary * 0.08;
    const inss_empresa    = salary * 0.20;
    const decimo_terceiro = salary / 12;
    const ferias          = (salary / 12) * 1.33;
    const encargos        = fgts + inss_empresa + decimo_terceiro + ferias;
    return { fgts, inss_empresa, decimo_terceiro, ferias, encargos };
  };

  // ── Admin (Sócio) ─────────────────────────────────────────────────────────
  console.log('5/14 Criando funcionários...');
  const { data: empAdmin, error: eaErr } = await db.from('employees').insert({
    nome: 'Ana Beatriz Carvalho', email: DEMO_ADMIN_EMAIL,
    cargo: 'Diretora de Operações', cpf: '12345678901', telefone: '11999990001',
    data_admissao: '2021-03-01', data_nascimento: '1985-06-15',
    is_gerente: true, status: 'ativo',
    tipo_contratacao: 'SOCIO',
    salario_mensal: 0, pro_labore: 15000, dividendos: 5000,
    beneficios: 0, encargos: 0,
    jornada_mensal: 176, jornada_diaria: 8,
    total_monthly_cost_estimated: 20000, total_annual_cost_estimated: 240000,
    tenant_id: tid, auth_id: adminAuthId,
    must_change_password: false, system_role: 'admin',
  }).select().single();
  if (eaErr) throw new Error(`emp admin: ${eaErr.message}`);
  await db.from('user_roles').insert({ user_id: adminAuthId, tenant_id: tid, role: 'admin' });

  // ── Manager (CLT) ─────────────────────────────────────────────────────────
  const manSalary = 12000;
  const manClt = clt(manSalary);
  const { data: empManager, error: emErr } = await db.from('employees').insert({
    nome: 'Carlos Eduardo Mendes', email: DEMO_MANAGER_EMAIL,
    cargo: 'Gerente de Projetos', cpf: '23456789012', telefone: '11999990002',
    data_admissao: '2022-01-10', data_nascimento: '1988-11-22',
    is_gerente: true, status: 'ativo',
    tipo_contratacao: 'CLT', salario_mensal: manSalary,
    beneficios: 1500, encargos: manClt.encargos,
    fgts: manClt.fgts, inss_empresa: manClt.inss_empresa,
    decimo_terceiro: manClt.decimo_terceiro, ferias: manClt.ferias,
    jornada_mensal: 176, jornada_diaria: 8,
    total_monthly_cost_estimated: manSalary + 1500 + manClt.encargos,
    total_annual_cost_estimated: (manSalary + 1500 + manClt.encargos) * 12,
    tenant_id: tid, auth_id: managerAuthId,
    must_change_password: false, system_role: 'manager',
  }).select().single();
  if (emErr) throw new Error(`emp manager: ${emErr.message}`);
  await db.from('user_roles').insert({ user_id: managerAuthId, tenant_id: tid, role: 'admin' });

  await db.from('employee_benefits').insert([
    { employee_id: empManager.id, name: 'Vale Refeição',  monthly_value: 880, origin: 'manual' },
    { employee_id: empManager.id, name: 'Plano de Saúde', monthly_value: 620, origin: 'manual' },
  ]);
  await db.from('employee_tools').insert([
    { employee_id: empManager.id, name: 'MacBook Pro 14"',     monthly_cost: 350 },
    { employee_id: empManager.id, name: 'Licença Notion Teams', monthly_cost: 45 },
  ]);

  // ── Collaborator (CLT) ────────────────────────────────────────────────────
  const colSalary = 7500;
  const colClt = clt(colSalary);
  const { data: empUser, error: euErr } = await db.from('employees').insert({
    nome: 'Fernanda Lima', email: DEMO_USER_EMAIL,
    cargo: 'Consultora Sênior', cpf: '34567890123', telefone: '11999990003',
    data_admissao: '2022-08-15', data_nascimento: '1991-03-08',
    is_gerente: false, status: 'ativo',
    tipo_contratacao: 'CLT', salario_mensal: colSalary,
    beneficios: 1200, encargos: colClt.encargos,
    fgts: colClt.fgts, inss_empresa: colClt.inss_empresa,
    decimo_terceiro: colClt.decimo_terceiro, ferias: colClt.ferias,
    jornada_mensal: 176, jornada_diaria: 8,
    total_monthly_cost_estimated: colSalary + 1200 + colClt.encargos,
    total_annual_cost_estimated: (colSalary + 1200 + colClt.encargos) * 12,
    tenant_id: tid, auth_id: userAuthId,
    must_change_password: false, system_role: 'user',
  }).select().single();
  if (euErr) throw new Error(`emp user: ${euErr.message}`);
  await db.from('user_roles').insert({ user_id: userAuthId, tenant_id: tid, role: 'admin' });

  await db.from('employee_benefits').insert([
    { employee_id: empUser.id, name: 'Vale Refeição',  monthly_value: 880, origin: 'manual' },
    { employee_id: empUser.id, name: 'Plano de Saúde', monthly_value: 320, origin: 'manual' },
  ]);

  // ── Dev Sênior (CLT) ──────────────────────────────────────────────────────
  const dev1Salary = 9000;
  const dev1Clt = clt(dev1Salary);
  const { data: empDev1 } = await db.from('employees').insert({
    nome: 'Rafael Souza', email: 'rafael.souza@pulsedemo.com.br',
    cargo: 'Desenvolvedor Full Stack Sênior', cpf: '45678901234', telefone: '11999990004',
    data_admissao: '2023-02-01', data_nascimento: '1990-07-12',
    is_gerente: false, status: 'ativo',
    tipo_contratacao: 'CLT', salario_mensal: dev1Salary,
    beneficios: 1500, encargos: dev1Clt.encargos,
    fgts: dev1Clt.fgts, inss_empresa: dev1Clt.inss_empresa,
    decimo_terceiro: dev1Clt.decimo_terceiro, ferias: dev1Clt.ferias,
    jornada_mensal: 176, jornada_diaria: 8,
    total_monthly_cost_estimated: dev1Salary + 1500 + dev1Clt.encargos,
    total_annual_cost_estimated: (dev1Salary + 1500 + dev1Clt.encargos) * 12,
    tenant_id: tid, must_change_password: false, system_role: 'user',
  }).select().single();

  // ── Designer PJ ───────────────────────────────────────────────────────────
  const { data: empPJ } = await db.from('employees').insert({
    nome: 'Juliana Pereira', email: 'juliana.pereira@pulsedemo.com.br',
    cargo: 'UX/UI Designer', cpf: '56789012345', telefone: '11999990005',
    data_admissao: '2023-05-15', data_nascimento: '1993-09-20',
    is_gerente: false, status: 'ativo',
    tipo_contratacao: 'PJ', salario_mensal: 0, valor_contrato_pj: 11000,
    beneficios: 0, encargos: 0,
    jornada_mensal: 160, jornada_diaria: 8,
    total_monthly_cost_estimated: 11000, total_annual_cost_estimated: 132000,
    tenant_id: tid, must_change_password: false, system_role: 'user',
  }).select().single();

  if (empPJ) {
    await db.from('employee_tools').insert([
      { employee_id: empPJ.id, name: 'Figma Professional',     monthly_cost: 75  },
      { employee_id: empPJ.id, name: 'Adobe Creative Cloud',   monthly_cost: 250 },
    ]);
  }

  // ── Estagiário ────────────────────────────────────────────────────────────
  await db.from('employees').insert({
    nome: 'Lucas Almeida', email: 'lucas.almeida@pulsedemo.com.br',
    cargo: 'Estagiário de Dados', cpf: '67890123456', telefone: '11999990006',
    data_admissao: '2024-03-01', data_nascimento: '2002-04-18',
    is_gerente: false, status: 'ativo',
    tipo_contratacao: 'ESTAGIO', salario_mensal: 0, bolsa_auxilio: 2000,
    beneficios: 500, encargos: 0,
    jornada_mensal: 120, jornada_diaria: 6,
    total_monthly_cost_estimated: 2500, total_annual_cost_estimated: 30000,
    tenant_id: tid, must_change_password: false, system_role: 'user',
  });

  console.log('   ✓ 6 funcionários criados');

  // ═══════════════════════════════════════════════════════════════════════
  // 3. ROLE RATES
  // ═══════════════════════════════════════════════════════════════════════
  console.log('6/14 Criando tabela de preços (role rates)...');
  await db.from('role_rates').insert([
    { tenant_id: tid, role_name: 'Consultor',            seniority: 'junior',  hourly_rate: 120, status: 'active', is_active: true },
    { tenant_id: tid, role_name: 'Consultor',            seniority: 'pleno',   hourly_rate: 180, status: 'active', is_active: true },
    { tenant_id: tid, role_name: 'Consultor',            seniority: 'senior',  hourly_rate: 250, status: 'active', is_active: true },
    { tenant_id: tid, role_name: 'Desenvolvedor',        seniority: 'junior',  hourly_rate: 100, status: 'active', is_active: true },
    { tenant_id: tid, role_name: 'Desenvolvedor',        seniority: 'pleno',   hourly_rate: 160, status: 'active', is_active: true },
    { tenant_id: tid, role_name: 'Desenvolvedor',        seniority: 'senior',  hourly_rate: 220, status: 'active', is_active: true },
    { tenant_id: tid, role_name: 'Designer UX/UI',       seniority: 'pleno',   hourly_rate: 150, status: 'active', is_active: true },
    { tenant_id: tid, role_name: 'Designer UX/UI',       seniority: 'senior',  hourly_rate: 200, status: 'active', is_active: true },
    { tenant_id: tid, role_name: 'Gerente de Projetos',  seniority: 'senior',  hourly_rate: 280, status: 'active', is_active: true },
    { tenant_id: tid, role_name: 'Analista de Dados',    seniority: 'pleno',   hourly_rate: 170, status: 'active', is_active: true },
  ]);
  console.log('   ✓ 10 tabelas de preço inseridas');

  // ═══════════════════════════════════════════════════════════════════════
  // 4. CLIENTS
  // ═════════════════════════════════════════════════════════════════��═════
  console.log('7/14 Criando clientes...');
  const { data: clients } = await db.from('clients').insert([
    { tenant_id: tid, company_name: 'TechVision Brasil S.A.', trading_name: 'TechVision',   cnpj: '12.345.678/0001-99', cidade: 'São Paulo',       estado: 'SP', status: 'active' },
    { tenant_id: tid, company_name: 'Grupo Meridian Ltda.',   trading_name: 'Meridian Group', cnpj: '23.456.789/0001-88', cidade: 'Rio de Janeiro',  estado: 'RJ', status: 'active' },
    { tenant_id: tid, company_name: 'InnovaFarma Indústria S.A.', trading_name: 'InnovaFarma', cnpj: '34.567.890/0001-77', cidade: 'Campinas',       estado: 'SP', status: 'active' },
    { tenant_id: tid, company_name: 'Construtora Horizonte S.A.', trading_name: 'Horizonte',   cnpj: '45.678.901/0001-66', cidade: 'Belo Horizonte', estado: 'MG', status: 'active' },
  ]).select();
  const [cliTech, cliMeridian, cliInnova, cliHorizonte] = clients ?? [];
  console.log('   ✓ 4 clientes criados');

  // ═══════════════════════════════════════════════════════════════════════
  // 5. SUPPLIERS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('8/14 Criando fornecedores...');
  await db.from('suppliers').insert([
    { tenant_id: tid, company_name: 'AWS Brasil Serviços de Nuvem Ltda.', trading_name: 'AWS',            category: 'Infraestrutura Cloud', contact_email: 'contato@aws.com.br', status: 'active' },
    { tenant_id: tid, company_name: 'DataBridge Consultoria Ltda.',        trading_name: 'DataBridge',     category: 'Dados & Analytics',    contact_email: 'hello@databridge.com.br', status: 'active' },
    { tenant_id: tid, company_name: 'Studio Criativo Ltda.',               trading_name: 'Studio Criativo', category: 'Design & Comunicação', contact_email: 'oi@studiocriativo.com.br', status: 'active' },
  ]);
  console.log('   ✓ 3 fornecedores criados');

  // ═══════════════════════════════════════════════════════════════════════
  // 6. PROJECTS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('9/14 Criando projetos...');

  const { data: proj1, error: p1Err } = await db.from('projects').insert({
    tenant_id: tid, client_id: cliTech.id, manager_id: empManager.id,
    name: 'Transformação Digital — Plataforma Core',
    description: 'Redesign completo da plataforma core da TechVision, incluindo migração para cloud, modernização de APIs e novo front-end.',
    start_date: '2025-10-01', end_date: '2026-03-31', duration_months: 6,
    status: 'active', total_value: 210000,
    payment_method: 'mensal', installments_count: 6,
    first_invoice_date: '2025-10-31', due_day: 28,
    service_line: 'product_studio', is_continuous: false,
  }).select().single();
  if (p1Err) throw new Error(`proj1: ${p1Err.message}`);

  const { data: proj2, error: p2Err } = await db.from('projects').insert({
    tenant_id: tid, client_id: cliMeridian.id, manager_id: empManager.id,
    name: 'Diagnóstico de Inovação — Meridian 2026',
    description: 'Mapeamento de maturidade em inovação e elaboração de roadmap estratégico para o grupo Meridian.',
    start_date: '2026-04-01', end_date: '2026-07-31', duration_months: 4,
    status: 'planning', total_value: 96000,
    payment_method: 'por_entrega', installments_count: 3,
    first_invoice_date: '2026-04-30', due_day: 30,
    service_line: 'consultoria_estrategica', is_continuous: false,
  }).select().single();
  if (p2Err) throw new Error(`proj2: ${p2Err.message}`);

  const { data: proj3, error: p3Err } = await db.from('projects').insert({
    tenant_id: tid, client_id: cliInnova.id, manager_id: empAdmin.id,
    name: 'Financiamento EMBRAPII — InnovaFarma',
    description: 'Estruturação e submissão de projeto de P&D junto à EMBRAPII para linha de biofármacos.',
    start_date: '2025-05-01', end_date: '2025-09-30', duration_months: 5,
    status: 'completed', total_value: 155000,
    payment_method: 'por_entrega', installments_count: 3,
    first_invoice_date: '2025-06-30', due_day: 30,
    service_line: 'financiamento_inovacao', is_continuous: false,
  }).select().single();
  if (p3Err) throw new Error(`proj3: ${p3Err.message}`);

  const { data: proj4, error: p4Err } = await db.from('projects').insert({
    tenant_id: tid, client_id: cliHorizonte.id, manager_id: empManager.id,
    name: 'Mentoria Contínua — Horizonte Digital',
    description: 'Serviço de mentoria mensal em transformação digital para líderes da Construtora Horizonte.',
    start_date: '2025-09-01', end_date: null, duration_months: 12,
    status: 'active', total_value: 0,
    payment_method: 'mensal', installments_count: 0,
    due_day: 15, service_line: 'educacao_corporativa', is_continuous: true,
  }).select().single();
  if (p4Err) throw new Error(`proj4: ${p4Err.message}`);

  console.log('   ✓ 4 projetos criados');

  // ─── Project Members ─────────────────────────────────────────────────────
  const { data: pm1Manager } = await db.from('project_members').insert({
    project_id: proj1.id, employee_id: empManager.id,
    role: 'Gerente de Projetos', seniority: 'senior', hours_per_month: 40, hourly_rate: 280,
  }).select().single();
  const { data: pm1Dev } = await db.from('project_members').insert({
    project_id: proj1.id, employee_id: empDev1?.id ?? null,
    role: 'Desenvolvedor', seniority: 'senior', hours_per_month: 120, hourly_rate: 220,
  }).select().single();
  const { data: pm1Designer } = await db.from('project_members').insert({
    project_id: proj1.id, employee_id: empPJ?.id ?? null,
    role: 'Designer UX/UI', seniority: 'pleno', hours_per_month: 80, hourly_rate: 150,
  }).select().single();
  const { data: pm1User } = await db.from('project_members').insert({
    project_id: proj1.id, employee_id: empUser.id,
    role: 'Consultor', seniority: 'senior', hours_per_month: 80, hourly_rate: 250,
  }).select().single();

  await db.from('project_members').insert([
    { project_id: proj2.id, employee_id: empManager.id, role: 'Gerente de Projetos', seniority: 'senior', hours_per_month: 60, hourly_rate: 280 },
    { project_id: proj2.id, employee_id: empUser.id, role: 'Consultor', seniority: 'senior', hours_per_month: 100, hourly_rate: 250 },
    { project_id: proj3.id, employee_id: empAdmin.id, role: 'Consultor', seniority: 'senior', hours_per_month: 60, hourly_rate: 250 },
    { project_id: proj3.id, employee_id: empUser.id,  role: 'Consultor', seniority: 'senior', hours_per_month: 80, hourly_rate: 250 },
    { project_id: proj4.id, employee_id: empAdmin.id, role: 'Consultor', seniority: 'senior', hours_per_month: 20, hourly_rate: 250 },
  ]);

  // ─── Installments ─────────────────────────────────────────────────────────
  console.log('10/14 Criando parcelas...');
  await db.from('project_installments').insert([
    { project_id: proj1.id, installment_number: 1, value: 35000, due_date: '2025-10-28', status: 'received', invoice_number: 'NF-2025-1001', invoice_date: '2025-10-20', payment_date: '2025-10-28' },
    { project_id: proj1.id, installment_number: 2, value: 35000, due_date: '2025-11-28', status: 'received', invoice_number: 'NF-2025-1042', invoice_date: '2025-11-18', payment_date: '2025-11-28' },
    { project_id: proj1.id, installment_number: 3, value: 35000, due_date: '2025-12-28', status: 'invoiced', invoice_number: 'NF-2025-1089', invoice_date: '2025-12-15' },
    { project_id: proj1.id, installment_number: 4, value: 35000, due_date: '2026-01-28', status: 'pending'  },
    { project_id: proj1.id, installment_number: 5, value: 35000, due_date: '2026-02-28', status: 'pending'  },
    { project_id: proj1.id, installment_number: 6, value: 35000, due_date: '2026-03-28', status: 'pending'  },
    { project_id: proj2.id, installment_number: 1, value: 32000, due_date: '2026-04-30', status: 'pending'  },
    { project_id: proj2.id, installment_number: 2, value: 32000, due_date: '2026-06-30', status: 'pending'  },
    { project_id: proj2.id, installment_number: 3, value: 32000, due_date: '2026-07-31', status: 'pending'  },
    { project_id: proj3.id, installment_number: 1, value: 55000, due_date: '2025-06-30', status: 'received', invoice_number: 'NF-2025-0521', invoice_date: '2025-06-20', payment_date: '2025-06-30' },
    { project_id: proj3.id, installment_number: 2, value: 55000, due_date: '2025-08-31', status: 'received', invoice_number: 'NF-2025-0688', invoice_date: '2025-08-20', payment_date: '2025-08-31' },
    { project_id: proj3.id, installment_number: 3, value: 45000, due_date: '2025-09-30', status: 'received', invoice_number: 'NF-2025-0731', invoice_date: '2025-09-20', payment_date: '2025-09-30' },
  ]);
  console.log('   ✓ Parcelas inseridas');

  // ─── Project suppliers & materials ───────────────────────────────────────
  await db.from('project_suppliers').insert([
    { project_id: proj1.id, name: 'AWS — Ambiente de Desenvolvimento', monthly_value: 3500, start_month: 1, end_month: 6 },
    { project_id: proj1.id, name: 'Licença Figma (time)',              monthly_value: 300,  start_month: 1, end_month: 6 },
  ]);
  await db.from('project_materials').insert([
    { project_id: proj1.id, description: 'Licença Miro (1 ano)',               value: 1200, month_number: 1, is_realized: true,  purchase_date: '2025-10-05' },
    { project_id: proj1.id, description: 'Treinamento equipe cliente (workshop)', value: 4500, month_number: 2, is_realized: true,  purchase_date: '2025-11-10' },
    { project_id: proj1.id, description: 'Relatório técnico de arquitetura',    value: 2000, month_number: 3, is_realized: false },
  ]);

  // ─── Timesheets ──────────────────────────────────────────────────────────
  console.log('11/14 Inserindo timesheets...');
  if (pm1Manager && pm1Dev && pm1User) {
    const tsEntries = [];
    const octDays = [2, 3, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 20, 21, 22];
    for (const day of octDays.slice(0, 10)) {
      const d = `2025-10-${String(day).padStart(2, '0')}`;
      tsEntries.push({ project_id: proj1.id, project_member_id: pm1Manager.id, work_date: d, hours: 2, description: 'Gestão e acompanhamento' });
      tsEntries.push({ project_id: proj1.id, project_member_id: pm1Dev.id,     work_date: d, hours: 6, description: 'Desenvolvimento back-end' });
      tsEntries.push({ project_id: proj1.id, project_member_id: pm1User.id,    work_date: d, hours: 4, description: 'Consultoria e alinhamento' });
    }
    const novDays = [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21];
    for (const day of novDays.slice(0, 12)) {
      const d = `2025-11-${String(day).padStart(2, '0')}`;
      tsEntries.push({ project_id: proj1.id, project_member_id: pm1Manager.id, work_date: d, hours: 2, description: 'Revisão de entregáveis' });
      tsEntries.push({ project_id: proj1.id, project_member_id: pm1Dev.id,     work_date: d, hours: 7, description: 'Desenvolvimento e testes' });
      tsEntries.push({ project_id: proj1.id, project_member_id: pm1User.id,    work_date: d, hours: 5, description: 'Análise funcional' });
    }
    await db.from('project_timesheets').insert(tsEntries);
    console.log(`   ✓ ${tsEntries.length} lançamentos de timesheet inseridos`);
  }

  // ─── Budgets ─────────────────────────────────────────────────────────────
  console.log('12/14 Criando orçamentos...');

  const { data: budget1 } = await db.from('budgets').insert({
    tenant_id: tid, client_id: cliTech.id, created_by: empAdmin.id,
    budget_number: 'ORC-2025-001',
    title: 'Transformação Digital — Plataforma Core',
    start_date: '2025-10-01', duration_months: 6,
    status: 'approved',
    taxes_percent: 8.65, commission_percent: 5, admin_expenses_percent: 12, net_margin_percent: 20,
    subtotal: 175000, total_with_fees: 193650, discount_value: 0, final_total: 193650,
    valid_until: '2025-09-30',
  }).select().single();

  if (budget1) {
    const { data: br1 } = await db.from('budget_roles').insert([
      { budget_id: budget1.id, role_name: 'Gerente de Projetos', seniority: 'senior', hourly_rate: 280 },
      { budget_id: budget1.id, role_name: 'Desenvolvedor',       seniority: 'senior', hourly_rate: 220 },
      { budget_id: budget1.id, role_name: 'Designer UX/UI',      seniority: 'pleno',  hourly_rate: 150 },
      { budget_id: budget1.id, role_name: 'Consultor',           seniority: 'senior', hourly_rate: 250 },
    ]).select();

    if (br1) {
      const roleMonths = [];
      for (let m = 1; m <= 6; m++) {
        roleMonths.push({ budget_role_id: br1[0].id, month_number: m, hours: 40  });
        roleMonths.push({ budget_role_id: br1[1].id, month_number: m, hours: 120 });
        roleMonths.push({ budget_role_id: br1[2].id, month_number: m, hours: 80  });
        roleMonths.push({ budget_role_id: br1[3].id, month_number: m, hours: 80  });
      }
      await db.from('budget_role_months').insert(roleMonths);
    }
    await db.from('budget_materials').insert([
      { budget_id: budget1.id, description: 'Licenças de Software',       value: 5000 },
      { budget_id: budget1.id, description: 'Workshops e Treinamentos',   value: 8000 },
    ]);
    await db.from('budget_suppliers').insert([
      { budget_id: budget1.id, name: 'Infraestrutura AWS', monthly_value: 3500 },
    ]);
    await db.from('projects').update({ budget_id: budget1.id }).eq('id', proj1.id);
  }

  const { data: budget2 } = await db.from('budgets').insert({
    tenant_id: tid, client_id: cliMeridian.id, created_by: empAdmin.id,
    budget_number: 'ORC-2025-002',
    title: 'Diagnóstico de Inovação — Meridian 2026',
    start_date: '2026-04-01', duration_months: 4,
    status: 'sent',
    taxes_percent: 8.65, commission_percent: 5, admin_expenses_percent: 12, net_margin_percent: 20,
    subtotal: 80000, total_with_fees: 89000, discount_value: 0, final_total: 89000,
    valid_until: '2026-03-31',
    lead_name: 'Grupo Meridian', lead_contact: 'Rodrigo Fernandes',
  }).select().single();

  if (budget2) {
    await db.from('projects').update({ budget_id: budget2.id }).eq('id', proj2.id);
  }

  console.log('   ✓ 2 orçamentos criados com roles e materiais');

  // ═══════════════════════════════════════════════════════════════════════
  // 7. PROSPECÇÃO — empresas e contatos comerciais
  // ═══════════════════════════════════════════════════════════════════════
  // Desde 29/09/2026 a Oportunidade vive como contato da Prospecção (a tabela `leads` saiu).
  // Etapas variadas, um Ganho (data e valor) e uma Perda (motivo da lista fechada).
  console.log('13/14 Criando contatos na Prospecção...');
  const contatosDemo = [
    { empresa: 'Rede Compra Fácil S.A.',   contato: 'Marcelo Ribeiro', email: 'marcelo.ribeiro@comprafacil.com.br', telefone: '11987654321', valor: 350000, etapa: 'respondeu',        alavanca: 'recomendacao',        responsavel: empManager.id, criador: empAdmin.id,   notas: 'Plataforma de E-commerce — Varejo Nacional. Interessado em migração de plataforma legada.' },
    { empresa: 'BancoMax S.A.',            contato: 'Patricia Gomes',  email: 'patricia.gomes@bancomax.com.br',     telefone: '11976543210', valor: 480000, etapa: 'reuniao_feita',    alavanca: 'outbound',            responsavel: empAdmin.id,   criador: empAdmin.id,   notas: 'Programa de Inovação Aberta 2026. Interesse em financiamento FINEP.' },
    { empresa: 'Moda Premium Ltda.',       contato: 'Fernanda Castro', email: 'fcastro@modapremium.com.br',         telefone: '11965432109', valor: 120000, etapa: 'qualificado',      alavanca: 'inbound',             responsavel: empManager.id, criador: empManager.id, notas: 'Estratégia Digital 2026 — Varejo. Proposta enviada, aguardando a diretoria.' },
    { empresa: 'PayFlow Tecnologia Ltda.', contato: 'André Lustosa',   email: 'andre@payflow.io',                   telefone: '11954321098', valor: 280000, etapa: 'qualificado',      alavanca: 'feira',               responsavel: empAdmin.id,   criador: empAdmin.id,   notas: 'Squad de Produto — FinTech MVP. Em negociação de escopo e valores.' },
    { empresa: 'LogísticaPro S.A.',        contato: 'Camila Santos',   email: 'csantos@logisticapro.com.br',        telefone: '11943210987', valor: 95000,  etapa: 'ganho',            alavanca: 'recomendacao',        responsavel: empManager.id, criador: empManager.id, notas: 'Educação Corporativa — Liderança Ágil. Contrato assinado em 05/03/2026.', ganhoEm: '2026-03-05', valorGanho: 95000 },
    { empresa: 'Vital Seguros S.A.',       contato: 'Roberto Lima',    email: 'roberto.lima@vitalseguros.com.br',   telefone: '11932109876', valor: 75000,  etapa: 'reuniao_agendada', alavanca: 'indicacao_parceiros', responsavel: empUser.id,    criador: empUser.id,    notas: 'Pesquisa de Mercado — Seguro Saúde Digital. Referenciado pelo parceiro DataBridge.' },
    { empresa: 'Indústrias Omega S.A.',    contato: 'Thiago Moura',    email: 'tmoura@omega.ind.br',                telefone: '11921098765', valor: 160000, etapa: 'em_cadencia',      alavanca: 'outbound',            responsavel: empManager.id, criador: empAdmin.id,   notas: 'Automação de Processos — RPA Fiscal.' },
    { empresa: 'Bancorex S.A.',            contato: 'Luciana Martins', email: 'luciana.martins@bancorex.com.br',    telefone: '11910987654', valor: 200000, etapa: 'a_abordar',        alavanca: 'inbound',             responsavel: empAdmin.id,   criador: empAdmin.id,   notas: 'Mentoria Executiva — Transformação Cultural. Formulário enviado via site.' },
    { empresa: 'AgroStar Ltda.',           contato: 'José Oliveira',   email: 'jose@agrostar.com.br',               telefone: null,          valor: 420000, etapa: 'descartado',       alavanca: 'recomendacao',        responsavel: empManager.id, criador: empAdmin.id,   notas: 'ERP Customizado — Agronegócio. Cliente optou por solução de prateleira.', motivoPerda: 'proposta_preco', perdidoEm: '2026-02-15' },
  ];

  const { data: empresasDemo, error: empresasError } = await db
    .from('prospect_companies')
    .insert(contatosDemo.map((c) => ({ tenant_id: tid, name: c.empresa, created_by: c.criador })))
    .select('id, name');
  if (empresasError) throw empresasError;
  const empresaPorNome = new Map(empresasDemo.map((e) => [e.name, e.id]));

  const { error: contatosError } = await db.from('prospects').insert(
    contatosDemo.map((c) => ({
      tenant_id: tid,
      company_id: empresaPorNome.get(c.empresa),
      contact_name: c.contato,
      contact_email: c.email,
      contact_phone: c.telefone,
      primary_channel: 'email',
      owner_id: c.responsavel,
      created_by: c.criador,
      lever: c.alavanca,
      stage: c.etapa,
      estimated_value: c.valor,
      notes: c.notas,
      won_on: c.ganhoEm ?? null,
      won_value: c.valorGanho ?? null,
      discard_reason: c.motivoPerda ?? null,
      discarded_at: c.perdidoEm ?? null,
    })),
  );
  if (contatosError) throw contatosError;
  console.log('   ✓ 9 contatos na Prospecção (7 em andamento, 1 Ganho, 1 Perda)');

  console.log('\n✅ Tenant demo criado com sucesso!\n');
  printCredentials();
}

function printCredentials() {
  console.log('═'.repeat(60));
  console.log('  CREDENCIAIS DE ACESSO — TENANT DEMO');
  console.log('═'.repeat(60));
  console.log('\n🔴 Administrador (acesso total):');
  console.log(`   Email:  demo.admin@ogpulse.com.br`);
  console.log(`   Senha:  Demo@2024!`);
  console.log('\n🟡 Gerente de Projetos:');
  console.log(`   Email:  demo.gerente@ogpulse.com.br`);
  console.log(`   Senha:  Demo@2024!`);
  console.log('\n🟢 Colaborador (acesso limitado):');
  console.log(`   Email:  demo.colaborador@ogpulse.com.br`);
  console.log(`   Senha:  Demo@2024!`);
  console.log('\n' + '═'.repeat(60));
  console.log('  DADOS CRIADOS:');
  console.log('  • 6 funcionários (Sócio, 2× CLT, PJ, Estagiário)');
  console.log('  • 4 clientes');
  console.log('  • 3 fornecedores');
  console.log('  • 10 tabelas de preço (role rates)');
  console.log('  • 4 projetos (Em andamento×2, Planejamento, Concluído)');
  console.log('  • 2 orçamentos (Aprovado, Enviado)');
  console.log('  • 12 parcelas de projeto');
  console.log('  • 66 lançamentos de timesheet');
  console.log('  • 9 contatos na Prospecção (etapas variadas, 1 Ganho, 1 Perda)');
  console.log('  • Feriados, Configurações financeiras');
  console.log('═'.repeat(60) + '\n');
}

run().catch((err) => {
  console.error('\n❌ Erro ao criar seed:', err.message);
  process.exit(1);
});
