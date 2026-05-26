import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Strategy navigation access', () => {
  it('protects the strategy route with manager access instead of admin-only access', () => {
    const appSource = readFileSync('src/App.tsx', 'utf8');

    expect(appSource).toContain('path="/estrategia" element={<RoleProtectedRoute requireManager><Strategy /></RoleProtectedRoute>}');
    expect(appSource).not.toContain('path="/estrategia" element={<RoleProtectedRoute requireAdmin><Strategy /></RoleProtectedRoute>}');
  });

  it('shows the strategy sidebar item to managers', () => {
    const sidebarSource = readFileSync('src/components/layout/AppSidebar.tsx', 'utf8');

    expect(sidebarSource).toContain("{ title: 'Estratégia', url: '/estrategia', icon: Target, requiresManager: true }");
    expect(sidebarSource).not.toContain("{ title: 'Estratégia', url: '/estrategia', icon: Target, requiresAdmin: true }");
  });
});
