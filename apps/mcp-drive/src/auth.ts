/**
 * Autorização delegada da Microsoft, por device code.
 *
 * Delegado, nunca application permission (ADR-0019): cada pessoa autoriza a
 * própria conta e o Graph responde com a permissão que ela já tem no OneDrive.
 *
 * Implementado direto contra os endpoints do Entra, sem MSAL, por um motivo
 * concreto: o cliente MCP reinicia o servidor entre chamadas, e a MSAL mantém o
 * device code em memória aguardando a pessoa concluir no navegador. Com o
 * reinício, a autorização se perdia e nada era gravado. Aqui o `device_code`
 * vai para o disco e a conclusão é retomada por qualquer chamada seguinte.
 */

import { chmod, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { DeviceCodeSession, StoredTokens } from './types.js';

export const FILES_SCOPES = ['Files.ReadWrite.All', 'offline_access', 'openid', 'profile'];

const STATE_DIR = join(homedir(), '.og-pulse');
const TOKENS_PATH = join(STATE_DIR, 'microsoft-tokens.json');
const PENDING_PATH = join(STATE_DIR, 'microsoft-device-code.json');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Erro: ${name} é obrigatório.`);
    process.exit(1);
  }
  return value;
}

const CLIENT_ID = requireEnv('MICROSOFT_CLIENT_ID');
const TENANT_ID = requireEnv('MICROSOFT_TENANT_ID');
const AUTHORITY = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0`;

export class NotAuthorizedError extends Error {
  constructor(detail = 'Conta Microsoft ainda não autorizada neste computador.') {
    super(detail);
    this.name = 'NotAuthorizedError';
  }
}

/** Contém refresh token: 0600 e fora do repositório. */
async function writePrivate(path: string, value: unknown): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(path, JSON.stringify(value), 'utf-8');
  await chmod(path, 0o600);
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as T;
  } catch {
    return null;
  }
}

async function postForm(path: string, body: Record<string, string>) {
  const response = await fetch(`${AUTHORITY}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });

  return { ok: response.ok, payload: (await response.json()) as Record<string, any> };
}

interface PendingDeviceCode {
  deviceCode: string;
  expiresAt: number;
  userCode: string;
  verificationUri: string;
}

export async function startDeviceCode(): Promise<DeviceCodeSession> {
  const { ok, payload } = await postForm('/devicecode', {
    client_id: CLIENT_ID,
    scope: FILES_SCOPES.join(' '),
  });

  if (!ok) {
    // AADSTS7000218: o app não permite fluxo de cliente público — o toggle
    // "Allow public client flows" no Entra ID resolve.
    throw new Error(payload.error_description ?? 'Não consegui iniciar a autorização.');
  }

  await writePrivate(PENDING_PATH, {
    deviceCode: payload.device_code,
    expiresAt: Date.now() + Number(payload.expires_in ?? 900) * 1000,
    userCode: payload.user_code,
    verificationUri: payload.verification_uri,
  } satisfies PendingDeviceCode);

  // O código vive ~15 min e o Entra não deixa estender. Sem alguém consultando,
  // vence enquanto a pessoa já acha que autorizou.
  pollUntilAuthorized(Number(payload.interval ?? 5));

  return {
    instructions: payload.message as string,
    userCode: payload.user_code as string,
    verificationUri: payload.verification_uri as string,
  };
}

let polling = false;

function pollUntilAuthorized(intervalSeconds: number): void {
  if (polling) return;
  polling = true;

  let delay = Math.max(intervalSeconds, 3) * 1000;

  const tick = async (): Promise<void> => {
    const pending = await readJson<PendingDeviceCode>(PENDING_PATH);

    if (!pending || Date.now() > pending.expiresAt) {
      polling = false;
      return;
    }

    const { ok, payload } = await postForm('/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: CLIENT_ID,
      device_code: pending.deviceCode,
    });

    if (ok) {
      await persistTokens(payload);
      polling = false;
      return;
    }

    // `slow_down` é a Microsoft pedindo para espaçar; ignorar leva a bloqueio.
    if (payload.error === 'slow_down') delay += 5_000;

    if (payload.error !== 'authorization_pending' && payload.error !== 'slow_down') {
      polling = false;
      return;
    }

    schedule();
  };

  const schedule = () => {
    // unref: o laço não segura o processo vivo se o cliente MCP encerrar.
    setTimeout(() => void tick().catch(() => { polling = false; }), delay).unref();
  };

  schedule();
}

async function persistTokens(payload: Record<string, any>): Promise<void> {
  await writePrivate(TOKENS_PATH, {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + Number(payload.expires_in ?? 3600) * 1000,
    account: readAccountFromIdToken(payload.id_token),
  } satisfies StoredTokens);

  await unlink(PENDING_PATH).catch(() => undefined);
}

/** Só o `preferred_username`, para exibir quem está autorizado. */
function readAccountFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf-8'));
    return claims.preferred_username ?? claims.upn ?? null;
  } catch {
    return null;
  }
}

/**
 * Tenta concluir uma autorização pendente. `authorization_pending` é resposta
 * esperada enquanto a pessoa não terminou no navegador — não é erro.
 */
async function tryCompletePending(): Promise<boolean> {
  const pending = await readJson<PendingDeviceCode>(PENDING_PATH);
  if (!pending) return false;

  if (Date.now() > pending.expiresAt) {
    await unlink(PENDING_PATH).catch(() => undefined);
    throw new NotAuthorizedError('O código expirou. Peça um novo login da Microsoft.');
  }

  const { ok, payload } = await postForm('/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    client_id: CLIENT_ID,
    device_code: pending.deviceCode,
  });

  if (ok) {
    await persistTokens(payload);
    return true;
  }

  if (payload.error === 'authorization_pending' || payload.error === 'slow_down') {
    throw new NotAuthorizedError(
      `Ainda aguardando você concluir em ${pending.verificationUri} com o código ${pending.userCode}.`,
    );
  }

  // Erro de configuração do app (ex.: AADSTS7000218, cliente público desligado)
  // é corrigível sem refazer o login — descartar o pendente obrigaria a pessoa a
  // repetir o navegador à toa.
  const isConfigIssue = payload.error === 'invalid_client';
  if (!isConfigIssue) await unlink(PENDING_PATH).catch(() => undefined);

  throw new NotAuthorizedError(payload.error_description ?? 'A autorização não foi concluída.');
}

async function refresh(tokens: StoredTokens): Promise<string> {
  const { ok, payload } = await postForm('/token', {
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    refresh_token: tokens.refreshToken,
    scope: FILES_SCOPES.join(' '),
  });

  if (!ok) {
    await unlink(TOKENS_PATH).catch(() => undefined);
    throw new NotAuthorizedError('A autorização expirou. Faça o login da Microsoft de novo.');
  }

  await persistTokens(payload);
  return payload.access_token as string;
}

export async function acquireToken(): Promise<string> {
  let tokens = await readJson<StoredTokens>(TOKENS_PATH);

  // Sem token ainda: talvez exista uma autorização iniciada antes de um
  // reinício do servidor — é exatamente o caso que a persistência resolve.
  if (!tokens) {
    await tryCompletePending();
    // harness-ok: releitura proposital — tryCompletePending acabou de gravar o arquivo.
    tokens = await readJson<StoredTokens>(TOKENS_PATH);
    if (!tokens) throw new NotAuthorizedError();
  }

  // Margem de 60s para o token não vencer no meio de uma chamada.
  if (Date.now() < tokens.expiresAt - 60_000) return tokens.accessToken;
  return refresh(tokens);
}

export async function currentAccount(): Promise<string | null> {
  const tokens = await readJson<StoredTokens>(TOKENS_PATH);
  return tokens?.account ?? null;
}

/** Usado pelo status para diferenciar "nunca autorizou" de "não terminou". */
export async function pendingAuthorization(): Promise<{ userCode: string; uri: string } | null> {
  const pending = await readJson<PendingDeviceCode>(PENDING_PATH);
  if (!pending || Date.now() > pending.expiresAt) return null;
  return { userCode: pending.userCode, uri: pending.verificationUri };
}
