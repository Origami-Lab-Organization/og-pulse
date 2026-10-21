import { supabase } from '@/integrations/supabase/client';

// Inscrições Web Push do funcionário (ADR-0050). Quem lê para enviar é só a Edge Function
// notify-personal-kanban-reminders; o navegador grava e apaga a própria linha.
export const pushSubscriptionService = {
  async isRegistered(employeeId: string, endpoint: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .eq('endpoint', endpoint);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async save(subscription: PushSubscription, employeeId: string, tenantId: string): Promise<void> {
    const { endpoint, keys } = subscription.toJSON();
    // harness-ok: erro do navegador no front, sem HTTP; vira toast no hook.
    if (!endpoint || !keys?.p256dh || !keys?.auth) throw new Error('Inscrição de push incompleta');
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        employee_id: employeeId,
        tenant_id: tenantId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: navigator.userAgent.slice(0, 300),
      },
      { onConflict: 'employee_id,endpoint' },
    );
    if (error) throw error;
  },

  async remove(employeeId: string, endpoint: string): Promise<void> {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('employee_id', employeeId)
      .eq('endpoint', endpoint);
    if (error) throw error;
  },
};
