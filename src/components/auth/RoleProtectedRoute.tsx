import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import type { CapabilityRequirement } from '@/lib/access/capabilities';

interface RoleProtectedRouteProps {
  children: ReactNode;
  /**
   * Capacidade que governa a rota (ou lista em que qualquer uma basta). Decide só o que a
   * pessoa VÊ — a policy de RLS decide o que ela acessa (ADR-0027).
   */
  requireCapability?: CapabilityRequirement;
  /**
   * Resíduo do modelo por papel: só `/admin` e `/admin-dashboard` ainda usam, porque
   * "configurar o tenant" não tem capacidade no vocabulário (TD-0019, `configuracao:editar`).
   * Não usar em rota nova — rota nova nasce com `requireCapability`.
   */
  requireAdmin?: boolean;
}

const RoleProtectedRoute = ({
  children,
  requireCapability,
  requireAdmin = false,
}: RoleProtectedRouteProps) => {
  const { user, employee, loading, can } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !employee) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !employee.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireCapability && !can(requireCapability)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
