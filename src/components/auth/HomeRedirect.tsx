import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Destino da raiz "/" e do login sem rota de origem.
 * Admin → /admin-dashboard. Demais usuários → /inbox.
 * Aguarda o carregamento do perfil para decidir com base no papel real.
 */
const HomeRedirect = () => {
  const { user, employee, loading } = useAuth();

  // Aguarda loading E o perfil do employee quando há sessão ativa.
  // Sem essa segunda guarda, loading=false (resolvido pelo getSession inicial)
  // chega antes do fetchEmployeeData do onAuthStateChange, fazendo employee
  // ser null e o admin ser redirecionado para /inbox erroneamente.
  if (loading || (user && !employee)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const redirectPath = employee?.isAdmin
    ? '/admin-dashboard'
    : '/dashboard';

  return <Navigate to={redirectPath} replace />;
};

export default HomeRedirect;
