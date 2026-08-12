import { readFile, stat } from 'node:fs/promises';
import { basename, isAbsolute, resolve } from 'node:path';
import { homedir } from 'node:os';
import { lookup } from 'node:dns/promises';
import type { LoadedSource } from './types.js';

/** Teto para não estourar memória nem prender o chat em upload eterno. */
export const MAX_SOURCE_BYTES = 100 * 1024 * 1024;

function expandHome(path: string): string {
  return path.startsWith('~') ? resolve(homedir(), path.slice(1).replace(/^\/+/, '')) : path;
}

async function loadFromDisk(path: string): Promise<LoadedSource> {
  const absolute = expandHome(path);
  if (!isAbsolute(absolute)) {
    throw new Error('Informe o caminho absoluto do arquivo (ex.: /Users/voce/Downloads/ata.docx).');
  }

  const info = await stat(absolute).catch(() => null);
  if (!info?.isFile()) throw new Error(`Arquivo não encontrado: ${absolute}`);
  if (info.size > MAX_SOURCE_BYTES) {
    throw new Error(`Arquivo tem ${Math.round(info.size / 1024 / 1024)}MB; o limite é 100MB.`);
  }

  return {
    content: new Uint8Array(await readFile(absolute)),
    fileName: basename(absolute),
    contentType: 'application/octet-stream',
  };
}

/**
 * Endereços que não devem ser alcançados a partir de uma URL escolhida por um
 * LLM: rede local, loopback e link-local. O MCP roda na máquina da pessoa, então
 * sem esta checagem uma URL sugerida pelo modelo viraria porta de entrada para a
 * rede interna dela.
 */
function isPrivateAddress(address: string): boolean {
  if (address === '::1' || address.startsWith('fc') || address.startsWith('fd')) return true;
  if (address.startsWith('fe80')) return true;

  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;

  const [a, b] = parts;
  if (a === 127 || a === 10 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

async function loadFromUrl(rawUrl: string): Promise<LoadedSource> {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:') {
    throw new Error('Só aceito URL https.');
  }

  const resolved = await lookup(url.hostname, { all: true });
  if (resolved.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error('Esta URL aponta para a rede interna e não será baixada.');
  }

  const response = await fetch(url, { redirect: 'error' });
  if (!response.ok) throw new Error(`Não consegui baixar (${response.status}).`);

  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_SOURCE_BYTES) {
    throw new Error(`O arquivo tem ${Math.round(declared / 1024 / 1024)}MB; o limite é 100MB.`);
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength > MAX_SOURCE_BYTES) {
    throw new Error('O arquivo baixado passou de 100MB.');
  }

  const fromPath = basename(decodeURIComponent(url.pathname));

  return {
    content: buffer,
    fileName: fromPath && fromPath !== '/' ? fromPath : 'arquivo',
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
  };
}

/**
 * Arquivo que veio anexado na conversa: o agente já tem os bytes, mas eles não
 * existem no disco desta máquina. Limite bem menor que os outros caminhos —
 * base64 ocupa contexto do modelo, e 5MB já são ~6,8MB de texto.
 */
export const MAX_INLINE_BYTES = 200 * 1024;

export function loadFromBase64(contentBase64: string, fileName: string): LoadedSource {
  const cleaned = contentBase64.replace(/^data:[^;]+;base64,/, '').trim();
  const content = new Uint8Array(Buffer.from(cleaned, 'base64'));

  if (content.byteLength === 0) {
    throw new Error('O conteúdo em base64 chegou vazio.');
  }
  if (content.byteLength > MAX_INLINE_BYTES) {
    throw new Error(
      `Conteúdo inline tem ${Math.round(content.byteLength / 1024)}KB; o limite é 200KB. ` +
        'Salve o arquivo no computador e passe o caminho em source — é instantâneo.',
    );
  }

  return { content, fileName, contentType: 'application/octet-stream' };
}

/** Caminho local ou URL https — o chat manda o que a pessoa tiver em mãos. */
export function loadSource(source: string): Promise<LoadedSource> {
  return /^https?:\/\//i.test(source) ? loadFromUrl(source) : loadFromDisk(source);
}
