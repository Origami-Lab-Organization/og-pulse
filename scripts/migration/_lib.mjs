/**
 * Helpers compartilhados pelos scripts de migração.
 *
 * Regra de ouro deste diretório: service key só vem de env, nunca de argv
 * (argv vaza no histórico do shell e em `ps`), e nunca é impressa.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const CLIENT_OPTS = { auth: { autoRefreshToken: false, persistSession: false } };

/** Lê uma env obrigatória ou aborta com mensagem útil. */
export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Falta a variável ${name}.`);
    console.error('   Copie scripts/migration/env.example para .env.migration e rode com:');
    console.error('   node --env-file=.env.migration scripts/migration/<script>.mjs');
    process.exit(1);
  }
  return value;
}

/** Lê a chave anon da origem do .env.lovable (backup feito ao apontar o .env). */
function anonKeyDaOrigem() {
  if (process.env.ORIGIN_ANON_KEY) return process.env.ORIGIN_ANON_KEY;
  for (const arquivo of ['.env.lovable', '.env.production']) {
    try {
      const texto = readFileSync(arquivo, 'utf8');
      const m = texto.match(/^VITE_SUPABASE_PUBLISHABLE_KEY="?([^"\n]+)"?/m);
      if (m) return m[1];
    } catch { /* arquivo não existe, tenta o próximo */ }
  }
  return null;
}

/**
 * Cliente da origem em MODO USUÁRIO: sem service key, autenticando com
 * e-mail/senha de um admin. A RLS passa a valer — o que significa cobertura
 * parcial: só o que aquele admin pode ver.
 */
async function origemPorLogin(originUrl) {
  const anon = anonKeyDaOrigem();
  if (!anon) {
    console.error('❌ Sem ORIGIN_SERVICE_KEY e sem chave anon da origem.');
    console.error('   Defina ORIGIN_ANON_KEY ou mantenha o .env.lovable no lugar.');
    process.exit(1);
  }
  const email = requireEnv('ORIGIN_ADMIN_EMAIL');
  const senha = requireEnv('ORIGIN_ADMIN_PASSWORD');
  const db = createClient(originUrl, anon, CLIENT_OPTS);

  const { data, error } = await db.auth.signInWithPassword({ email, password: senha });
  if (error) {
    console.error(`❌ Login na origem falhou: ${error.message}`);
    process.exit(1);
  }
  console.log(`🔑 origem em modo usuário — autenticado como ${email}`);
  console.log('   ⚠️  A RLS vale: a cópia alcança só o que este usuário pode ver.');
  return { db, modo: 'usuario', userId: data.user.id };
}

/** Monta os dois clientes (origem e destino) a partir do ambiente. */
export async function buildClients() {
  const originUrl = requireEnv('ORIGIN_SUPABASE_URL');
  const targetUrl = requireEnv('TARGET_SUPABASE_URL');

  if (originUrl === targetUrl) {
    console.error('❌ ORIGIN_SUPABASE_URL e TARGET_SUPABASE_URL são iguais. Abortando.');
    process.exit(1);
  }

  const temService = Boolean(process.env.ORIGIN_SERVICE_KEY);
  const origem = temService
    ? { db: createClient(originUrl, process.env.ORIGIN_SERVICE_KEY, CLIENT_OPTS), modo: 'service' }
    : await origemPorLogin(originUrl);

  return {
    origin: { label: 'origem', url: originUrl, key: process.env.ORIGIN_SERVICE_KEY ?? null, ...origem },
    target: {
      label: 'destino',
      url: targetUrl,
      key: requireEnv('TARGET_SERVICE_KEY'),
      modo: 'service',
      db: createClient(targetUrl, requireEnv('TARGET_SERVICE_KEY'), CLIENT_OPTS),
    },
  };
}

/**
 * Lista as tabelas/views expostas pela API, lendo o OpenAPI do PostgREST.
 * É o único jeito de enumerar o schema da ORIGEM sem acesso ao Postgres.
 */
export async function listExposedTables(project) {
  const res = await fetch(`${project.url}/rest/v1/`, {
    headers: { apikey: project.key, Authorization: `Bearer ${project.key}` },
  });
  if (!res.ok) {
    throw new Error(`OpenAPI da ${project.label} respondeu ${res.status} — service key inválida?`);
  }
  const spec = await res.json();
  const names = Object.keys(spec.definitions ?? {});
  return names.filter((n) => !n.startsWith('(')).sort();
}

/** Conta linhas de uma tabela via PostgREST (service key ignora RLS). */
export async function countRows(project, table) {
  const { count, error } = await project.db
    .from(table)
    .select('*', { count: 'exact', head: true });
  return error ? { error: error.message } : { count: count ?? 0 };
}

/** Todos os ids de usuário do projeto, em ordem — para provar que as FKs sobrevivem. */
export async function listUserIds(project) {
  const ids = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await project.db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers na ${project.label}: ${error.message}`);
    ids.push(...data.users.map((u) => u.id));
    if (data.users.length < 1000) break;
  }
  return ids.sort();
}

/** Buckets do projeto, indexados por id. */
export async function listBuckets(project) {
  const { data, error } = await project.db.storage.listBuckets();
  if (error) throw new Error(`listBuckets na ${project.label}: ${error.message}`);
  return new Map(data.map((b) => [b.id, b]));
}

/** Percorre um bucket recursivamente e devolve todos os arquivos (não pastas). */
export async function walkBucket(project, bucketId, prefix = '') {
  const files = [];
  const pending = [prefix];

  while (pending.length > 0) {
    const dir = pending.pop();
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await project.db.storage
        .from(bucketId)
        .list(dir, { limit: 1000, offset });
      if (error) throw new Error(`list ${bucketId}/${dir}: ${error.message}`);
      for (const entry of data) {
        const path = dir ? `${dir}/${entry.name}` : entry.name;
        if (entry.id === null) pending.push(path);
        else files.push({ path, size: entry.metadata?.size ?? null, mime: entry.metadata?.mimetype });
      }
      if (data.length < 1000) break;
    }
  }
  return files;
}

export const fmt = (n) => new Intl.NumberFormat('pt-BR').format(n);
