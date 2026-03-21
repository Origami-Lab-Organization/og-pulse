import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RoleProtectedRouteProps {
  children: ReactNode;
  requireManager?: boolean;
  requireAdmin?: boolean;
}

const RoleProtectedRoute = ({ 
  children, 
  requireManager = false,
  requireAdmin = false,
}: RoleProtectedRouteProps) => {
  const { user, employee, loading } = useAuth();

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

  // Check if user needs admin access
  if (requireAdmin && !employee.isAdmin) {
    return <Navigate to="/inbox" replace />;
  }

  // Check if user has manager/admin access
  // is_gerente = true means the user is a manager or admin
  if (requireManager && !employee.is_gerente && !employee.isAdmin) {
    return <Navigate to="/inbox" replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
