import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Destino da raiz "/" e do login sem rota de origem.
 * Admin → /dashboard. Demais usuários → /inbox.
 * Aguarda o carregamento do perfil para decidir com base no papel real.
 */
const HomeRedirect = () => {
  const { employee, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Navigate to={employee?.isAdmin ? '/dashboard' : '/inbox'} replace />;
};

export default HomeRedirect;
