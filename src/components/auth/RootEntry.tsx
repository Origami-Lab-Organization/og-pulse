import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import HomeRedirect from '@/components/auth/HomeRedirect';
import LandingPage from '@/pages/LandingPage';

/**
 * O Supabase guarda a sessão em `localStorage` sob `sb-<ref>-auth-token`.
 * Se existe, vale esperar o auth resolver em vez de mostrar a landing e depois
 * trocar de tela; se não existe, a pessoa é visitante e a landing aparece já.
 */
function hasStoredSession(): boolean {
  try {
    return Object.keys(localStorage).some((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
  } catch {
    return false;
  }
}

/**
 * Raiz do site (`/`): visitante vê a landing pública; quem tem sessão segue o
 * HomeRedirect para a home do seu perfil. A landing também chega pré-renderizada
 * no HTML (ver `scripts/prerender-landing.mjs`), então o visitante não vê spinner.
 */
const RootEntry = () => {
  const { user, loading } = useAuth();

  if (user) return <HomeRedirect />;

  if (loading && hasStoredSession()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Carregando" />
      </div>
    );
  }

  return <LandingPage />;
};

export default RootEntry;
