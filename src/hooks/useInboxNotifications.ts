import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from './useNotifications';

export type InboxFolder = 'all' | 'unread' | 'timesheet' | 'reimbursement' | 'candidates' | 'archived';

function invalidateAll(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['inbox-notifications'] });
  queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
}

export function useInboxNotifications(folder: InboxFolder = 'all') {
  const { employee } = useAuth();

  return useQuery({
    queryKey: ['inbox-notifications', employee?.id, folder],
    queryFn: async () => {
      if (!employee) return [];
      let query = (supabase as any)
        .from('notifications')
        .select('*')
        .eq('recipient_id', employee.id);

      if (folder === 'archived') {
        query = query.eq('is_archived', true);
      } else {
        query = query.neq('is_archived', true);
        if (folder === 'unread') query = query.eq('is_read', false);
        if (folder === 'timesheet') query = query.eq('category', 'timesheet');
        if (folder === 'reimbursement') query = query.eq('category', 'reimbursement');
        if (folder === 'candidates') query = query.eq('category', 'candidatos');
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);
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
      if (!employee) return { all: 0, unread: 0, timesheet: 0, reimbursement: 0, candidates: 0, archived: 0 } as const;
      const [totalRes, timesheetRes, reimbursementRes, candidatesRes, archivedRes] = await Promise.all([
        (supabase as any)
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', employee.id)
          .eq('is_read', false)
          .eq('is_archived', false),
        (supabase as any)
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', employee.id)
          .eq('is_read', false)
          .eq('category', 'timesheet')
          .eq('is_archived', false),
        (supabase as any)
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', employee.id)
          .eq('is_read', false)
          .eq('category', 'reimbursement')
          .eq('is_archived', false),
        (supabase as any)
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', employee.id)
          .eq('is_read', false)
          .eq('category', 'candidatos')
          .eq('is_archived', false),
        (supabase as any)
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', employee.id)
          .eq('is_archived', true),
      ]);
      return {
        all: totalRes.count || 0,
        unread: totalRes.count || 0,
        timesheet: timesheetRes.count || 0,
        reimbursement: reimbursementRes.count || 0,
        candidates: candidatesRes.count || 0,
        archived: archivedRes.count || 0,
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
    onSuccess: () => invalidateAll(queryClient),
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
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useArchiveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_archived: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUnarchiveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_archived: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useArchiveMultipleNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_archived: true })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteMultipleNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useMarkMultipleNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useMarkMultipleNotificationsUnread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: false })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}
