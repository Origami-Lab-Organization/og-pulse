import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, isNavItemVisible, type NavVisibilityContext } from '@/components/layout/sidebar-nav';
import { hasAnyCapability } from '@/lib/access/capabilities';

/**
 * A intenção destes testes não mudou desde que foram escritos: o dashboard do admin é
 * só de quem administra, e o colaborador tem o dele. O que mudou é o mecanismo — papel
 * virou capacidade (PUL-201/PUL-206) — então a asserção passou a ser sobre a capacidade
 * exigida, e sobre o comportamento da navegação, não sobre o texto do código.
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
  it('a rota /admin-dashboard exige capacidade de administrar configuração', () => {
    const appSource = readFileSync('src/App.tsx', 'utf8');

    expect(appSource).toMatch(
      /path="\/admin-dashboard"[\s\S]{0,200}?<RoleProtectedRoute requireCapability="configuracao:editar">/,
    );
    // O mecanismo antigo não pode voltar por descuido: `requireAdmin` foi removido.
    expect(appSource).not.toContain('requireAdmin');
  });

  it('o Dashboard do admin aparece para quem administra, e não para o colaborador', () => {
    expect(urls(ADMIN)).toContain('/admin-dashboard');
    expect(urls(COLABORADOR)).not.toContain('/admin-dashboard');
  });

  it('o colaborador tem o dashboard dele, e o admin não vê os dois', () => {
    expect(urls(COLABORADOR)).toContain('/dashboard');
    expect(urls(ADMIN)).not.toContain('/dashboard');
  });

  it('nenhum item de dashboard fica sem porteiro', () => {
    const semGuarda = NAV_ITEMS.filter(
      (item) =>
        (item.url === '/dashboard' || item.url === '/admin-dashboard') &&
        item.kind === 'link' &&
        !item.requiresCapability &&
        !item.hiddenWhenCan,
    );
    expect(semGuarda).toEqual([]);
  });
});
