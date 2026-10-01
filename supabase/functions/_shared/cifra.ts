// AES-256-GCM dos tokens do Conta Azul (ADR-0044, item 3). A chave (`CONTA_AZUL_TOKEN_KEY`,
// `openssl rand -base64 32`) mora só nos secrets das Edge Functions: o banco, sozinho, não abre.

import { FalhaContaAzul } from "./contaAzul.ts";
import { MotivoFalha } from "./contaAzulTipos.ts";

const IV_BYTES = 12;
const CHAVE_BYTES = 32;

const paraBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const deBase64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

let chave: Promise<CryptoKey> | null = null;

function importarChave(): Promise<CryptoKey> {
  let bytes: Uint8Array;
  try {
    bytes = deBase64(Deno.env.get("CONTA_AZUL_TOKEN_KEY") ?? "");
  } catch {
    bytes = new Uint8Array();
  }
  if (bytes.length !== CHAVE_BYTES) {
    throw new FalhaContaAzul(MotivoFalha.Configuracao, "A integração com o Conta Azul ainda não está configurada no Pulse.");
  }
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

const aChave = () => (chave ??= importarChave());

/** Formato guardado: `base64(iv).base64(texto cifrado)`. */
export async function cifrar(texto: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cifrado = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aChave(), new TextEncoder().encode(texto));
  return `${paraBase64(iv)}.${paraBase64(new Uint8Array(cifrado))}`;
}

export async function decifrar(valor: string): Promise<string> {
  const [iv, cifrado] = valor.split(".");
  const aberto = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deBase64(iv) }, await aChave(), deBase64(cifrado));
  return new TextDecoder().decode(aberto);
}
