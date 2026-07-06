import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';
const STANDALONE_QUERY = '(display-mode: standalone)';

function getStandalone() {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia(STANDALONE_QUERY).matches || iosStandalone === true;
}
export function usePwaEnvironment() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const [isStandalone, setIsStandalone] = useState(getStandalone);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_QUERY);
    const standalone = window.matchMedia(STANDALONE_QUERY);
    const sync = () => {
      setIsMobile(mobile.matches);
      setIsStandalone(getStandalone());
      setIsOnline(navigator.onLine);
    };
    mobile.addEventListener('change', sync);
    standalone.addEventListener('change', sync);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      mobile.removeEventListener('change', sync);
      standalone.removeEventListener('change', sync);
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return { isMobile, isStandalone, isOnline };
}
