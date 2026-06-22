import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Dashboard navigation access', () => {
  it('protects the admin-dashboard route with admin-only access', () => {
    const appSource = readFileSync('src/App.tsx', 'utf8');

    expect(appSource).toMatch(/path="\/admin-dashboard"[\s\S]*?<RoleProtectedRoute requireAdmin>/);
  });

  it('requires admin to show the dashboard item in the active navbar', () => {
    const navbarSource = readFileSync('src/components/layout/AppNavbar.tsx', 'utf8');

    // The "Dashboard" item must be gated by requiresAdmin so collaborators don't see it.
    expect(navbarSource).toMatch(
      /title:\s*"Dashboard",\s*url:\s*"\/admin-dashboard",\s*icon:\s*LayoutDashboard,\s*requiresAdmin:\s*true,/,
    );
  });

  it('does not expose an unguarded dashboard item in the sidebar', () => {
    const sidebarSource = readFileSync('src/components/layout/AppSidebar.tsx', 'utf8');

    expect(sidebarSource).not.toContain(
      "{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },",
    );
  });
});
