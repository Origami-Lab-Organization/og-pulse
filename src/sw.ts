/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision?: string }> };

const PRIVATE_CACHE = 'pulse-private-v1';
const ALLOWED_TABLES = new Set([
  'activity_timesheets', 'activity_types', 'clients', 'company_holidays', 'employees',
  'personal_kanban_card_tags', 'personal_kanban_cards', 'personal_kanban_columns', 'personal_kanban_tags',
  'project_activity_cards', 'project_members', 'project_timesheets', 'projects',
  'reimbursement_attachments', 'reimbursement_items', 'reimbursement_requests', 'tenants', 'user_roles',
]);

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
self.skipWaiting();
clientsClaim();

function getRestTable(url: URL) {
  const marker = '/rest/v1/';
  const index = url.pathname.indexOf(marker);
  return index < 0 ? null : url.pathname.slice(index + marker.length).split('/')[0];
}

async function sessionFingerprint(request: Request) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.sub !== 'string') return null;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload.sub));
    return Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

const privateCachePlugin = {
  async cacheKeyWillBeUsed({ request }: { request: Request }) {
    const fingerprint = await sessionFingerprint(request);
    if (!fingerprint) return request;
    const url = new URL(request.url);
    url.searchParams.set('__pulse_session', fingerprint);
    return url.toString();
  },
  async cacheWillUpdate({ request, response }: { request: Request; response: Response }) {
    return response.status === 200 && await sessionFingerprint(request) ? response : null;
  },
};

registerRoute(
  ({ request, url }) => request.method === 'GET'
    && request.headers.has('authorization')
    && ALLOWED_TABLES.has(getRestTable(url) ?? ''),
  new NetworkFirst({
    cacheName: PRIVATE_CACHE,
    networkTimeoutSeconds: 4,
    plugins: [privateCachePlugin, new ExpirationPlugin({ maxAgeSeconds: 24 * 60 * 60, maxEntries: 250, purgeOnQuotaError: true })],
  }),
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_PRIVATE_CACHES') event.waitUntil(caches.delete(PRIVATE_CACHE));
});

