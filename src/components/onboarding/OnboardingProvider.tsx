import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingStatus } from '@/hooks/useOnboarding';
import { OnboardingModal } from './OnboardingModal';

interface OnboardingContextValue {
  openOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  openOnboarding: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useOnboardingModal = () => useContext(OnboardingContext);

// FUNC-J2 — controla o modal de onboarding sobre a tela principal.
// Abre automaticamente uma vez quando o funcionário está pendente; também pode
// ser reaberto manualmente (menu do usuário / banner) via openOnboarding().
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { employee } = useAuth();
  const { data: status } = useOnboardingStatus();
  const [open, setOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (
      employee &&
      !employee.must_change_password &&
      status?.completed === false &&
      !autoOpenedRef.current
    ) {
      autoOpenedRef.current = true;
      setOpen(true);
    }
  }, [employee, status?.completed]);

  const openOnboarding = useCallback(() => setOpen(true), []);

  return (
    <OnboardingContext.Provider value={{ openOnboarding }}>
      {children}
      <OnboardingModal open={open} onOpenChange={setOpen} />
    </OnboardingContext.Provider>
  );
}
