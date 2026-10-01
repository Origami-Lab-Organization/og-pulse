// Adaptador da API v2 do Conta Azul (.harness/integrations/conta-azul.md). O token é de
// ADMINISTRADOR do ERP: aqui só existe leitura e o próprio OAuth. Escrever exige mudar este
// arquivo, e isso passa por revisão (ADR-0044, item 3).

import { ErroOAuth, MotivoFalha } from "./contaAzulTipos.ts";
import type { EmpresaConectada, Tokens } from "./contaAzulTipos.ts";

const LOGIN_URL = "https://login.contaazul.com/#/oauth/authorize";
const API_URL = "https://api-v2.contaazul.com";
const ESCOPO = "openid profile aws.cognito.signin.user.admin";
const TEMPO_MS = 15_000;
const ESPERAS_MS = [1_000, 3_000];
const PASSAM_COM_TEMPO = new Set([MotivoFalha.Limite, MotivoFalha.Indisponivel]);

/** Mensagem já escrita para a pessoa — nunca carrega token, código ou corpo da resposta. */
export class FalhaContaAzul extends Error {
  constructor(readonly motivo: MotivoFalha, message: string, readonly status = 0) {
    super(message);
  }
}

function config() {
  const clientId = Deno.env.get("CONTA_AZUL_CLIENT_ID");
  const clientSecret = Deno.env.get("CONTA_AZUL_CLIENT_SECRET");
  const redirectUri = Deno.env.get("CONTA_AZUL_REDIRECT_URI");
  if (!clientId || !clientSecret || !redirectUri) {
    throw new FalhaContaAzul(MotivoFalha.Configuracao, "A integração com o Conta Azul ainda não está configurada no Pulse.");
  }
  return { clientId, clientSecret, redirectUri };
}

/** O `state` amarra o retorno a quem pediu a conexão. */
export function urlDeAutorizacao(state: string): string {
  const { clientId, redirectUri } = config();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: ESCOPO,
  });
  return `${LOGIN_URL}?${params}`;
}

function falhaHttp(status: number): FalhaContaAzul {
  if (status === 401) return new FalhaContaAzul(MotivoFalha.Reconectar, "O Conta Azul recusou o acesso desta empresa. Conecte de novo.", status);
  if (status === 429) return new FalhaContaAzul(MotivoFalha.Limite, "O Conta Azul pediu para esperar. Tente de novo em instantes.", status);
  if (status >= 500) return new FalhaContaAzul(MotivoFalha.Indisponivel, "O Conta Azul não respondeu agora. Tente de novo em instantes.", status);
  return new FalhaContaAzul(MotivoFalha.Recusado, "O Conta Azul recusou o pedido.", status);
}

interface ErroDoToken {
  error?: string;
  error_subtype?: string;
}

function falhaDoToken(status: number, corpo: ErroDoToken): FalhaContaAzul {
  if (corpo.error_subtype === ErroOAuth.ClienteInvalido) {
    return new FalhaContaAzul(MotivoFalha.Configuracao, "O Conta Azul recusou as credenciais do app do Pulse.", status);
  }
  // Código vencido ou já usado, acesso revogado, refresh token morto.
  if (corpo.error === ErroOAuth.ConcessaoInvalida) {
    return new FalhaContaAzul(MotivoFalha.Reconectar, "O Conta Azul não aceitou esta autorização. Conecte de novo.", status);
  }
  return falhaHttp(status);
}

interface RespostaDoToken {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

async function pedirToken(campos: Record<string, string>): Promise<Tokens> {
  const { clientId, clientSecret } = config();
  const resposta = await fetch(`${API_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(campos),
    signal: AbortSignal.timeout(TEMPO_MS),
  });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw falhaDoToken(resposta.status, corpo as ErroDoToken);
  const { access_token, refresh_token, expires_in } = corpo as RespostaDoToken;
  if (!access_token || !refresh_token) {
    throw new FalhaContaAzul(MotivoFalha.Indisponivel, "O Conta Azul respondeu sem a autorização completa.");
  }
  return { accessToken: access_token, refreshToken: refresh_token, expiresIn: Number(expires_in) || 3600 };
}

/** O código do retorno vale 3 minutos. */
export function trocarCodigo(code: string): Promise<Tokens> {
  return pedirToken({ grant_type: "authorization_code", code, redirect_uri: config().redirectUri });
}

/** O refresh token ROTACIONA: quem chama precisa da trava da conexão (`tokenDeAcesso`). */
export function renovar(refreshToken: string): Promise<Tokens> {
  return pedirToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Recua em 429 e 5xx; não repete 4xx, que a mesma chamada não corrige. */
export async function ler<T>(accessToken: string, caminho: string, params?: Record<string, string>): Promise<T> {
  const url = `${API_URL}${caminho}${params ? `?${new URLSearchParams(params)}` : ""}`;
  for (let tentativa = 0; ; tentativa++) {
    const resposta = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(TEMPO_MS) }); // harness-ok: retry com recuo em 429/5xx
    if (resposta.ok) return (await resposta.json()) as T;
    const falha = falhaHttp(resposta.status);
    if (!PASSAM_COM_TEMPO.has(falha.motivo) || tentativa >= ESPERAS_MS.length) throw falha;
    await esperar(ESPERAS_MS[tentativa]);
  }
}

interface EmpresaDaApi {
  id_empresa?: string | number;
  documento?: string;
  razao_social?: string;
  nome_fantasia?: string;
}

export async function lerEmpresaConectada(accessToken: string): Promise<EmpresaConectada> {
  const empresa = await ler<EmpresaDaApi>(accessToken, "/v1/pessoas/conta-conectada");
  if (empresa.id_empresa == null) {
    throw new FalhaContaAzul(MotivoFalha.Indisponivel, "O Conta Azul não informou qual empresa foi conectada.");
  }
  return {
    idEmpresa: String(empresa.id_empresa),
    documento: empresa.documento ? empresa.documento.replace(/\D/g, "") : null,
    razaoSocial: empresa.razao_social ?? null,
    nomeFantasia: empresa.nome_fantasia ?? null,
  };
}

/**
 * 404 é "não havia conexão ativa": o objetivo já está cumprido. O access token segue válido
 * até completar a hora dele, por isso quem desconecta apaga o token local logo depois.
 */
export async function revogar(accessToken: string, idEmpresa: string): Promise<void> {
  const resposta = await fetch(`${API_URL}/oauth/connections/${encodeURIComponent(idEmpresa)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(TEMPO_MS),
  });
  if (resposta.ok || resposta.status === 404) return;
  throw falhaHttp(resposta.status);
}
