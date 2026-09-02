/**
 * Sessão do Pulse para o MCP de atividades.
 *
 * Entra com as credenciais da própria pessoa usando a chave publicável — então a
 * RLS vale normalmente e o MCP enxerga só o que ela enxerga. Espelha
 * `apps/mcp-drive/src/supabase.ts`, e existe para corrigir o que este servidor
 * fazia antes: `SUPABASE_SERVICE_KEY` bypassa RLS, e com ela o `tenant_id` —
 * um LLM no volante conseguia ler e escrever o kanban de qualquer tenant.
 *
 * Ver TD-0015 e ADR-0027: a RLS é a barreira, e capacidade nenhuma alcança quem
 * não passa por ela.
 *
 * A sessão fica em cache no disco, em arquivo próprio: o supabase-js rotaciona o
 * refresh token a cada renovação, então dois processos compartilhando o mesmo
 * arquivo se derrubariam mutuamente. A senha é lida do ambiente uma vez e nunca
 * passa pelo contexto do modelo.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { chmod, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const SESSION_PATH = join(homedir(), '.og-pulse', 'activities-session.json');

/** Guarda o refresh token — 0600, fora do repositório. */
const fileStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const raw = JSON.parse(await readFile(SESSION_PATH, 'utf-8')) as Record<string, string>;
      return raw[key] ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    let current: Record<string, string> = {};
    try {
      current = JSON.parse(await readFile(SESSION_PATH, 'utf-8')) as Record<string, string>;
    } catch {
      // Primeira gravação.
    }
    current[key] = value;
    await mkdir(dirname(SESSION_PATH), { recursive: true });
    await writeFile(SESSION_PATH, JSON.stringify(current), 'utf-8');
    await chmod(SESSION_PATH, 0o600);
  },
  async removeItem(key: string): Promise<void> {
    try {
      const current = JSON.parse(await readFile(SESSION_PATH, 'utf-8')) as Record<string, string>;
      delete current[key];
      if (Object.keys(current).length > 0) {
        await writeFile(SESSION_PATH, JSON.stringify(current), 'utf-8');
      } else {
        await unlink(SESSION_PATH);
      }
    } catch {
      // Nada a remover.
    }
  },
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Erro: ${name} é obrigatório.`);
    process.exit(1);
  }
  return value;
}

const supabase: SupabaseClient = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_PUBLISHABLE_KEY'),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: fileStorage,
    },
  },
);

export class PulseNotAuthenticatedError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'PulseNotAuthenticatedError';
  }
}

let ensured: Promise<void> | null = null;

async function signIn(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;

  const email = process.env.PULSE_EMAIL;
  const password = process.env.PULSE_PASSWORD;

  if (!email || !password) {
    throw new PulseNotAuthenticatedError(
      'Sessão do Pulse expirada. Defina PULSE_EMAIL e PULSE_PASSWORD na configuração do MCP.',
    );
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Sem eco da mensagem crua: ela distingue "senha errada" de "não existe".
    throw new PulseNotAuthenticatedError('Não consegui entrar no Pulse com essas credenciais.');
  }
}

/** Cliente autenticado como a pessoa — a RLS decide o que ele enxerga. */
export async function getSupabase(): Promise<SupabaseClient> {
  ensured ??= signIn().catch((error) => {
    ensured = null;
    throw error;
  });
  await ensured;
  return supabase;
}

export interface PulseEmployee {
  /** `employees.id` — é o que as tabelas de atividade referenciam como autor. */
  employeeId: string;
  tenantId: string;
  nome: string;
}

let cachedEmployee: PulseEmployee | null = null;

/**
 * Quem está no volante, resolvido pela SESSÃO — nunca por parâmetro de tool.
 *
 * Antes, `tenant_id` e `created_by`/`changed_by` vinham do LLM, o que permitia
 * escrever em tenant alheio e atribuir autoria a outra pessoa. Agora derivam de
 * `auth.uid()`, e a RLS confere de novo do outro lado.
 */
export async function currentEmployee(): Promise<PulseEmployee> {
  if (cachedEmployee) return cachedEmployee;

  const client = await getSupabase();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) {
    throw new PulseNotAuthenticatedError('Sessão sem usuário — entre novamente no Pulse.');
  }

  const { data, error } = await client
    .from('employees')
    .select('id, tenant_id, nome')
    .eq('auth_id', auth.user.id)
    .maybeSingle();

  if (error) {
    throw new PulseNotAuthenticatedError(`Não consegui identificar seu cadastro: ${error.message}`);
  }
  if (!data) {
    throw new PulseNotAuthenticatedError(
      'Sua conta autenticou, mas não há funcionário ativo correspondente no Pulse.',
    );
  }

  const row = data as { id: string; tenant_id: string; nome: string };
  cachedEmployee = { employeeId: row.id, tenantId: row.tenant_id, nome: row.nome };
  return cachedEmployee;
}
