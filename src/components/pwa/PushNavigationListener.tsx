import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// O clique numa notificação push com o Pulse já aberto chega aqui (public/push-sw.js): o SW de
// push não controla a página, então não pode navegá-la — pede para o app navegar.
export function PushNavigationListener() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleMessage = (event: MessageEvent) => {
      const url = event.data?.type === 'PULSE_NAVIGATE' ? event.data.url : null;
      if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) navigate(url);
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [navigate]);

  return null;
}
