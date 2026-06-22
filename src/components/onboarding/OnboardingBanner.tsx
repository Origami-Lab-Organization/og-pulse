import { useState } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { ONBOARDING_SKIPPED_AT_KEY } from './onboarding.constants';
import { useOnboardingModal } from './OnboardingProvider';

// FUNC-J2 — Banner não-intrusivo para quem PULOU o onboarding.
// Aparece por até 7 dias após pular; "Não mostrar mais" o remove de vez.
// Estado é preferência de UI → guardado em localStorage (não é dado crítico).
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DISMISSED_KEY = 'og_onboarding_banner_dismissed';

function shouldShow(): boolean {
  try {
    if (localStorage.getItem(DISMISSED_KEY) === '1') return false;
    const skippedAt = Number(localStorage.getItem(ONBOARDING_SKIPPED_AT_KEY));
    if (!skippedAt) return false;
    return Date.now() - skippedAt < SEVEN_DAYS_MS;
  } catch {
    return false;
  }
}

export function OnboardingBanner() {
  const { openOnboarding } = useOnboardingModal();
  const [visible, setVisible] = useState(shouldShow);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/30 bg-accent px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Quer conhecer o sistema em 3 passos rápidos?</p>
        <p className="text-xs text-muted-foreground">Leva menos de 5 minutos e mostra o essencial do Meu Espaço.</p>
      </div>
      <button
        type="button"
        onClick={() => openOnboarding()}
        className="hidden shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
      >
        Conhecer
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Não mostrar mais"
        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
