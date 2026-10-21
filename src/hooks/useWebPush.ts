import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { pushSubscriptionService } from '@/services/pushSubscriptionService';
import {
  VAPID_PUBLIC_KEY,
  getCurrentPushSubscription,
  isPushSupported,
  subscribeToPush,
} from '@/lib/webPush';
import type { PushStatus } from '@/types/webPush';

// A inscrição do navegador pode existir para outra pessoa (computador compartilhado): só conta
// como ligada se a linha do funcionário logado existir.
async function resolveStatus(employeeId: string | undefined): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) return 'unconfigured';
  if (Notification.permission === 'denied') return 'denied';
  const subscription = await getCurrentPushSubscription();
  if (!subscription || !employeeId) return 'disabled';
  const registered = await pushSubscriptionService.isRegistered(employeeId, subscription.endpoint);
  return registered ? 'enabled' : 'disabled';
}

export function useWebPush() {
  const { employee } = useAuth();
  const [status, setStatus] = useState<PushStatus>('loading');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await resolveStatus(employee?.id));
    } catch {
      setStatus('disabled');
    }
  }, [employee?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!employee) return;
    setBusy(true);
    try {
      const subscription = await subscribeToPush();
      if (subscription) {
        await pushSubscriptionService.save(subscription, employee.id, employee.tenant_id);
        toast.success('Notificações ativadas neste dispositivo.');
      }
    } catch {
      toast.error('Não foi possível ativar as notificações neste dispositivo.');
    } finally {
      await refresh();
      setBusy(false);
    }
  }, [employee, refresh]);

  // Remove só a linha deste funcionário. A inscrição do navegador continua valendo para quem
  // mais a tiver ativado aqui.
  const disable = useCallback(async () => {
    if (!employee) return;
    setBusy(true);
    try {
      const subscription = await getCurrentPushSubscription();
      if (subscription) await pushSubscriptionService.remove(employee.id, subscription.endpoint);
    } catch {
      toast.error('Não foi possível desativar as notificações.');
    } finally {
      await refresh();
      setBusy(false);
    }
  }, [employee, refresh]);

  return { status, busy, enable, disable };
}
