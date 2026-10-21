import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Notificação nova para quem está logado atualiza o sino na hora, sem esperar o próximo
 * ciclo de 30 s do contador. Um canal por pessoa; sai junto com o cabeçalho.
 */
export function useNotificationsRealtime(): void {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const employeeId = employee?.id;

  useEffect(() => {
    if (!employeeId) return;
    const channel = supabase
      .channel(`notifications-bell-${employeeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${employeeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
          queryClient.invalidateQueries({ queryKey: ['inbox-notifications'] });
          queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, queryClient]);
}
