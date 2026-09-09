/**
 * Autocadastro de empresa (PUL-227) — pública, sem JWT (config.toml).
 *
 * Cria tenant, feriados padrão, usuário administrador, funcionário e papel Admin,
 * e dispara a confirmação de e-mail. O tenant nasce em período de teste de 14 dias
 * por trigger no banco (PUL-224), não por decisão desta função.
 *
 * Proteções contra abuso, nesta ordem:
 *   1. validação estrita do corpo (zod);
 *   2. honeypot: campo `website` preenchido = robô; responde sucesso e não faz nada;
 *   3. limite de chamadas por IP e por e-mail na última hora (`signup_attempts`, só hashes);
 *   4. e-mail e CNPJ já cadastrados recusam com 409, sem revelar dados de outro tenant;
 *   5. usuário nasce NÃO confirmado; a confirmação vai pelo SMTP do Auth. Se o projeto
 *      estiver com confirmação de e-mail desligada, o Auth recusa o reenvio e a função
 *      confirma o usuário para ninguém ficar trancado.
 *
 * Toda falha no meio desfaz o que já foi criado (tenant, usuário, funcionário).
 * Erros voltam estruturados, sem stack trace (pattern security.md).
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const HttpMethod = { OPTIONS: 'OPTIONS', POST: 'POST' } as const;
const PUBLIC_APP_ORIGIN = 'https://origamipulse.com.br';
const CONFIRMATION_REDIRECT = `${PUBLIC_APP_ORIGIN}/boas-vindas`;
const LIMITS = { perIpPerHour: 5, perEmailPerHour: 3 } as const;
const ATTEMPT_RETENTION_HOURS = 24;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

const Payload = z.object({
  companyName: z.string().trim().min(2, 'Nome da empresa muito curto').max(120),
  adminName: z.string().trim().min(2, 'Nome muito curto').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(254),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(72),
  cnpj: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .pipe(z.string().length(14, 'CNPJ inválido')),
  segment: optionalText(60),
  employeeCount: z.number().int().min(1).max(100000).optional().nullable(),
  cpf: optionalText(14),
  phone: optionalText(20),
  position: optionalText(80),
  /** Honeypot: humano nunca vê nem preenche. */
  website: optionalText(200),
});

type Input = z.infer<typeof Payload>;

interface Created {
  tenantId?: string;
  userId?: string;
  employeeId?: string;
}

class RegistrationError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hmacHex(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown';
}

async function countSince(admin: SupabaseClient, column: 'ip_hash' | 'email_hash', hash: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('signup_attempts')
    .select('id', { count: 'exact', head: true })
    .eq(column, hash)
    .gte('created_at', since);
  return count ?? 0;
}

async function isRateLimited(admin: SupabaseClient, ipHash: string, emailHash: string): Promise<boolean> {
  const [byIp, byEmail] = await Promise.all([
    countSince(admin, 'ip_hash', ipHash),
    countSince(admin, 'email_hash', emailHash),
  ]);
  return byIp >= LIMITS.perIpPerHour || byEmail >= LIMITS.perEmailPerHour;
}

async function recordAttempt(admin: SupabaseClient, ipHash: string, emailHash: string, outcome: string): Promise<void> {
  const cutoff = new Date(Date.now() - ATTEMPT_RETENTION_HOURS * 60 * 60 * 1000).toISOString();
  await Promise.all([
    admin.from('signup_attempts').insert({ ip_hash: ipHash, email_hash: emailHash, outcome }),
    admin.from('signup_attempts').delete().lt('created_at', cutoff),
  ]);
}

async function assertNotRegistered(admin: SupabaseClient, input: Input): Promise<void> {
  const { data: employee } = await admin.from('employees').select('id').ilike('email', input.email).limit(1).maybeSingle();
  if (employee) {
    throw new RegistrationError(409, 'Este e-mail já tem uma conta no Pulse. Entre com ela ou use outro e-mail.');
  }
  const { data: tenant } = await admin.from('tenants').select('id').eq('cnpj', input.cnpj).limit(1).maybeSingle();
  if (tenant) {
    throw new RegistrationError(
      409,
      'Já existe uma empresa cadastrada com este CNPJ. Se for a sua, entre com sua conta ou escreva para italo@origamilab.com.br.',
    );
  }
}

const DEFAULT_HOLIDAYS = [
  { name: 'Confraternização Universal', holiday_type: 'fixed', fixed_day: 1, fixed_month: 1 },
  { name: 'Tiradentes', holiday_type: 'fixed', fixed_day: 21, fixed_month: 4 },
  { name: 'Dia do Trabalho', holiday_type: 'fixed', fixed_day: 1, fixed_month: 5 },
  { name: 'Independência do Brasil', holiday_type: 'fixed', fixed_day: 7, fixed_month: 9 },
  { name: 'Nossa Senhora Aparecida', holiday_type: 'fixed', fixed_day: 12, fixed_month: 10 },
  { name: 'Finados', holiday_type: 'fixed', fixed_day: 2, fixed_month: 11 },
  { name: 'Proclamação da República', holiday_type: 'fixed', fixed_day: 15, fixed_month: 11 },
  { name: 'Natal', holiday_type: 'fixed', fixed_day: 25, fixed_month: 12 },
  { name: 'Carnaval (Segunda)', holiday_type: 'floating', specific_date: '2026-02-16', reference_year: 2026 },
  { name: 'Carnaval (Terça)', holiday_type: 'floating', specific_date: '2026-02-17', reference_year: 2026 },
  { name: 'Sexta-feira Santa', holiday_type: 'floating', specific_date: '2026-04-03', reference_year: 2026 },
  { name: 'Corpus Christi', holiday_type: 'floating', specific_date: '2026-06-04', reference_year: 2026 },
] as const;

async function createTenant(admin: SupabaseClient, input: Input): Promise<{ id: string; trial_ends_at: string | null }> {
  const { data, error } = await admin
    .from('tenants')
    .insert({
      name: input.companyName,
      cnpj: input.cnpj,
      segment: input.segment ?? null,
      employee_count: input.employeeCount ?? null,
    })
    .select('id, trial_ends_at')
    .single();
  if (error || !data) {
    console.error('register-tenant: erro ao criar tenant:', error?.message);
    throw new RegistrationError(500, 'Erro ao criar empresa. Tente novamente.');
  }
  return data;
}

async function seedHolidays(admin: SupabaseClient, tenantId: string): Promise<void> {
  const { error } = await admin
    .from('company_holidays')
    .insert(DEFAULT_HOLIDAYS.map((holiday) => ({ tenant_id: tenantId, ...holiday })));
  if (error) console.error('register-tenant: feriados padrão não semeados:', error.message);
}

async function createAdminUser(admin: SupabaseClient, input: Input): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: false,
  });
  if (error || !data.user) {
    const message = error?.message?.toLowerCase() ?? '';
    if (message.includes('already') || message.includes('exists') || message.includes('duplicate')) {
      throw new RegistrationError(409, 'Este e-mail já tem uma conta no Pulse. Entre com ela ou use outro e-mail.');
    }
    console.error('register-tenant: erro ao criar usuário:', error?.message);
    throw new RegistrationError(500, 'Erro ao criar usuário. Tente novamente.');
  }
  return data.user.id;
}

async function createEmployee(admin: SupabaseClient, input: Input, tenantId: string, userId: string): Promise<string> {
  const { data, error } = await admin
    .from('employees')
    .insert({
      nome: input.adminName,
      email: input.email,
      cargo: input.position || 'Administrador',
      cpf: input.cpf || '00000000000',
      telefone: input.phone || '00000000000',
      data_admissao: new Date().toISOString().slice(0, 10),
      is_gerente: true,
      tenant_id: tenantId,
      auth_id: userId,
      must_change_password: false,
      system_role: 'admin',
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('register-tenant: erro ao criar funcionário:', error?.message);
    throw new RegistrationError(500, 'Erro ao criar funcionário. Tente novamente.');
  }
  return data.id;
}

async function assignAdminRole(admin: SupabaseClient, tenantId: string, userId: string): Promise<void> {
  // Perfil do tenant, não papel global (PUL-206). O tenant nasce com os quatro perfis
  // padrão por trigger, então "Admin" sempre existe.
  const { data: role } = await admin.from('tenant_roles').select('id').eq('tenant_id', tenantId).eq('name', 'Admin').maybeSingle();
  const { error } = await admin.from('user_tenant_roles').insert({ user_id: userId, tenant_id: tenantId, role_id: role?.id ?? null });
  if (error) {
    console.error('register-tenant: erro ao atribuir perfil Admin:', error.message);
    throw new RegistrationError(500, 'Erro ao atribuir permissões. Tente novamente.');
  }
}

/**
 * Dispara a confirmação pelo SMTP do Auth. Devolve `{ sent, autoConfirmed }`: quando o
 * projeto está com confirmação de e-mail desligada, o Auth recusa o reenvio; aí a função
 * confirma o usuário diretamente para a pessoa não ficar presa na tela de confirmação.
 */
async function sendConfirmation(anon: SupabaseClient, admin: SupabaseClient, email: string, userId: string) {
  const { error } = await anon.auth.resend({ type: 'signup', email, options: { emailRedirectTo: CONFIRMATION_REDIRECT } });
  if (!error) return { sent: true, autoConfirmed: false };
  console.error('register-tenant: confirmação não enviada:', error.message);
  const { error: confirmError } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (confirmError) console.error('register-tenant: confirmação direta falhou:', confirmError.message);
  return { sent: false, autoConfirmed: !confirmError };
}

async function rollback(admin: SupabaseClient, created: Created): Promise<void> {
  if (created.employeeId) await admin.from('employees').delete().eq('id', created.employeeId);
  if (created.userId) await admin.auth.admin.deleteUser(created.userId);
  if (created.tenantId) await admin.from('tenants').delete().eq('id', created.tenantId);
}

async function register(admin: SupabaseClient, anon: SupabaseClient, input: Input) {
  const created: Created = {};
  try {
    const tenant = await createTenant(admin, input);
    created.tenantId = tenant.id;
    await seedHolidays(admin, tenant.id);
    created.userId = await createAdminUser(admin, input);
    created.employeeId = await createEmployee(admin, input, tenant.id, created.userId);
    await assignAdminRole(admin, tenant.id, created.userId);
    const confirmation = await sendConfirmation(anon, admin, input.email, created.userId);
    return { tenantId: tenant.id, trialEndsAt: tenant.trial_ends_at, ...confirmation };
  } catch (error) {
    await rollback(admin, created);
    throw error;
  }
}

function parseInput(body: unknown): Input {
  const parsed = Payload.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new RegistrationError(400, first?.message ?? 'Dados inválidos.');
  }
  return parsed.data;
}

interface Clients {
  admin: SupabaseClient;
  anon: SupabaseClient;
  secret: string;
}

function clients(): Clients {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const options = { auth: { autoRefreshToken: false, persistSession: false } };
  return { admin: createClient(supabaseUrl, secret, options), anon: createClient(supabaseUrl, anonKey, options), secret };
}

async function handleRegistration(req: Request, { admin, anon, secret }: Clients): Promise<Response> {
  const input = parseInput(await req.json().catch(() => ({})));

  // Robô preencheu o campo invisível: finge sucesso e não cria nada.
  if (input.website) return json({ success: true, confirmationEmailSent: true });

  const [ipHash, emailHash] = await Promise.all([hmacHex(clientIp(req), secret), hmacHex(input.email, secret)]);
  if (await isRateLimited(admin, ipHash, emailHash)) {
    await recordAttempt(admin, ipHash, emailHash, 'rate_limited');
    return json({ error: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.' }, 429);
  }
  await recordAttempt(admin, ipHash, emailHash, 'attempt');

  await assertNotRegistered(admin, input);
  const result = await register(admin, anon, input);

  return json({
    success: true,
    tenantId: result.tenantId,
    trialEndsAt: result.trialEndsAt,
    confirmationEmailSent: result.sent,
    autoConfirmed: result.autoConfirmed,
  });
}

function toErrorResponse(error: unknown): Response {
  if (error instanceof RegistrationError) return json({ error: error.message }, error.status);
  console.error('register-tenant: erro inesperado:', error instanceof Error ? error.message : 'desconhecido');
  return json({ error: 'Erro interno. Tente novamente mais tarde.' }, 500);
}

Deno.serve(async (req) => {
  if (req.method === HttpMethod.OPTIONS) return new Response(null, { headers: corsHeaders });
  if (req.method !== HttpMethod.POST) return json({ error: 'Método não permitido' }, 405);
  try {
    return await handleRegistration(req, clients());
  } catch (error) {
    return toErrorResponse(error);
  }
});
