// SW de push com escopo próprio: registrá-lo no desktop não liga o cache offline do sw.ts (ADR-0050).

const PUSH_SW_URL = '/push-sw.js';
const PUSH_SW_SCOPE = '/push/';

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

/** Registro do SW de push, se existir. Não confundir com o do cache offline (escopo /). */
export async function findPushRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  return registrations.find((registration) => new URL(registration.scope).pathname === PUSH_SW_SCOPE);
}

// `serviceWorker.ready` espera o SW que controla a página; nenhuma página fica no escopo /push/.
function waitUntilActive(registration: ServiceWorkerRegistration): Promise<void> {
  const worker = registration.installing ?? registration.waiting;
  if (registration.active || !worker) return Promise.resolve();
  return new Promise((resolve) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') resolve();
    });
  });
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const registration = await findPushRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/** Registra o SW de push e inscreve este navegador. Pede permissão antes. */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) return null;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  const registration = await navigator.serviceWorker.register(PUSH_SW_URL, { scope: PUSH_SW_SCOPE });
  await waitUntilActive(registration);
  const existing = await registration.pushManager.getSubscription();
  return (
    existing ??
    registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  );
}
