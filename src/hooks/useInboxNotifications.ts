import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from './useNotifications';

interface InboxFilters {
  category?: 'timesheet' | 'reimbursement' | 'all';
  status?: 'unread' | 'action' | 'all';
}

export function useInboxNotifications(filters: InboxFilters = {}) {
  const { employee } = useAuth();
  const { category = 'all', status = 'all' } = filters;

  return useQuery({
    queryKey: ['inbox-notifications', employee?.id, category, status],
    queryFn: async () => {
      if (!employee) return [];
      let query = (supabase as any)
        .from('notifications')
        .select('*')
        .eq('recipient_id', employee.id);

      if (category !== 'all') query = query.eq('category', category);
      if (status === 'unread') query = query.eq('is_read', false);
      if (status === 'action') query = query.neq('action_type', 'info').eq('is_resolved', false);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as Notification[];
    },
    enabled: !!employee,
    refetchInterval: 30000,
  });
}

export function useInboxCounts() {
  const { employee } = useAuth();

  return useQuery({
    queryKey: ['inbox-counts', employee?.id],
    queryFn: async () => {
      if (!employee) return { total: 0, timesheet: 0, reimbursement: 0 };
      const [totalRes, timesheetRes, reimbursementRes] = await Promise.all([
        (supabase as any)
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', employee.id)
          .eq('is_read', false),
        (supabase as any)
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', employee.id)
          .eq('is_read', false)
          .eq('category', 'timesheet'),
        (supabase as any)
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', employee.id)
          .eq('is_read', false)
          .eq('category', 'reimbursement'),
      ]);
      return {
        total: totalRes.count || 0,
        timesheet: timesheetRes.count || 0,
        reimbursement: reimbursementRes.count || 0,
      };
    },
    enabled: !!employee,
    refetchInterval: 30000,
  });
}

export function useMarkAllInboxRead() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!employee) return;
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', employee.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });
}

export function useResolveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_resolved: true })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });
}
