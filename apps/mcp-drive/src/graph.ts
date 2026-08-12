import { acquireToken } from './auth.js';
import type { DriveChild } from './types.js';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

/** Acima disso o Graph recusa PUT direto e exige sessão de upload. */
const SIMPLE_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

function itemsBase(driveId: string): string {
  return `/drives/${driveId}/items`;
}

function encodeSegment(name: string): string {
  return encodeURIComponent(name.trim()).replace(/'/g, '%27');
}

async function graphFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await acquireToken();
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    // Só código e status: o corpo pode conter dados do usuário.
    const detail = await response
      .json()
      .then((body: { error?: { code?: string } }) => body.error?.code ?? String(response.status))
      .catch(() => String(response.status));
    throw new Error(`Graph respondeu ${response.status} (${detail})`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

interface GraphItem {
  id: string;
  name: string;
  folder?: { childCount?: number };
  size?: number;
  lastModifiedDateTime?: string;
  remoteItem?: GraphItem;
}

function toChild(item: GraphItem): DriveChild {
  const target = item.remoteItem ?? item;
  return {
    id: target.id,
    name: item.name || target.name,
    isFolder: item.folder !== undefined || item.remoteItem?.folder !== undefined,
    size: target.size ?? 0,
    lastModifiedAt: target.lastModifiedDateTime ?? null,
  };
}

/** Teto de páginas: pasta absurdamente grande não pode travar a conversa. */
const MAX_PAGES = 10;

export async function listChildren(driveId: string, itemId: string): Promise<DriveChild[]> {
  const items: GraphItem[] = [];
  let next: string | undefined =
    `${itemsBase(driveId)}/${itemId}/children?$select=id,name,folder,size,lastModifiedDateTime,remoteItem&$top=200`;
  let pages = 0;

  // Sem seguir nextLink, uma subpasta além do item 200 simplesmente "não
  // existe" para o resolvedor de caminho — e o arquivo acaba na raiz.
  while (next && pages < MAX_PAGES) {
    const data: { value: GraphItem[]; '@odata.nextLink'?: string } = await graphFetch(next);
    items.push(...(data.value ?? []));
    const link = data['@odata.nextLink'];
    next = link ? link.replace(GRAPH_BASE, '') : undefined;
    pages += 1;
  }

  return items.map(toChild).sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

/**
 * Resolve "3.Execução/Sprints" a partir da raiz do projeto, comparando nome sem
 * diferenciar maiúscula/acento — quem fala no chat não digita o nome exato.
 */
export async function resolveFolderPath(
  driveId: string,
  rootItemId: string,
  path: string | undefined,
): Promise<{ id: string; trail: string[] }> {
  const segments = (path ?? '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  let currentId = rootItemId;
  const trail: string[] = [];

  for (const segment of segments) {
    const children = await listChildren(driveId, currentId);
    const match = children.find(
      (child) => child.isFolder && normalize(child.name) === normalize(segment),
    );

    if (!match) {
      const options = children.filter((c) => c.isFolder).map((c) => c.name);
      throw new Error(
        `Pasta "${segment}" não encontrada em ${trail.join('/') || 'raiz'}. Disponíveis: ${
          options.length > 0 ? options.join(', ') : 'nenhuma'
        }`,
      );
    }

    currentId = match.id;
    trail.push(match.name);
  }

  return { id: currentId, trail };
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Como `resolveFolderPath`, mas cria o que faltar no caminho. Usado quando a
 * pessoa pede "sobe na pasta X" e X ainda não existe — evita o vaivém de criar
 * pasta numa chamada e subir em outra, onde o destino se perde.
 */
export async function ensureFolderPath(
  driveId: string,
  rootItemId: string,
  path: string | undefined,
): Promise<{ id: string; trail: string[] }> {
  const segments = (path ?? '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  let currentId = rootItemId;
  const trail: string[] = [];

  for (const segment of segments) {
    const children = await listChildren(driveId, currentId);
    const match = children.find(
      (child) => child.isFolder && normalize(child.name) === normalize(segment),
    );

    const folder = match ?? (await createFolder(driveId, currentId, segment));
    currentId = folder.id;
    trail.push(folder.name);
  }

  return { id: currentId, trail };
}

export async function createFolder(
  driveId: string,
  parentId: string,
  name: string,
): Promise<DriveChild> {
  const item = await graphFetch<GraphItem>(`${itemsBase(driveId)}/${parentId}/children`, {
    method: 'POST',
    body: JSON.stringify({
      name: name.trim(),
      folder: {},
      // Falhar é melhor que virar "Contratos 1" sem ninguém perceber.
      '@microsoft.graph.conflictBehavior': 'fail',
    }),
  });

  return toChild(item);
}

export async function uploadFile(
  driveId: string,
  parentId: string,
  fileName: string,
  content: Uint8Array,
  contentType: string,
): Promise<DriveChild> {
  const target = `${itemsBase(driveId)}/${parentId}:/${encodeSegment(fileName)}`;
  const token = await acquireToken();

  if (content.byteLength <= SIMPLE_UPLOAD_MAX_BYTES) {
    return putBytes(`${GRAPH_BASE}${target}:/content`, content, contentType, {
      Authorization: `Bearer ${token}`,
    });
  }

  const session = await graphFetch<{ uploadUrl: string }>(`${target}:/createUploadSession`, {
    method: 'POST',
    body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'rename' } }),
  });

  // A uploadUrl já vem pré-autorizada: mandar o Authorization junto faz o Graph recusar.
  return putBytes(session.uploadUrl, content, contentType, {
    'Content-Range': `bytes 0-${content.byteLength - 1}/${content.byteLength}`,
  });
}

async function putBytes(
  url: string,
  content: Uint8Array,
  contentType: string,
  headers: Record<string, string>,
): Promise<DriveChild> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, ...headers },
    // `fetch` não aceita Uint8Array no tipo; a view vira ArrayBuffer próprio.
    body: content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer,
  });

  if (!response.ok) {
    throw new Error(`Upload falhou (${response.status})`);
  }

  return toChild((await response.json()) as GraphItem);
}
