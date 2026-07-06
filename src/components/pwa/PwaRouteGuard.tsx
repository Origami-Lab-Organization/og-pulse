import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { usePwaEnvironment } from '@/hooks/use-pwa-environment';
import { isPwaAllowedRoute } from '@/lib/pwa';

export function PwaRouteGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isStandalone } = usePwaEnvironment();
  const blocked = isStandalone && !isPwaAllowedRoute(location.pathname);

  useEffect(() => {
    if (blocked) toast.info('Esta funcionalidade está disponível apenas no navegador.');
  }, [blocked]);

  if (blocked) return <Navigate to="/my-timesheet" replace />;
  return <>{children}</>;
}
