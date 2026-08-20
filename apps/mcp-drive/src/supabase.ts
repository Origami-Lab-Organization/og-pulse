/**
 * Sessão do Pulse para o MCP.
 *
 * Usa a chave publicável (a mesma do bundle) e entra com as credenciais da
 * própria pessoa — então a RLS vale normalmente e o MCP enxerga só os projetos
 * que ela enxerga. É deliberadamente diferente do `apps/mcp-activities`, que usa
 * service_role e bypassa RLS: aqui um LLM está no volante.
 *
 * A sessão fica em cache no disco; a senha é lida do ambiente uma vez e nunca
 * passa pelo contexto do modelo.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { chmod, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const SESSION_PATH = join(homedir(), '.og-pulse', 'pulse-session.json');

/** Guarda refresh token da sessão — 0600, fora do repositório. */
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

export async function currentPulseUser(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}
