import { WifiOff } from 'lucide-react';
import { usePwaEnvironment } from '@/hooks/use-pwa-environment';

export function OfflineBanner() {
  const { isOnline } = usePwaEnvironment();
  if (isOnline) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 border-b bg-warning/10 px-4 py-2 text-sm text-foreground">
      <WifiOff className="h-4 w-4 text-warning" />
      Você está offline. Exibindo os últimos dados disponíveis.
    </div>
  );
}
