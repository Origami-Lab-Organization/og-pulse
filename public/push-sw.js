// Só push (ADR-0050). Escopo /push/ para não disputar "/" com src/sw.ts, o cache offline que só o
// celular registra (ADR-0004/0043): o push funciona no desktop sem ligar esse cache.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Origami Pulse', {
      body: data.body || '',
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/my-kanban' },
    }),
  );
});

// A janela aberta não é controlada por este worker (escopo /push/), então não dá para chamar
// client.navigate(): o app recebe a mensagem e navega pelo router.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/my-kanban', self.location.origin);
  const path = url.pathname + url.search;
  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const janela = janelas.find((client) => new URL(client.url).origin === url.origin);
    if (janela) {
      await janela.focus();
      janela.postMessage({ type: 'PULSE_NAVIGATE', url: path });
      return;
    }
    await self.clients.openWindow(url.href);
  })());
});
