import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import type { TenantPlan } from '@/types/tenantPlan';

interface ProtectedRouteProps {
  children: ReactNode;
}

const LOGIN_PATH = '/login';
const CONFIRM_EMAIL_PATH = '/confirme-seu-email';
const FIRST_ACCESS_PATH = '/primeiro-acesso';
const TRIAL_OVER_PATH = '/teste-encerrado';

interface GateInput {
  user: User | null;
  mustChangePassword: boolean;
  tenantPlan: TenantPlan | null;
}

/**
 * Para onde a pessoa deve ir antes de ver a rota pedida, em ordem de prioridade:
 * sem sessão → login; e-mail não confirmado → confirmação (PUL-227); convite pendente →
 * primeiro acesso (FUNC-J1); teste expirado → tela de teste encerrado (PUL-228, camada de
 * tela; a API é história própria). `null` quando pode seguir.
 */
function resolveGate(input: GateInput): string | null {
  if (!input.user) return LOGIN_PATH;
  if (!input.user.email_confirmed_at) return CONFIRM_EMAIL_PATH;
  if (input.mustChangePassword) return FIRST_ACCESS_PATH;
  if (input.tenantPlan?.expired) return TRIAL_OVER_PATH;
  return null;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, employee, loading, tenantPlan } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const gate = resolveGate({ user, mustChangePassword: Boolean(employee?.must_change_password), tenantPlan });
  if (gate && gate !== location.pathname) {
    return <Navigate to={gate} state={gate === LOGIN_PATH ? { from: location } : undefined} replace />;
  }

  // Onboarding (FUNC-J2): tratado como modal sobre a tela principal
  // (ver OnboardingProvider) — não há mais redirect de rota aqui.

  return <>{children}</>;
};

export default ProtectedRoute;
