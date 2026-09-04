import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RoleProtectedRoute from '@/components/auth/RoleProtectedRoute';
import { hasAnyCapability, type CapabilityRequirement } from '@/lib/access/capabilities';

type FakeEmployee = { id: string; isAdmin: boolean; capabilities: string[] };
const auth: { user: unknown; employee: FakeEmployee | null; loading: boolean } = {
  user: { id: 'u1' },
  employee: { id: 'e1', isAdmin: false, capabilities: [] },
  loading: false,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    ...auth,
    can: (required: CapabilityRequirement) => hasAnyCapability(auth.employee?.capabilities ?? [], required),
  }),
}));

function renderAt(element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/secreta']}>
      <Routes>
        <Route path="/secreta" element={element} />
        <Route path="/dashboard" element={<div>dashboard</div>} />
        <Route path="/login" element={<div>login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RoleProtectedRoute por capacidade', () => {
  beforeEach(() => {
    auth.user = { id: 'u1' };
    auth.employee = { id: 'e1', isAdmin: false, capabilities: [] };
    auth.loading = false;
  });

  it('sem a capacidade, volta para o dashboard', () => {
    renderAt(<RoleProtectedRoute requireCapability="financeiro:ler"><div>conteúdo</div></RoleProtectedRoute>);
    expect(screen.getByText('dashboard')).toBeInTheDocument();
    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument();
  });

  it('com a capacidade, renderiza', () => {
    auth.employee!.capabilities = ['financeiro:ler'];
    renderAt(<RoleProtectedRoute requireCapability="financeiro:ler"><div>conteúdo</div></RoleProtectedRoute>);
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('lista: qualquer uma basta', () => {
    auth.employee!.capabilities = ['pipeline:ler'];
    renderAt(<RoleProtectedRoute requireCapability={['financeiro:ler', 'pipeline:ler']}><div>conteúdo</div></RoleProtectedRoute>);
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('sem exigência, basta estar autenticado', () => {
    renderAt(<RoleProtectedRoute><div>conteúdo</div></RoleProtectedRoute>);
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('requireAdmin residual continua a valer para /admin', () => {
    const { unmount } = renderAt(<RoleProtectedRoute requireAdmin><div>conteúdo</div></RoleProtectedRoute>);
    expect(screen.getByText('dashboard')).toBeInTheDocument();
    unmount();
    auth.employee!.isAdmin = true;
    renderAt(<RoleProtectedRoute requireAdmin><div>conteúdo</div></RoleProtectedRoute>);
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('sem sessão vai para o login, mesmo com capacidade', () => {
    auth.user = null;
    auth.employee = null;
    renderAt(<RoleProtectedRoute requireCapability="financeiro:ler"><div>conteúdo</div></RoleProtectedRoute>);
    expect(screen.getByText('login')).toBeInTheDocument();
  });
});
