import { useEffect, useState, useSyncExternalStore } from 'react';
import { assinarConectividade, estaOnline } from '@/lib/conectividade';

const MOBILE_QUERY = '(max-width: 767px)';
const STANDALONE_QUERY = '(display-mode: standalone)';

function getStandalone() {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia(STANDALONE_QUERY).matches || iosStandalone === true;
}
export function usePwaEnvironment() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const [isStandalone, setIsStandalone] = useState(getStandalone);
  // Online conferido (src/lib/conectividade.ts), não o `navigator.onLine` cru, que dá offline falso.
  const isOnline = useSyncExternalStore(assinarConectividade, estaOnline);

  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_QUERY);
    const standalone = window.matchMedia(STANDALONE_QUERY);
    const sync = () => {
      setIsMobile(mobile.matches);
      setIsStandalone(getStandalone());
    };
    mobile.addEventListener('change', sync);
    standalone.addEventListener('change', sync);
    return () => {
      mobile.removeEventListener('change', sync);
      standalone.removeEventListener('change', sync);
    };
  }, []);

  return { isMobile, isStandalone, isOnline };
}
