import { afterEach, describe, expect, it, vi } from 'vitest';
import { folderKey, showsRecipients } from '@/components/email/mailFolders';
import { listFolderPage, listMailFolders, searchFolderPage } from '@/services/microsoftGraphService';
import { WELL_KNOWN_FOLDER } from '@/types/microsoftGraph';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

/** Responde pelo caminho da URL, já que pastas e aliases são pedidos em paralelo. */
function mockGraphByPath(routes: Record<string, () => Response>) {
  const fetchMock = vi.fn(async (url: string) => {
    const path = new URL(url).pathname.replace('/v1.0', '');
    const route = routes[path];
    if (!route) throw new Error(`rota não mockada: ${path}`);
    return route();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('listMailFolders', () => {
  it('põe as pastas padrão na ordem do Outlook e as da pessoa depois, em ordem alfabética', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockGraphByPath({
      '/me/mailFolders': () =>
        json({
          value: [
            { id: 'f-obs', displayName: 'Observações', unreadItemCount: 0 },
            { id: 'f-sent', displayName: 'Itens Enviados', unreadItemCount: 0 },
            { id: 'f-arq', displayName: 'Arquivo Morto', unreadItemCount: 0 },
            { id: 'f-inbox', displayName: 'Caixa de Entrada', unreadItemCount: 184 },
            { id: 'f-hist', displayName: 'Histórico de Conversa', unreadItemCount: null },
          ],
        }),
      '/me/mailFolders/inbox': () => json({ id: 'f-inbox' }),
      '/me/mailFolders/drafts': () => json({ id: 'f-drafts-ausente' }),
      '/me/mailFolders/sentitems': () => json({ id: 'f-sent' }),
      '/me/mailFolders/deleteditems': () => json({ id: 'f-del-ausente' }),
      '/me/mailFolders/junkemail': () => json({ id: 'f-junk-ausente' }),
      // Caixa sem Arquivo Morto: 404 não derruba a lista.
      '/me/mailFolders/archive': () => json({ error: { code: 'ErrorItemNotFound' } }, 404),
    });

    const folders = await listMailFolders('token');

    expect(folders.map((folder) => folder.name)).toEqual([
      'Caixa de Entrada',
      'Itens Enviados',
      'Arquivo Morto',
      'Histórico de Conversa',
      'Observações',
    ]);
    expect(folders[0]).toEqual({
      id: 'f-inbox',
      name: 'Caixa de Entrada',
      wellKnown: WELL_KNOWN_FOLDER.INBOX,
      unreadCount: 184,
    });
    // Sem alias resolvido, "Arquivo Morto" é tratada como pasta comum.
    expect(folders[2].wellKnown).toBeNull();
    expect(folders[3].unreadCount).toBe(0);
  });

  it('erro que não é 404 na pasta padrão é propagado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockGraphByPath({
      '/me/mailFolders': () => json({ value: [] }),
      '/me/mailFolders/inbox': () => json({ error: { code: 'ErrorAccessDenied' } }, 403),
      '/me/mailFolders/drafts': () => json({ id: 'a' }),
      '/me/mailFolders/sentitems': () => json({ id: 'b' }),
      '/me/mailFolders/deleteditems': () => json({ id: 'c' }),
      '/me/mailFolders/junkemail': () => json({ id: 'd' }),
      '/me/mailFolders/archive': () => json({ id: 'e' }),
    });

    await expect(listMailFolders('token')).rejects.toThrow();
  });
});

describe('mensagens de uma pasta', () => {
  it('lista a pasta pedida e traz os destinatários', async () => {
    const fetchMock = mockGraphByPath({
      '/me/mailFolders/sentitems/messages': () =>
        json({
          value: [
            {
              id: 'm1',
              subject: 'Proposta',
              bodyPreview: '',
              receivedDateTime: '2026-10-20T14:31:00Z',
              isRead: true,
              webLink: null,
              from: { emailAddress: { name: 'Lucas', address: 'lucas@origamilab.com.br' } },
              toRecipients: [
                { emailAddress: { name: 'Aline Ferreira', address: 'aline@origamilab.com.br' } },
                { emailAddress: { name: null, address: 'cliente@empresa.com' } },
              ],
              inferenceClassification: 'focused',
            },
          ],
        }),
    });

    const page = await listFolderPage('token', WELL_KNOWN_FOLDER.SENT, { top: 25 });

    expect(page.messages[0].to).toEqual(['Aline Ferreira', 'cliente@empresa.com']);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('$select')).toContain('toRecipients');
    expect(url.searchParams.get('$orderby')).toBe('receivedDateTime desc');
  });

  it('a busca fica dentro da pasta aberta', async () => {
    const fetchMock = mockGraphByPath({
      '/me/mailFolders/f-obs/messages': () => json({ value: [] }),
    });

    await searchFolderPage('token', 'f-obs', 'nota "fiscal"', { top: 25 });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('$search')).toBe('"nota  fiscal"');
  });
});

describe('navegação de pastas', () => {
  it('pasta padrão usa o alias como chave; pasta da pessoa usa o id', () => {
    expect(folderKey({ id: 'f-inbox', name: 'Caixa de Entrada', wellKnown: 'inbox', unreadCount: 0 })).toBe('inbox');
    expect(folderKey({ id: 'f-obs', name: 'Observações', wellKnown: null, unreadCount: 0 })).toBe('f-obs');
  });

  it('Enviados e Rascunhos mostram o destinatário', () => {
    expect(showsRecipients(WELL_KNOWN_FOLDER.SENT)).toBe(true);
    expect(showsRecipients(WELL_KNOWN_FOLDER.DRAFTS)).toBe(true);
    expect(showsRecipients(WELL_KNOWN_FOLDER.INBOX)).toBe(false);
  });
});
