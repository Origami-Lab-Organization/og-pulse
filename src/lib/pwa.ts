export const PWA_BUSINESS_ROUTES = ['/my-timesheet', '/my-kanban'] as const;

export const PWA_SYSTEM_ROUTES = [
  '/login',
  '/primeiro-acesso',
  '/change-password',
  '/esqueci-minha-senha',
  '/reset-password',
  '/termos',
  '/privacidade',
] as const;

export function isPwaBusinessRoute(pathname: string) {
  return PWA_BUSINESS_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
export function isPwaAllowedRoute(pathname: string) {
  return isPwaBusinessRoute(pathname) || PWA_SYSTEM_ROUTES.includes(pathname as never);
}

export async function clearPrivatePwaCaches() {
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return;
  controller.postMessage({ type: 'CLEAR_PRIVATE_CACHES' });
}
