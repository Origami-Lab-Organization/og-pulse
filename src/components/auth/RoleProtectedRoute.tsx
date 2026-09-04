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
}

const RoleProtectedRoute = ({ children, requireCapability }: RoleProtectedRouteProps) => {
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

  if (requireCapability && !can(requireCapability)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
