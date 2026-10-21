import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, isNavItemVisible, type NavVisibilityContext } from '@/components/layout/sidebar-nav';
import { hasAnyCapability } from '@/lib/access/capabilities';

/**
 * Desde 21/10/2026 não existe dashboard de admin: todo mundo cai no mesmo /dashboard. O
 * endereço antigo continua respondendo, mas só redireciona — favorito salvo não quebra.
 */
const ctx = (capabilities: string[]): NavVisibilityContext => ({
  can: (required) => hasAnyCapability(capabilities, required),
  isDev: false,
});

const ADMIN = ctx(['configuracao:editar']);
const COLABORADOR = ctx(['timesheet-proprio:apontar']);

const urls = (c: NavVisibilityContext) =>
  NAV_ITEMS.filter((item) => isNavItemVisible(item, c)).map((item) => item.url);

describe('Dashboard navigation access', () => {
  it('o endereço antigo do dashboard do admin só redireciona para /dashboard', () => {
    const appSource = readFileSync('src/App.tsx', 'utf8');

    expect(appSource).toMatch(
      /path="\/admin-dashboard"\s+element=\{<Navigate to="\/dashboard" replace \/>\}/,
    );
    // O mecanismo antigo não pode voltar por descuido: `requireAdmin` foi removido.
    expect(appSource).not.toContain('requireAdmin');
  });

  it('admin e colaborador veem o mesmo dashboard', () => {
    expect(urls(ADMIN)).toContain('/dashboard');
    expect(urls(COLABORADOR)).toContain('/dashboard');
    expect(urls(ADMIN)).not.toContain('/admin-dashboard');
  });
});
