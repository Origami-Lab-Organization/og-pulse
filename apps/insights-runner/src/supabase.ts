/**
 * Sessão do Pulse para o runner de insights (ADR-0057). Como o MCP da Prospecção: entra com o
 * login do dono do runner e a chave publicável, então a RLS vale em cada escrita. Nunca a chave
 * de serviço. A sessão fica num arquivo só dele (o refresh token gira a cada renovação).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { Conexao, Dono } from './tipos.js';

const SESSAO = join(homedir(), '.og-pulse', 'insights-runner-session.json');

async function lerSessao(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(SESSAO, 'utf-8')) as Record<string, string>;
  } catch {
    return {};
  }
}

const armazenamento = {
  getItem: async (chave: string) => (await lerSessao())[chave] ?? null,
  async setItem(chave: string, valor: string) {
    const atual = { ...(await lerSessao()), [chave]: valor };
    await mkdir(dirname(SESSAO), { recursive: true });
    await writeFile(SESSAO, JSON.stringify(atual), 'utf-8');
    await chmod(SESSAO, 0o600);
  },
  async removeItem(chave: string) {
    const { [chave]: _, ...resto } = await lerSessao();
    await writeFile(SESSAO, JSON.stringify(resto), 'utf-8');
  },
};

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Defina ${nome} em ~/.og-pulse/insights-runner.env.`);
  return valor;
}

async function entrar(pulse: SupabaseClient): Promise<void> {
  const { data } = await pulse.auth.getSession();
  if (data.session) return;
  const { error } = await pulse.auth.signInWithPassword({
    email: obrigatoria('PULSE_EMAIL'),
    password: obrigatoria('PULSE_PASSWORD'),
  });
  // Sem eco da mensagem crua: ela distingue "senha errada" de "não existe".
  if (error) throw new Error('Não consegui entrar no Pulse com essas credenciais.');
}

/** O dono do runner: o usuário da sessão e o tenant dele (pelo cadastro de pessoas). */
async function lerDono(pulse: SupabaseClient): Promise<Dono> {
  const { data: auth } = await pulse.auth.getUser();
  if (!auth.user) throw new Error('Sessão sem usuário.');
  const { data, error } = await pulse.from('employees').select('tenant_id').eq('auth_id', auth.user.id).limit(1).maybeSingle();
  if (error || !data) throw new Error('Não achei o cadastro desta pessoa no Pulse.');
  return { userId: auth.user.id, tenantId: (data as { tenant_id: string }).tenant_id };
}

export async function conectar(): Promise<Conexao> {
  const pulse = createClient(obrigatoria('SUPABASE_URL'), obrigatoria('SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: true, autoRefreshToken: true, storage: armazenamento },
  });
  await entrar(pulse);
  return { pulse, dono: await lerDono(pulse) };
}
