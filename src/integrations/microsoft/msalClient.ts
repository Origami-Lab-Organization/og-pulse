import {
  AuthError,
  BrowserAuthErrorCodes,
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
  type Configuration,
} from '@azure/msal-browser';
import { GRAPH_SCOPES } from '@/services/microsoftGraphService';
import type { MicrosoftDiagnostics } from '@/types/microsoftGraph';
import { MICROSOFT_CLIENT_ID, MICROSOFT_TENANT_ID } from './config';

/**
 * Autorização de leitura da Microsoft para o Pulse.
 *
 * Este fluxo é independente do Supabase Auth: a pessoa entra no Pulse pelo
 * login normal e depois autoriza o acesso à própria agenda/caixa de entrada.
 * O provider Microsoft do Supabase Auth não está disponível no backend
 * gerenciado pelo Lovable Cloud — contexto em jornadas/docs/poc-microsoft-365.md.
 *
 * A MSAL cuida do refresh silencioso do token; nenhum token trafega por
 * tabela nossa, log ou Edge Function.
 */

const clientId = MICROSOFT_CLIENT_ID;
const tenantId = MICROSOFT_TENANT_ID;

export function isMicrosoftConfigured(): boolean {
  return Boolean(clientId && tenantId);
}

/** A integração não está configurada neste ambiente (falta client/tenant id). */
export class MicrosoftNotConfiguredError extends Error {
  constructor() {
    super('Integração Microsoft não configurada neste ambiente.');
    this.name = 'MicrosoftNotConfiguredError';
  }
}

/** Ninguém autorizou o acesso ainda — a UI deve oferecer "Conectar". */
export class MicrosoftNotConnectedError extends Error {
  constructor() {
    super('Conta Microsoft não conectada.');
    this.name = 'MicrosoftNotConnectedError';
  }
}

function buildConfig(): Configuration {
  return {
    auth: {
      clientId: clientId as string,
      // Authority com o tenant da empresa (nunca `common`): só contas do
      // diretório da organização conseguem autorizar.
      authority: `https://login.microsoftonline.com/${tenantId}`,
      // Página estática e vazia: apontar para a raiz carrega a SPA no popup e o
      // redirect de rota apaga o fragmento com o código do OAuth.
      redirectUri: `${window.location.origin}/microsoft-auth.html`,
    },
    cache: {
      // Sem localStorage a MSAL depende de cookie de terceiro para o refresh
      // silencioso, que os navegadores bloqueiam.
      cacheLocation: 'localStorage',
    },
  };
}

let instancePromise: Promise<PublicClientApplication> | null = null;

async function getInstance(): Promise<PublicClientApplication> {
  if (!isMicrosoftConfigured()) throw new MicrosoftNotConfiguredError();

  if (!instancePromise) {
    instancePromise = (async () => {
      const instance = new PublicClientApplication(buildConfig());
      await instance.initialize();
      return instance;
    })();
  }

  return instancePromise;
}

function firstAccount(instance: PublicClientApplication): AccountInfo | null {
  return instance.getActiveAccount() ?? instance.getAllAccounts()[0] ?? null;
}

/** E-mail da conta Microsoft conectada, ou null quando não há autorização. */
export async function getConnectedAccountEmail(): Promise<string | null> {
  if (!isMicrosoftConfigured()) return null;
  const instance = await getInstance();
  const account = firstAccount(instance);
  return account?.username ?? null;
}

/**
 * Estado bruto da MSAL para exibição em tela. Existe porque o DevTools está
 * bloqueado por política da organização — sem isso não há como distinguir
 * "cache vazio" de "leitura errada" ao investigar a conexão.
 */
export async function readMicrosoftDiagnostics(): Promise<MicrosoftDiagnostics> {
  const msalKeys = Object.keys(localStorage).filter((key) => key.startsWith('msal'));
  const base = {
    msalKeys: msalKeys.length,
    sampleKeys: msalKeys.slice(0, 8),
  };

  if (!isMicrosoftConfigured()) {
    return { ...base, configured: false, accounts: 0, hasActiveAccount: false };
  }

  const instance = await getInstance();
  return {
    ...base,
    configured: true,
    accounts: instance.getAllAccounts().length,
    hasActiveAccount: Boolean(instance.getActiveAccount()),
  };
}

/**
 * A MSAL marca `msal.interaction.status` enquanto o popup está aberto e só
 * limpa no fim do fluxo. Se a página recarregar com o popup no ar (HMR, F5,
 * popup bloqueado), a marca sobrevive e todo clique seguinte falha com
 * `interaction_in_progress` — inclusive depois de recarregar. Limpar a chave é
 * a única saída, então fazemos isso aqui em vez de pedir ao usuário.
 */
function clearStuckInteractionState(): void {
  const key = 'msal.interaction.status';
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
}

function isInteractionStuck(error: unknown): boolean {
  return (
    error instanceof AuthError &&
    error.errorCode === BrowserAuthErrorCodes.interactionInProgress
  );
}

/**
 * Fixa a conta autorizada como ativa. Sem isso, `getAllAccounts()` pode não
 * refletir o resultado do popup na leitura seguinte e a UI continua achando
 * que ninguém conectou.
 */
function adoptAccount(
  instance: PublicClientApplication,
  account: AccountInfo | null,
): string {
  if (!account) {
    throw new AuthError(
      'no_account_returned',
      'A Microsoft não devolveu a conta autorizada.',
    );
  }
  instance.setActiveAccount(account);
  return account.username;
}

/** Popup da Microsoft, com uma segunda tentativa quando a interação travou. */
async function popupWithRecovery(instance: PublicClientApplication) {
  try {
    return await instance.acquireTokenPopup({ scopes: GRAPH_SCOPES });
  } catch (error) {
    if (!isInteractionStuck(error)) throw error;

    clearStuckInteractionState();
    return await instance.acquireTokenPopup({ scopes: GRAPH_SCOPES });
  }
}

/** Abre o consentimento da Microsoft. Devolve o e-mail da conta autorizada. */
export async function connectMicrosoft(): Promise<string> {
  const instance = await getInstance();
  const result = await popupWithRecovery(instance);
  return adoptAccount(instance, result.account);
}

/**
 * ID token do Entra ID — a prova de identidade que a Edge Function valida para
 * emitir a sessão do Supabase. Diferente do access token do Graph: este afirma
 * QUEM a pessoa é, e por isso nunca é usado para chamar API.
 */
export async function acquireMicrosoftIdToken(): Promise<string> {
  const instance = await getInstance();
  const account = firstAccount(instance);

  if (account) {
    try {
      const silent = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPES, account });
      if (silent.idToken) return silent.idToken;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) throw error;
    }
  }

  const result = await popupWithRecovery(instance);
  adoptAccount(instance, result.account);
  return result.idToken;
}

/**
 * Esquece a autorização apenas no Pulse. Não faz logout da conta Microsoft —
 * derrubar a sessão do Office inteiro seria um efeito colateral inesperado.
 */
export async function disconnectMicrosoft(): Promise<void> {
  const instance = await getInstance();
  const account = firstAccount(instance);
  if (account) {
    await instance.clearCache({ account });
  }
}

/**
 * Access token do Graph. Renova em silêncio quando possível e só reabre o
 * popup se a Microsoft exigir interação (senha trocada, MFA, consentimento
 * revogado).
 */
export async function acquireGraphTokenForScopes(scopes: string[]): Promise<string> {
  const instance = await getInstance();
  const account = firstAccount(instance);
  if (!account) throw new MicrosoftNotConnectedError();

  try {
    const result = await instance.acquireTokenSilent({ scopes, account });
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      const result = await instance.acquireTokenPopup({ scopes, account });
      return result.accessToken;
    }
    throw error;
  }
}

export async function acquireGraphToken(): Promise<string> {
  return acquireGraphTokenForScopes(GRAPH_SCOPES);
}
