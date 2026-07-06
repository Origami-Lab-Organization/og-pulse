import { describe, expect, it } from 'vitest';
import { isPwaAllowedRoute, isPwaBusinessRoute, PWA_BUSINESS_ROUTES } from '@/lib/pwa';

describe('escopo de rotas da PWA', () => {
  it('expõe somente as três rotas de negócio aprovadas', () => {
    expect(PWA_BUSINESS_ROUTES).toEqual(['/my-timesheet', '/my-kanban', '/reimbursements']);
    PWA_BUSINESS_ROUTES.forEach((route) => expect(isPwaBusinessRoute(route)).toBe(true));
  });

  it('mantém rotas técnicas necessárias para autenticação', () => {
    expect(isPwaAllowedRoute('/login')).toBe(true);
    expect(isPwaAllowedRoute('/primeiro-acesso')).toBe(true);
    expect(isPwaAllowedRoute('/reset-password')).toBe(true);
  });

  it('bloqueia módulos fora do escopo standalone', () => {
    expect(isPwaAllowedRoute('/inbox')).toBe(false);
    expect(isPwaAllowedRoute('/portfolio')).toBe(false);
    expect(isPwaAllowedRoute('/admin')).toBe(false);
  });
});
