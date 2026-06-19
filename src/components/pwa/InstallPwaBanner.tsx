import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePwaEnvironment } from '@/hooks/use-pwa-environment';
import { isPwaBusinessRoute } from '@/lib/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pulse-pwa-install-dismissed-at';
const SHOWN_KEY = 'pulse-pwa-install-shown';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function InstallPwaBanner() {
  const location = useLocation();
  const { isMobile, isStandalone } = usePwaEnvironment();
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    const eligible = isMobile && !isStandalone && isPwaBusinessRoute(location.pathname)
      && Date.now() - dismissedAt >= SEVEN_DAYS
      && sessionStorage.getItem(SHOWN_KEY) !== 'true';
    if (!eligible) return;
    if (isIos) {
      sessionStorage.setItem(SHOWN_KEY, 'true');
      setVisible(true);
    }
  }, [isIos, isMobile, isStandalone, location.pathname]);

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
      if (Date.now() - dismissedAt < SEVEN_DAYS || sessionStorage.getItem(SHOWN_KEY) === 'true') return;
      setPrompt(event as BeforeInstallPromptEvent);
      sessionStorage.setItem(SHOWN_KEY, 'true');
      setVisible(true);
    };
    const installed = () => setVisible(false);
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  if (!visible || !isMobile || isStandalone || !isPwaBusinessRoute(location.pathname)) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };
  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'dismissed') localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <aside className="mx-4 mt-4 flex items-start gap-3 rounded-xl border bg-card p-3 shadow-sm sm:mx-6" aria-label="Instalar Pulse">
      <div className="rounded-full bg-primary/10 p-2 text-primary">{isIos ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}</div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">Use o Pulse como app</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {isIos ? 'Toque em Compartilhar e depois em “Adicionar à Tela de Início”.' : 'Instale para acessar rapidamente pelo celular.'}
        </p>
        {!isIos && prompt && <Button size="sm" className="mt-3 min-h-10" onClick={install}>Instalar</Button>}
      </div>
      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={dismiss} aria-label="Dispensar instalação"><X className="h-4 w-4" /></Button>
    </aside>
  );
}

