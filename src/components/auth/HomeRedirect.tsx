import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Destino da raiz "/" e do login sem rota de origem: /dashboard, para todo mundo.
 * O admin tinha painel próprio até 21/10/2026; agora vê o mesmo que o time.
 * Aguarda o carregamento do perfil para não redirecionar antes de a sessão firmar.
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

  return <Navigate to="/dashboard" replace />;
};

export default HomeRedirect;
