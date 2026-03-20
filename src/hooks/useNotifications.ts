import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  tenant_id: string;
  recipient_id: string;
  type: string;
  category: string;
  priority: string;
  action_type: string | null;
  action_url: string | null;
  metadata: Record<string, any> | null;
  title: string;
  message: string | null;
  reference_id: string | null;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
}

export function useNotifications() {
  const { employee } = useAuth();

  return useQuery({
    queryKey: ['notifications', employee?.id],
    queryFn: async () => {
      if (!employee) return [];
      const { data, error } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('recipient_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as Notification[];
    },
    enabled: !!employee,
    refetchInterval: 30000,
  });
}

export function useUnreadNotificationsCount() {
  const { employee } = useAuth();

  return useQuery({
    queryKey: ['unread-notifications-count', employee?.id],
    queryFn: async () => {
      if (!employee) return 0;
      const { count, error } = await supabase
        .from('notifications' as any)
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', employee.id)
        .eq('is_read', false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!employee,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ is_read: true } as any)
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });
}

export function useMarkNotificationResolved() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ is_read: true, is_resolved: true } as any)
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!employee) return;
      const { error } = await supabase
        .from('notifications' as any)
        .update({ is_read: true } as any)
        .eq('recipient_id', employee.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });
}
